# LinkedIn Content Engine

A personal LinkedIn content creation app for Suman Siva, CEO of Marco Experiences.

## Features

- **Idea Capture**: Text input with auto-categorization into content pillars
- **Idea Repository**: Filter, search, and manage ideas by pillar and status
- **Post Generation**: Generate LinkedIn posts using Claude AI in your exact writing style
- **Post Editor**: Edit with live preview, similar post reference, and copy-to-clipboard
- **Post Queue**: Kanban and calendar views for managing drafts and scheduled posts
- **Dashboard**: Performance stats, pillar overview, and posting recommendations

## Quick Start

### 1. Set up your API key

```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 2. Start the backend

```bash
./start_backend.sh
```

This will:
- Create a Python virtual environment
- Install dependencies
- Start the FastAPI server on http://localhost:8000

### 3. Start the frontend (in a new terminal)

```bash
./start_frontend.sh
```

This will:
- Install npm dependencies
- Start the React dev server on http://localhost:3000

## Manual Installation

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Content Pillars

| Pillar | Name | Description |
|--------|------|-------------|
| A | Offsites as Infrastructure | Not vibes. Not swag. Offsites as operating infrastructure. |
| B | What Actually Breaks | Uncomfortable truths others avoid. |
| C | Proof > Promises | Show receipts. Let results speak. |
| D | Founder POV | Building in public. Lessons from the arena. |
| E | Category Education | Explain what others assume. Teach the industry. |

## Writing Style

The post generator follows your exact writing style:
- Short paragraphs (1-2 sentences)
- Use arrows (→) for bullets, not dashes
- Open with personal hook or observation
- End with punchy insight (no call-to-action)
- Reference Bain/SoftBank/Marco when relevant
- No buzzwords, no passive voice, no emojis

## Recommended Posting Schedule

- **Monday**: Re-entry / Big picture (Pillar D or A)
- **Wednesday**: Category POV / Insight (Pillar A or E)
- **Thursday**: Tactical / Operator truth (Pillar B or C)
- **Friday**: Founder reflection (Pillar D)

Target: 3-4 posts per week

## API Endpoints

- `POST /api/ideas` - Create and auto-categorize an idea
- `GET /api/ideas` - List all ideas (with filtering)
- `POST /api/posts/generate` - Generate a post from ideas
- `GET /api/posts` - List all posts
- `PATCH /api/posts/{id}` - Update a post
- `GET /api/pillars` - Get content pillar data
- `GET /api/stats` - Get dashboard statistics

## Tech Stack

- **Backend**: Python FastAPI + SQLite + SQLAlchemy
- **Frontend**: React + Tailwind CSS
- **AI**: Claude API (Anthropic)
