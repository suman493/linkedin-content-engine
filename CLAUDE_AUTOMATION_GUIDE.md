# LinkedIn Analytics Automation with Claude Code

This guide explains how to use Claude Code to automatically scrape your LinkedIn post analytics and import them into the LinkedIn Content Engine.

## Prerequisites

1. **Claude Code installed** - Install from [claude.ai/download](https://claude.ai/download)
2. **Chrome browser** - Claude Code works with Chrome for browser automation
3. **LinkedIn account** - You must be logged into LinkedIn

## Step-by-Step Instructions

### Step 1: Open LinkedIn Analytics

1. Open Chrome and navigate to: `https://www.linkedin.com/analytics/post-analytics/`
2. Make sure you're logged into your LinkedIn account
3. You should see your post analytics dashboard

### Step 2: Run Claude Code

Open your terminal and start Claude Code:

```bash
claude
```

### Step 3: Use This Prompt

Copy and paste this prompt to Claude:

```
I need you to scrape my LinkedIn post analytics. Please:

1. Navigate to linkedin.com/analytics/post-analytics in my Chrome browser
2. For each post visible, extract:
   - Post date
   - Post content (first 100 characters)
   - Post URL
   - Impressions count
   - Reactions count
   - Comments count
3. Scroll down to load more posts and continue extracting
4. Save all the data to a CSV file at ~/Desktop/linkedin_analytics.csv with these columns:
   date,post_url,content,impressions,reactions,comments

Make sure to get at least the last 3 months of posts.
```

### Step 4: Import the CSV

1. Open the LinkedIn Content Engine app
2. Go to the **Analytics** tab
3. Click the green **Import CSV** button
4. Upload the `linkedin_analytics.csv` file from your Desktop
5. The system will automatically:
   - Parse your post data
   - Auto-detect content pillars
   - Calculate engagement rates
   - Update your analytics dashboard

## CSV Format Reference

If you need to manually create or edit the CSV, use this format:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| date | No | Post date (YYYY-MM-DD) | 2025-01-15 |
| post_url | No | LinkedIn post URL | https://linkedin.com/posts/... |
| content | Yes | Post text (first 100 chars) | My thoughts on offsites... |
| impressions | Yes | View count | 2500 |
| reactions | No | Like/reaction count | 35 |
| comments | No | Comment count | 8 |
| pillar | No | Content pillar code (A-E) | D |
| format | No | Post format | Text + Image |

### Pillar Codes

- **A**: Offsites as Infrastructure
- **B**: What Actually Breaks
- **C**: Proof > Promises
- **D**: Founder POV
- **E**: Category Education
- **External**: External/Reposts
- **Personal**: Personal posts

## Automation Tips

### Run Weekly
Set up a recurring reminder to run this automation weekly to keep your analytics fresh.

### Batch Updates
If you have many posts, Claude can handle scrolling through multiple pages. Just ask it to "get all posts from the last 6 months."

### Update Existing Posts
Re-importing a CSV will update existing posts (matched by URL or content) rather than creating duplicates.

## Troubleshooting

### "Can't find analytics page"
Make sure you're logged into LinkedIn and have creator mode enabled if you want detailed analytics.

### "Not all posts showing"
LinkedIn may lazy-load posts. Ask Claude to scroll down and wait for more posts to load.

### "CSV import failed"
Check that your CSV has at minimum the `content` and `impressions` columns.

## Example Workflow

1. **Monday morning**: Run Claude automation to scrape last week's post performance
2. **Import CSV**: Update your Content Engine analytics
3. **Review insights**: Check which pillars and formats performed best
4. **Plan content**: Use insights to plan next week's posts

---

## Alternative: Manual Export

If automation isn't working, you can manually export from LinkedIn:

1. Go to linkedin.com/analytics
2. Click "Export" on the analytics dashboard
3. Format the downloaded data to match the CSV format above
4. Import into the Content Engine
