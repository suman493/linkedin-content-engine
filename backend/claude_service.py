import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Load profile data
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data")

def load_profile_data():
    with open(os.path.join(DATA_PATH, "suman_linkedin_data.json"), "r") as f:
        return json.load(f)

def load_historical_posts():
    with open(os.path.join(DATA_PATH, "historical_posts.json"), "r") as f:
        return json.load(f)

PROFILE_DATA = load_profile_data()
HISTORICAL_POSTS = load_historical_posts()

PILLARS = {
    "A": "Offsites as Infrastructure - Not vibes. Not swag. Offsites as operating infrastructure.",
    "B": "What Actually Breaks - Uncomfortable truths others avoid.",
    "C": "Proof > Promises - Show receipts. Let results speak.",
    "D": "Founder POV - Building in public. Lessons from the arena.",
    "E": "Category Education - Explain what others assume. Teach the industry."
}

def categorize_idea(idea_text: str) -> dict:
    """Categorize an idea into one of the content pillars using Claude."""

    pillars_desc = "\n".join([f"Pillar {k}: {v}" for k, v in PILLARS.items()])

    prompt = f"""You are helping categorize content ideas for Suman Siva, CEO of Marco Experiences (a group travel platform for company offsites).

Here are the content pillars:
{pillars_desc}

Categorize this idea into the most appropriate pillar:
"{idea_text}"

Respond in JSON format:
{{
    "pillar": "A/B/C/D/E",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation"
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    # Extract JSON from response (handle markdown code blocks)
    text = response.content[0].text
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    result = json.loads(text.strip())
    result["pillar_name"] = PILLARS.get(result["pillar"], "Unknown")
    return result


def generate_post(ideas: list[str], pillar: str, format_type: str = "Text Only") -> dict:
    """Generate a LinkedIn post from ideas using Claude."""

    writing_style = PROFILE_DATA["writing_style"]
    pillar_data = PROFILE_DATA["content_pillars"].get(pillar, {})

    # Get top performing posts for reference
    top_posts = [p for p in HISTORICAL_POSTS["posts"] if p.get("top_performer")]

    ideas_text = "\n".join([f"- {idea}" for idea in ideas])

    prompt = f"""You are writing a LinkedIn post for Suman Siva, CEO of Marco Experiences.

ABOUT SUMAN:
- Co-founder & CEO at Marco Experiences (modern group travel platform for company offsites)
- Previously: SoftBank Vision Fund investor, Bain & Company consultant
- Vanderbilt University grad
- Company has helped 750+ companies connect 75,000+ employees

WRITING STYLE (MUST FOLLOW EXACTLY):
- Tone: {writing_style['tone']}
- Use → for bullet lists (NOT dashes)
- Short paragraphs (1-2 sentences max)
- Lots of line breaks between ideas
- Open with personal hook or observation
- End with punchy insight (NOT a call-to-action)
- Reference Bain/SoftBank/Marco background when relevant
- NO buzzwords, NO passive voice, NO emojis
- NO generic thought leadership

CONTENT PILLAR: {pillar} - {pillar_data.get('name', '')}
{pillar_data.get('description', '')}

Sample hooks for this pillar:
{chr(10).join(['- ' + h for h in pillar_data.get('sample_hooks', [])])}

IDEAS TO INCORPORATE:
{ideas_text}

FORMAT: {format_type}

TOP PERFORMING POSTS FOR REFERENCE:
{json.dumps(top_posts, indent=2)}

Generate a LinkedIn post that:
1. Opens with an engaging hook
2. Develops the idea with personal perspective
3. Uses → for any bullet points
4. Ends with insight, not CTA
5. Matches Suman's voice exactly

Also generate a tweet-length version (280 chars max).

{"If format is Text + Image, also suggest an image prompt for AI image generation or describe what personal photo would work best." if format_type == "Text + Image" else ""}

Respond in JSON format:
{{
    "content": "The full LinkedIn post",
    "tweet_version": "Tweet-length version",
    "image_prompt": "Image suggestion if applicable"
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    # Extract JSON from response (handle markdown code blocks)
    text = response.content[0].text
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    return json.loads(text.strip())


def get_similar_posts(pillar: str, limit: int = 3) -> list:
    """Get similar top-performing posts for reference."""
    pillar_posts = [p for p in HISTORICAL_POSTS["posts"] if p.get("pillar") == pillar]
    # Sort by reactions
    pillar_posts.sort(key=lambda x: x.get("reactions", 0), reverse=True)
    return pillar_posts[:limit]


def predict_engagement(content: str, format_type: str = "Text Only") -> dict:
    """Predict engagement and suggest improvements based on historical data."""

    # Analyze historical patterns
    top_posts = [p for p in HISTORICAL_POSTS["posts"] if p.get("top_performer") or p.get("reactions", 0) > 30]
    avg_stats = HISTORICAL_POSTS["summary_stats"]
    format_stats = HISTORICAL_POSTS["performance_by_format"].get(format_type, {})

    # Content analysis
    word_count = len(content.split())
    paragraph_count = len([p for p in content.split('\n\n') if p.strip()])
    has_bullets = '→' in content
    has_numbers = any(char.isdigit() for char in content)
    starts_with_i = content.strip().lower().startswith('i ')

    prompt = f"""Analyze this LinkedIn post for Suman Siva and predict its engagement.

SUMAN'S HISTORICAL DATA:
- Average impressions: {avg_stats['avg_impressions']}
- Average reactions: {avg_stats['avg_reactions']}
- Top performing posts: Personal stories with vulnerability (5692 impressions, 59 reactions)
- Format "{format_type}" averages: {format_stats.get('avg_impressions', 'N/A')} impressions, {format_stats.get('avg_reactions', 'N/A')} reactions

TOP PERFORMING PATTERNS FROM SUMAN'S DATA:
- Personal founder stories perform 2x better than industry takes
- Posts starting with "I" perform well (personal hook)
- Short paragraphs (1-2 sentences) increase read-through
- Vulnerable moments get highest engagement
- Specific numbers/metrics boost credibility
- Text + Image posts average 2092 impressions vs 823 for Text Only

AI-SOUNDING PATTERNS TO AVOID:
- Generic statements without personal examples
- Overuse of "leverage", "optimize", "unlock", "game-changer"
- Perfect parallel structure (sounds robotic)
- Lists without personal commentary
- Starting with "In today's..." or "As a..."
- Ending with generic CTAs

POST TO ANALYZE:
{content}

FORMAT: {format_type}
Word count: {word_count}
Paragraphs: {paragraph_count}
Has bullets: {has_bullets}
Has numbers: {has_numbers}
Personal opening (starts with I): {starts_with_i}

Provide analysis in JSON format:
{{
    "predicted_impressions": number (estimate based on patterns),
    "predicted_reactions": number,
    "predicted_engagement_rate": number (0-5 scale),
    "confidence": number (0-1),
    "score": number (1-100),
    "strengths": ["list of what works well"],
    "weaknesses": ["list of what could hurt engagement"],
    "ai_flags": ["specific phrases that sound AI-generated"],
    "improvements": [
        {{"issue": "specific issue", "suggestion": "specific fix", "priority": "high/medium/low"}}
    ],
    "rewrite_hooks": ["3 alternative opening hooks that could perform better"]
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    return json.loads(text.strip())


def extract_content_from_source(source_text: str, source_type: str = "transcript") -> dict:
    """Extract key insights from podcasts, articles, or transcripts for LinkedIn posts."""

    prompt = f"""You are helping Suman Siva (CEO of Marco Experiences) extract LinkedIn post ideas from content.

SOURCE TYPE: {source_type}
SOURCE CONTENT:
{source_text[:15000]}  # Limit to avoid token overflow

Extract the most compelling insights that would resonate with Suman's audience (startup founders, tech leaders, people team leaders).

Focus on:
- Counterintuitive insights
- Personal stories or anecdotes
- Data points or specific numbers
- Lessons learned from failure
- Tactical advice that's actionable

Respond in JSON format:
{{
    "key_insights": [
        {{
            "insight": "The core insight in one sentence",
            "context": "Brief context or quote from source",
            "post_angle": "How Suman could connect this to his experience",
            "suggested_pillar": "A/B/C/D/E",
            "hook_ideas": ["2-3 potential opening hooks"]
        }}
    ],
    "quotable_moments": ["Direct quotes worth sharing"],
    "main_theme": "Overall theme of the content",
    "relevance_score": number (1-10, how relevant to Suman's audience)
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    return json.loads(text.strip())


def regenerate_with_feedback(current_content: str, feedback: str, pillar: str, format_type: str = "Text Only") -> dict:
    """Regenerate a post based on coaching feedback."""

    writing_style = PROFILE_DATA["writing_style"]
    pillar_data = PROFILE_DATA["content_pillars"].get(pillar, {})

    # Get historical data for context
    avg_stats = HISTORICAL_POSTS["summary_stats"]
    top_posts = [p for p in HISTORICAL_POSTS["posts"] if p.get("top_performer") or p.get("reactions", 0) > 30]
    pillar_posts = [p for p in HISTORICAL_POSTS["posts"] if p.get("pillar") == pillar][:5]
    format_stats = HISTORICAL_POSTS["performance_by_format"].get(format_type, {})
    pillar_stats = HISTORICAL_POSTS["performance_by_pillar"].get(pillar, {})

    prompt = f"""You are revising a LinkedIn post for Suman Siva, CEO of Marco Experiences, based on his feedback.

ABOUT SUMAN:
- Co-founder & CEO at Marco Experiences (modern group travel platform for company offsites)
- Previously: SoftBank Vision Fund investor, Bain & Company consultant
- Vanderbilt University grad
- Company has helped 750+ companies connect 75,000+ employees

=== SUMAN'S HISTORICAL LINKEDIN PERFORMANCE DATA ===
Total posts analyzed: {avg_stats['total_posts']}
Average impressions per post: {avg_stats['avg_impressions']}
Average reactions per post: {avg_stats['avg_reactions']}
Average engagement rate: {avg_stats['avg_engagement_rate']}%

Format "{format_type}" performance:
- Average impressions: {format_stats.get('avg_impressions', 'N/A')}
- Average reactions: {format_stats.get('avg_reactions', 'N/A')}

Pillar {pillar} performance:
- Average impressions: {pillar_stats.get('avg_impressions', 'N/A')}
- Average reactions: {pillar_stats.get('avg_reactions', 'N/A')}
- Number of posts: {pillar_stats.get('posts', 'N/A')}

TOP PERFORMING POSTS (learn from these):
{json.dumps(top_posts, indent=2)}

SIMILAR POSTS IN THIS PILLAR:
{json.dumps(pillar_posts, indent=2)}

KEY PATTERNS FROM SUMAN'S BEST POSTS:
- Personal founder stories perform 2x better than industry takes
- Posts starting with "I" perform well (personal hook)
- Vulnerable moments get highest engagement (59 reactions on "Morning routine" post)
- Short paragraphs (1-2 sentences) increase read-through
- Specific numbers/metrics boost credibility
- Text + Image posts average 2092 impressions vs 823 for Text Only

WRITING STYLE (MUST FOLLOW EXACTLY):
- Tone: {writing_style['tone']}
- Use → for bullet lists (NOT dashes)
- Short paragraphs (1-2 sentences max)
- Lots of line breaks between ideas
- Open with personal hook or observation
- End with punchy insight (NOT a call-to-action)
- Reference Bain/SoftBank/Marco background when relevant
- NO buzzwords, NO passive voice, NO emojis
- NO generic thought leadership

CONTENT PILLAR: {pillar} - {pillar_data.get('name', '')}

CURRENT POST:
{current_content}

COACHING FEEDBACK FROM SUMAN:
{feedback}

FORMAT: {format_type}

Revise the post based on the feedback while maintaining Suman's voice and style.
Use the historical data above to inform your decisions - if Suman references "my data" or "my analytics", use the stats provided.
Also generate a tweet-length version (280 chars max).

{"If format is Text + Image, also suggest an image prompt for AI image generation or describe what personal photo would work best." if format_type == "Text + Image" else ""}

Respond in JSON format:
{{
    "content": "The revised LinkedIn post",
    "tweet_version": "Tweet-length version",
    "image_prompt": "Image suggestion if applicable"
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    # Extract JSON from response (handle markdown code blocks)
    text = response.content[0].text
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    return json.loads(text.strip())
