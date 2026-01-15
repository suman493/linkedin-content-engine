from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import json
import os

from database import engine, get_db, Base
from models import Idea, Post
from schemas import (
    IdeaCreate, IdeaUpdate, IdeaResponse,
    PostCreate, PostUpdate, PostResponse,
    GeneratePostRequest, CategorizeResponse
)
from claude_service import categorize_idea, generate_post, get_similar_posts, regenerate_with_feedback, predict_engagement, extract_content_from_source, PILLARS, PROFILE_DATA, HISTORICAL_POSTS

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="LinkedIn Content Engine", version="1.0.0")

# CORS middleware - allow Vercel frontend and localhost for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://linkedin-content-engine-gamma.vercel.app",
        "https://linkedin-content-engine.vercel.app",
        # Allow all Vercel preview deployments
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== IDEAS ENDPOINTS ==============

@app.post("/api/ideas", response_model=IdeaResponse)
async def create_idea(idea: IdeaCreate, db: Session = Depends(get_db)):
    """Create a new idea and auto-categorize it."""
    # Categorize the idea using Claude
    try:
        categorization = categorize_idea(idea.raw_input)
        pillar = categorization["pillar"]
        confidence = categorization["confidence"]
    except Exception as e:
        print(f"Categorization error: {e}")
        pillar = None
        confidence = None

    db_idea = Idea(
        raw_input=idea.raw_input,
        source=idea.source,
        pillar=pillar,
        pillar_confidence=confidence,
        tags=[],
        status="captured"
    )
    db.add(db_idea)
    db.commit()
    db.refresh(db_idea)
    return db_idea


@app.get("/api/ideas", response_model=List[IdeaResponse])
async def get_ideas(
    pillar: str = None,
    status: str = None,
    db: Session = Depends(get_db)
):
    """Get all ideas with optional filtering."""
    query = db.query(Idea)
    if pillar:
        query = query.filter(Idea.pillar == pillar)
    if status:
        query = query.filter(Idea.status == status)
    return query.order_by(Idea.created_at.desc()).all()


@app.get("/api/ideas/{idea_id}", response_model=IdeaResponse)
async def get_idea(idea_id: int, db: Session = Depends(get_db)):
    """Get a specific idea."""
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


@app.patch("/api/ideas/{idea_id}", response_model=IdeaResponse)
async def update_idea(idea_id: int, idea_update: IdeaUpdate, db: Session = Depends(get_db)):
    """Update an idea."""
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    update_data = idea_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(idea, key, value)

    db.commit()
    db.refresh(idea)
    return idea


@app.delete("/api/ideas/{idea_id}")
async def delete_idea(idea_id: int, db: Session = Depends(get_db)):
    """Delete an idea."""
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    db.delete(idea)
    db.commit()
    return {"message": "Idea deleted"}


# ============== POSTS ENDPOINTS ==============

@app.post("/api/posts/generate", response_model=PostResponse)
async def generate_new_post(request: GeneratePostRequest, db: Session = Depends(get_db)):
    """Generate a new post from selected ideas."""
    # Get the ideas
    ideas = db.query(Idea).filter(Idea.id.in_(request.idea_ids)).all()
    if not ideas:
        raise HTTPException(status_code=404, detail="Ideas not found")

    # Determine pillar (use provided or most common from ideas)
    pillar = request.pillar
    if not pillar:
        pillar_counts = {}
        for idea in ideas:
            if idea.pillar:
                pillar_counts[idea.pillar] = pillar_counts.get(idea.pillar, 0) + 1
        pillar = max(pillar_counts, key=pillar_counts.get) if pillar_counts else "D"

    # Generate the post
    try:
        idea_texts = [idea.raw_input for idea in ideas]
        generated = generate_post(idea_texts, pillar, request.format)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    # Create the post
    db_post = Post(
        content=generated.get("content", ""),
        format=request.format,
        image_prompt=generated.get("image_prompt"),
        tweet_version=generated.get("tweet_version"),
        status="draft"
    )

    # Link ideas to post
    for idea in ideas:
        db_post.ideas.append(idea)
        idea.status = "drafted"

    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


@app.get("/api/posts", response_model=List[PostResponse])
async def get_posts(status: str = None, db: Session = Depends(get_db)):
    """Get all posts with optional status filtering."""
    query = db.query(Post)
    if status:
        query = query.filter(Post.status == status)
    return query.order_by(Post.created_at.desc()).all()


@app.get("/api/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: int, db: Session = Depends(get_db)):
    """Get a specific post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@app.patch("/api/posts/{post_id}", response_model=PostResponse)
async def update_post(post_id: int, post_update: PostUpdate, db: Session = Depends(get_db)):
    """Update a post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    old_status = post.status
    update_data = post_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)

    # Update linked ideas status if post status changes
    if "status" in update_data:
        for idea in post.ideas:
            idea.status = update_data["status"]

        # If post is being marked as published, add to historical tracking
        if update_data["status"] == "published" and old_status != "published":
            add_post_to_historical(post)

    db.commit()
    db.refresh(post)
    return post


def add_post_to_historical(post):
    """Add a published post to the historical tracking data."""
    import datetime

    # Get pillar from linked ideas
    pillar = "D"
    if post.ideas and len(post.ideas) > 0 and post.ideas[0].pillar:
        pillar = post.ideas[0].pillar

    # Get the topic from first idea or first 50 chars of content
    topic = post.content[:50] + "..." if len(post.content) > 50 else post.content
    if post.ideas and len(post.ideas) > 0:
        topic = post.ideas[0].raw_input[:50] + "..." if len(post.ideas[0].raw_input) > 50 else post.ideas[0].raw_input

    # Create new post entry (will be updated with real metrics later)
    new_entry = {
        "id": len(HISTORICAL_POSTS["posts"]) + 1,
        "date": datetime.datetime.now().strftime("%b %Y"),
        "type": "Generated Post",
        "format": post.format,
        "topic": topic,
        "pillar": pillar,
        "reactions": 0,  # To be updated later with real data
        "comments": 0,
        "impressions": 0,
        "engagement_rate": 0,
        "url": None,
        "generated_by": "LinkedIn Content Engine",
        "published_at": datetime.datetime.now().isoformat()
    }

    # Add to in-memory data
    HISTORICAL_POSTS["posts"].insert(0, new_entry)

    # Update summary stats
    HISTORICAL_POSTS["summary_stats"]["total_posts"] = len(HISTORICAL_POSTS["posts"])

    # Also write to the JSON file to persist
    try:
        data_path = os.path.join(os.path.dirname(__file__), "..", "data", "historical_posts.json")
        with open(data_path, "w") as f:
            json.dump(HISTORICAL_POSTS, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save to historical_posts.json: {e}")


@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: int, db: Session = Depends(get_db)):
    """Delete a post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}


@app.post("/api/posts/{post_id}/regenerate", response_model=PostResponse)
async def regenerate_post(post_id: int, feedback: dict, db: Session = Depends(get_db)):
    """Regenerate a post with coaching feedback."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Get pillar from linked ideas
    pillar = "D"
    if post.ideas and len(post.ideas) > 0 and post.ideas[0].pillar:
        pillar = post.ideas[0].pillar

    try:
        regenerated = regenerate_with_feedback(
            current_content=post.content,
            feedback=feedback.get("feedback", ""),
            pillar=pillar,
            format_type=post.format
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(e)}")

    # Update the post
    post.content = regenerated.get("content", post.content)
    post.tweet_version = regenerated.get("tweet_version", post.tweet_version)
    post.image_prompt = regenerated.get("image_prompt", post.image_prompt)

    db.commit()
    db.refresh(post)
    return post


# ============== ENGAGEMENT & CONTENT ENDPOINTS ==============

@app.post("/api/posts/{post_id}/predict")
async def predict_post_engagement(post_id: int, db: Session = Depends(get_db)):
    """Predict engagement and get improvement suggestions."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    try:
        prediction = predict_engagement(post.content, post.format)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/api/posts/predict-content")
async def predict_content_engagement(data: dict):
    """Predict engagement for arbitrary content (before saving as post)."""
    content = data.get("content", "")
    format_type = data.get("format", "Text Only")

    if not content:
        raise HTTPException(status_code=400, detail="Content is required")

    try:
        prediction = predict_engagement(content, format_type)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/api/content/extract")
async def extract_content(data: dict):
    """Extract insights from podcasts, articles, or transcripts."""
    source_text = data.get("text", "")
    source_type = data.get("type", "transcript")  # transcript, article, podcast

    if not source_text:
        raise HTTPException(status_code=400, detail="Text content is required")

    try:
        extracted = extract_content_from_source(source_text, source_type)
        return extracted
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.post("/api/content/extract-url")
async def extract_from_url(data: dict):
    """Extract content from a URL (article or YouTube)."""
    import urllib.request
    import re

    url = data.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        # Basic URL fetch
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')

        # Simple HTML to text extraction
        text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()

        # Determine source type
        source_type = "article"
        if "youtube.com" in url or "youtu.be" in url:
            source_type = "video"

        extracted = extract_content_from_source(text[:15000], source_type)
        return extracted
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URL extraction failed: {str(e)}")


# ============== UTILITY ENDPOINTS ==============

@app.get("/api/pillars")
async def get_pillars():
    """Get all content pillars."""
    return PROFILE_DATA["content_pillars"]


@app.get("/api/pillars/{pillar}/similar-posts")
async def get_pillar_similar_posts(pillar: str, limit: int = 3):
    """Get similar top-performing posts for a pillar."""
    return get_similar_posts(pillar, limit)


@app.get("/api/profile")
async def get_profile():
    """Get profile data."""
    return PROFILE_DATA["profile"]


@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get dashboard stats."""
    ideas_count = db.query(Idea).count()
    posts_count = db.query(Post).count()
    draft_count = db.query(Post).filter(Post.status == "draft").count()
    scheduled_count = db.query(Post).filter(Post.status == "scheduled").count()

    return {
        "ideas_count": ideas_count,
        "posts_count": posts_count,
        "drafts_count": draft_count,
        "scheduled_count": scheduled_count,
        "historical_stats": HISTORICAL_POSTS["summary_stats"]
    }


@app.post("/api/posts/{post_id}/copy")
async def copy_post_to_clipboard(post_id: int, db: Session = Depends(get_db)):
    """Get post content for clipboard (frontend handles actual copy)."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"content": post.content}


@app.get("/api/schedule/recommendations")
async def get_schedule_recommendations():
    """Get posting schedule recommendations."""
    return PROFILE_DATA["posting_rhythm"]


@app.get("/api/analytics/historical")
async def get_historical_data():
    """Get historical posts data for analytics."""
    return HISTORICAL_POSTS


@app.patch("/api/analytics/historical/{post_id}")
async def update_historical_post_metrics(post_id: int, data: dict):
    """Update metrics for a historical post (after getting real LinkedIn data)."""
    # Find the post in historical data
    post_found = None
    for post in HISTORICAL_POSTS["posts"]:
        if post["id"] == post_id:
            post_found = post
            break

    if not post_found:
        raise HTTPException(status_code=404, detail="Historical post not found")

    # Update metrics
    if "impressions" in data:
        old_impressions = post_found.get("impressions", 0)
        post_found["impressions"] = data["impressions"]
        # Update summary stats
        HISTORICAL_POSTS["summary_stats"]["total_impressions"] = \
            HISTORICAL_POSTS["summary_stats"].get("total_impressions", 0) - old_impressions + data["impressions"]

    if "reactions" in data:
        old_reactions = post_found.get("reactions", 0)
        post_found["reactions"] = data["reactions"]
        HISTORICAL_POSTS["summary_stats"]["total_reactions"] = \
            HISTORICAL_POSTS["summary_stats"].get("total_reactions", 0) - old_reactions + data["reactions"]

    if "comments" in data:
        old_comments = post_found.get("comments", 0)
        post_found["comments"] = data["comments"]
        HISTORICAL_POSTS["summary_stats"]["total_comments"] = \
            HISTORICAL_POSTS["summary_stats"].get("total_comments", 0) - old_comments + data["comments"]

    if "url" in data:
        post_found["url"] = data["url"]

    # Calculate engagement rate
    if post_found["impressions"] > 0:
        post_found["engagement_rate"] = round(
            ((post_found["reactions"] + post_found["comments"]) / post_found["impressions"]) * 100, 2
        )

    # Recalculate averages
    total_posts = len(HISTORICAL_POSTS["posts"])
    if total_posts > 0:
        HISTORICAL_POSTS["summary_stats"]["avg_impressions"] = round(
            HISTORICAL_POSTS["summary_stats"]["total_impressions"] / total_posts
        )
        HISTORICAL_POSTS["summary_stats"]["avg_reactions"] = round(
            HISTORICAL_POSTS["summary_stats"]["total_reactions"] / total_posts
        )
        HISTORICAL_POSTS["summary_stats"]["avg_comments"] = round(
            HISTORICAL_POSTS["summary_stats"]["total_comments"] / total_posts, 1
        )
        total_engagement = sum(p.get("engagement_rate", 0) for p in HISTORICAL_POSTS["posts"])
        HISTORICAL_POSTS["summary_stats"]["avg_engagement_rate"] = round(total_engagement / total_posts, 2)

    # Save to file
    try:
        data_path = os.path.join(os.path.dirname(__file__), "..", "data", "historical_posts.json")
        with open(data_path, "w") as f:
            json.dump(HISTORICAL_POSTS, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save to historical_posts.json: {e}")

    return {"success": True, "post": post_found}


@app.post("/api/analytics/import-csv")
async def import_csv_analytics(data: dict):
    """Import LinkedIn analytics from CSV data.

    Expected format (matches LinkedIn's export):
    [
        {
            "date": "2025-01-15",
            "post_url": "https://linkedin.com/posts/...",
            "content": "First 100 chars of post...",
            "impressions": 1500,
            "reactions": 25,
            "comments": 5,
            "reposts": 2
        }
    ]
    """
    import datetime

    posts_data = data.get("posts", [])
    if not posts_data:
        raise HTTPException(status_code=400, detail="No posts data provided")

    imported_count = 0
    skipped_count = 0

    for post_data in posts_data:
        # Check if post already exists (by URL or content match)
        url = post_data.get("post_url") or post_data.get("url")
        content = post_data.get("content") or post_data.get("topic", "")

        # Skip if we already have this post
        existing = None
        for p in HISTORICAL_POSTS["posts"]:
            if url and p.get("url") == url:
                existing = p
                break
            if content and p.get("topic", "")[:50] == content[:50]:
                existing = p
                break

        if existing:
            # Update existing post metrics
            existing["impressions"] = post_data.get("impressions", existing.get("impressions", 0))
            existing["reactions"] = post_data.get("reactions", existing.get("reactions", 0))
            existing["comments"] = post_data.get("comments", existing.get("comments", 0))
            if url:
                existing["url"] = url
            skipped_count += 1
            continue

        # Parse date
        date_str = post_data.get("date", "")
        try:
            if "-" in date_str:
                dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
                date_formatted = dt.strftime("%b %Y")
            else:
                date_formatted = date_str or datetime.datetime.now().strftime("%b %Y")
        except:
            date_formatted = datetime.datetime.now().strftime("%b %Y")

        # Guess pillar from content
        pillar = post_data.get("pillar", "D")
        if not pillar or pillar == "":
            content_lower = content.lower()
            if "offsite" in content_lower or "retreat" in content_lower:
                pillar = "A"
            elif "break" in content_lower or "fail" in content_lower or "mistake" in content_lower:
                pillar = "B"
            elif "result" in content_lower or "metric" in content_lower or "proof" in content_lower:
                pillar = "C"
            elif "founder" in content_lower or "ceo" in content_lower or "i " in content_lower:
                pillar = "D"
            else:
                pillar = "E"

        impressions = post_data.get("impressions", 0)
        reactions = post_data.get("reactions", 0)
        comments = post_data.get("comments", 0)

        # Calculate engagement rate
        engagement_rate = 0
        if impressions > 0:
            engagement_rate = round(((reactions + comments) / impressions) * 100, 2)

        new_entry = {
            "id": len(HISTORICAL_POSTS["posts"]) + 1 + imported_count,
            "date": date_formatted,
            "type": post_data.get("type", "Imported Post"),
            "format": post_data.get("format", "Text Only"),
            "topic": content[:100] if content else "Imported post",
            "pillar": pillar,
            "reactions": reactions,
            "comments": comments,
            "impressions": impressions,
            "engagement_rate": engagement_rate,
            "url": url,
            "imported_at": datetime.datetime.now().isoformat()
        }

        # Mark as top performer if high engagement
        if impressions > 3000 or reactions > 30:
            new_entry["top_performer"] = True

        HISTORICAL_POSTS["posts"].append(new_entry)
        imported_count += 1

    # Recalculate summary stats
    all_posts = HISTORICAL_POSTS["posts"]
    total_impressions = sum(p.get("impressions", 0) for p in all_posts)
    total_reactions = sum(p.get("reactions", 0) for p in all_posts)
    total_comments = sum(p.get("comments", 0) for p in all_posts)

    HISTORICAL_POSTS["summary_stats"]["total_posts"] = len(all_posts)
    HISTORICAL_POSTS["summary_stats"]["total_impressions"] = total_impressions
    HISTORICAL_POSTS["summary_stats"]["total_reactions"] = total_reactions
    HISTORICAL_POSTS["summary_stats"]["total_comments"] = total_comments

    if len(all_posts) > 0:
        HISTORICAL_POSTS["summary_stats"]["avg_impressions"] = round(total_impressions / len(all_posts))
        HISTORICAL_POSTS["summary_stats"]["avg_reactions"] = round(total_reactions / len(all_posts))
        HISTORICAL_POSTS["summary_stats"]["avg_comments"] = round(total_comments / len(all_posts), 1)
        total_engagement = sum(p.get("engagement_rate", 0) for p in all_posts)
        HISTORICAL_POSTS["summary_stats"]["avg_engagement_rate"] = round(total_engagement / len(all_posts), 2)

    # Save to file
    try:
        data_path = os.path.join(os.path.dirname(__file__), "..", "data", "historical_posts.json")
        with open(data_path, "w") as f:
            json.dump(HISTORICAL_POSTS, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save to historical_posts.json: {e}")

    return {
        "success": True,
        "imported": imported_count,
        "updated": skipped_count,
        "total_posts": len(HISTORICAL_POSTS["posts"])
    }


@app.get("/api/analytics/csv-template")
async def get_csv_template():
    """Get CSV template and instructions for importing LinkedIn analytics."""
    return {
        "csv_format": {
            "headers": ["date", "post_url", "content", "impressions", "reactions", "comments", "reposts", "pillar", "format"],
            "example_row": ["2025-01-15", "https://linkedin.com/posts/username_...", "My post about offsites...", "1500", "25", "5", "2", "A", "Text + Image"],
            "required_fields": ["content", "impressions"],
            "optional_fields": ["date", "post_url", "reactions", "comments", "reposts", "pillar", "format"]
        },
        "pillar_codes": {
            "A": "Offsites as Infrastructure",
            "B": "What Actually Breaks",
            "C": "Proof > Promises",
            "D": "Founder POV",
            "E": "Category Education",
            "External": "External/Reposts",
            "Personal": "Personal"
        },
        "format_options": ["Text Only", "Text + Image", "Text + Video", "Text + Carousel", "Repost"],
        "instructions": [
            "1. Export your LinkedIn analytics from linkedin.com/analytics",
            "2. Or manually create a CSV with the columns above",
            "3. Upload the CSV file using the Import button in Analytics",
            "4. The system will auto-detect pillars if not specified",
            "5. Duplicate posts (same URL or content) will update existing entries"
        ],
        "claude_automation": {
            "description": "Use Claude Code to automatically scrape your LinkedIn analytics",
            "steps": [
                "1. Open Claude Code on your machine",
                "2. Navigate to linkedin.com/analytics/post-analytics in Chrome",
                "3. Ask Claude: 'Scrape my LinkedIn post analytics from this page and save to CSV'",
                "4. Claude will extract: post content, impressions, reactions, comments",
                "5. Import the generated CSV into this app"
            ],
            "example_prompt": "Go to my LinkedIn analytics page at linkedin.com/analytics/post-analytics, scrape all my post data including impressions, reactions, and comments, then save it as a CSV file in the format: date, post_url, content, impressions, reactions, comments"
        }
    }


# ============== MOBILE/SLACK INTEGRATION ==============

@app.post("/api/quick-capture")
async def quick_capture_idea(data: dict, db: Session = Depends(get_db)):
    """Quick capture endpoint for mobile/SMS/bookmarklet use.

    This endpoint is designed for mobile quick capture - no authentication required.
    Can be called via iOS Shortcuts, bookmarklet, or Slack webhook.
    """
    text = data.get("text", "").strip()
    source = data.get("source", "mobile")

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    # Categorize the idea
    try:
        categorization = categorize_idea(text)
        pillar = categorization["pillar"]
        confidence = categorization["confidence"]
    except Exception as e:
        print(f"Categorization error: {e}")
        pillar = None
        confidence = None

    # Create the idea
    db_idea = Idea(
        raw_input=text,
        source=source,
        pillar=pillar,
        pillar_confidence=confidence,
        tags=[],
        status="captured"
    )
    db.add(db_idea)
    db.commit()
    db.refresh(db_idea)

    pillar_names = {
        "A": "Offsites as Infrastructure",
        "B": "What Actually Breaks",
        "C": "Proof > Promises",
        "D": "Founder POV",
        "E": "Category Education"
    }
    pillar_name = pillar_names.get(pillar, "Uncategorized")

    return {
        "success": True,
        "message": f"Idea captured! Pillar {pillar}: {pillar_name}",
        "idea_id": db_idea.id,
        "pillar": pillar,
        "pillar_name": pillar_name,
        "confidence": confidence
    }


@app.post("/api/webhooks/slack")
async def slack_webhook(data: dict, db: Session = Depends(get_db)):
    """Slack webhook receiver for capturing ideas via Slack messages.

    Set this up as a Slack Slash Command or Incoming Webhook.
    Usage in Slack: /idea Your idea text here
    """
    # Handle Slack URL verification challenge
    if data.get("type") == "url_verification":
        return {"challenge": data.get("challenge")}

    # Get text from various Slack formats
    text = ""
    source = "slack"

    # Slash command format
    if "text" in data and "command" in data:
        text = data.get("text", "").strip()
        source = f"slack:{data.get('user_name', 'unknown')}"
    # Event format (app mention or message)
    elif "event" in data:
        event = data["event"]
        text = event.get("text", "").strip()
        # Remove bot mention if present
        if text.startswith("<@"):
            text = text.split(">", 1)[-1].strip()
        source = f"slack:{event.get('user', 'unknown')}"
    # Simple format
    elif "text" in data:
        text = data.get("text", "").strip()

    if not text:
        return {
            "response_type": "ephemeral",
            "text": "Please provide some text for your idea. Usage: /idea Your idea here"
        }

    # Categorize and save the idea
    try:
        categorization = categorize_idea(text)
        pillar = categorization["pillar"]
        confidence = categorization["confidence"]
    except Exception as e:
        print(f"Categorization error: {e}")
        pillar = None
        confidence = None

    db_idea = Idea(
        raw_input=text,
        source=source,
        pillar=pillar,
        pillar_confidence=confidence,
        tags=[],
        status="captured"
    )
    db.add(db_idea)
    db.commit()
    db.refresh(db_idea)

    pillar_names = {
        "A": "Offsites as Infrastructure",
        "B": "What Actually Breaks",
        "C": "Proof > Promises",
        "D": "Founder POV",
        "E": "Category Education"
    }
    pillar_name = pillar_names.get(pillar, "Uncategorized")

    # Return Slack-formatted response
    return {
        "response_type": "in_channel",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":white_check_mark: *Idea captured!*\n\n>{text}\n\n*Pillar {pillar}:* {pillar_name} ({int((confidence or 0) * 100)}% confidence)"
                }
            }
        ]
    }


@app.get("/api/mobile-setup")
async def get_mobile_setup_info():
    """Get setup instructions for mobile integrations."""
    base_url = "http://localhost:8000"  # Would be your actual domain in production

    return {
        "ios_shortcut": {
            "name": "Quick Idea Capture",
            "description": "Add this shortcut to capture ideas from anywhere on iOS",
            "endpoint": f"{base_url}/api/quick-capture",
            "method": "POST",
            "body": {"text": "{{Input}}", "source": "ios-shortcut"},
            "instructions": [
                "1. Open Shortcuts app on iOS",
                "2. Create new shortcut",
                "3. Add 'Ask for Input' action",
                "4. Add 'Get Contents of URL' action",
                f"5. Set URL to: {base_url}/api/quick-capture",
                "6. Method: POST",
                "7. Request Body: JSON with 'text' field from input",
                "8. Add 'Show Result' action",
                "9. Add shortcut to Home Screen or Share Sheet"
            ]
        },
        "slack_setup": {
            "webhook_url": f"{base_url}/api/webhooks/slack",
            "instructions": [
                "1. Go to api.slack.com/apps and create a new app",
                "2. Add 'Slash Commands' feature",
                f"3. Create command /idea with Request URL: {base_url}/api/webhooks/slack",
                "4. Install app to your workspace",
                "5. Use: /idea Your brilliant content idea"
            ]
        },
        "bookmarklet": {
            "name": "Save to Ideas",
            "description": "Drag this to your bookmarks bar to capture selected text",
            "code": "javascript:(function(){var t=window.getSelection().toString();if(!t)t=prompt('Enter idea:');if(t)fetch('" + base_url + "/api/quick-capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t,source:'bookmarklet'})}).then(r=>r.json()).then(d=>alert(d.message)).catch(e=>alert('Error: '+e));})();"
        },
        "sms_twilio": {
            "webhook_url": f"{base_url}/api/webhooks/sms",
            "instructions": [
                "1. Create Twilio account at twilio.com",
                "2. Get a phone number",
                f"3. Set webhook URL to: {base_url}/api/webhooks/sms",
                "4. Text your ideas to that number!"
            ]
        }
    }


@app.post("/api/webhooks/sms")
async def sms_webhook(data: dict, db: Session = Depends(get_db)):
    """SMS webhook receiver for Twilio.

    Set up your Twilio number to POST to this endpoint.
    """
    text = data.get("Body", "").strip()
    from_number = data.get("From", "unknown")

    if not text:
        return {"message": "No text received"}

    # Categorize and save
    try:
        categorization = categorize_idea(text)
        pillar = categorization["pillar"]
        confidence = categorization["confidence"]
    except Exception as e:
        pillar = None
        confidence = None

    db_idea = Idea(
        raw_input=text,
        source=f"sms:{from_number}",
        pillar=pillar,
        pillar_confidence=confidence,
        tags=[],
        status="captured"
    )
    db.add(db_idea)
    db.commit()

    pillar_names = {
        "A": "Offsites",
        "B": "What Breaks",
        "C": "Proof",
        "D": "Founder",
        "E": "Category Ed"
    }

    # Return TwiML response for SMS reply
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Idea saved! Pillar {pillar or '?'}: {pillar_names.get(pillar, 'TBD')}</Message>
</Response>"""


@app.get("/api/debug/paths")
async def debug_paths():
    """Debug endpoint to check file paths and data loading."""
    from claude_service import DATA_PATH, HISTORICAL_POSTS, PROFILE_DATA
    from pathlib import Path

    result = {
        "data_path": DATA_PATH,
        "data_path_exists": Path(DATA_PATH).exists() if DATA_PATH else False,
        "cwd": str(Path.cwd()),
        "file_dir": str(Path(__file__).parent),
        "historical_posts_count": len(HISTORICAL_POSTS.get("posts", [])),
        "summary_stats": HISTORICAL_POSTS.get("summary_stats", {}),
        "profile_loaded": bool(PROFILE_DATA.get("content_pillars")),
    }

    # Check what files exist in data directory
    if DATA_PATH and Path(DATA_PATH).exists():
        result["files_in_data_dir"] = [f.name for f in Path(DATA_PATH).iterdir()]
    else:
        result["files_in_data_dir"] = []

    # Check potential paths
    potential_paths = [
        Path(__file__).parent.parent / "data",
        Path(__file__).parent / "data",
        Path("/app/data"),
        Path.cwd() / "data",
    ]
    result["path_checks"] = {}
    for p in potential_paths:
        result["path_checks"][str(p)] = {
            "exists": p.exists(),
            "has_historical": (p / "historical_posts.json").exists() if p.exists() else False
        }

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
