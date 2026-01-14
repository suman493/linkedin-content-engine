# LinkedIn Content Engine - Deployment Guide

This guide covers deploying the LinkedIn Content Engine for public use with multi-user authentication.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │     │   Database      │
│   (Vercel)      │────▶│   (Railway)     │────▶│   (Supabase)    │
│   React App     │     │   FastAPI       │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Auth          │
│   (Clerk)       │
└─────────────────┘
```

## Step 1: Set Up Authentication (Clerk)

### 1.1 Create Clerk Account
1. Go to [clerk.com](https://clerk.com) and sign up
2. Create a new application
3. Copy your API keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### 1.2 Install Clerk in Frontend

```bash
cd frontend
npm install @clerk/clerk-react
```

### 1.3 Update Frontend Code

Create `src/auth/ClerkProvider.js`:
```javascript
import { ClerkProvider, SignedIn, SignedOut, SignIn, UserButton } from '@clerk/clerk-react';

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }) {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <SignIn />
        </div>
      </SignedOut>
    </ClerkProvider>
  );
}

export { UserButton };
```

Update `src/index.js`:
```javascript
import { AuthProvider } from './auth/ClerkProvider';

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
```

### 1.4 Environment Variables (Frontend)

Create `.env.local`:
```
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...
REACT_APP_API_URL=https://your-backend.railway.app/api
```

## Step 2: Set Up Database (Supabase)

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string from Settings > Database

### 2.2 Update Backend for PostgreSQL

Update `backend/database.py`:
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./content_engine.db")

# Handle Railway/Supabase postgres URL format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2.3 Add User ID to Models

Update `backend/models.py` to add user tracking:
```python
class Idea(Base):
    __tablename__ = "ideas"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, index=True)  # Add this
    # ... rest of fields

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, index=True)  # Add this
    # ... rest of fields
```

## Step 3: Deploy Backend (Railway)

### 3.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository

### 3.2 Deploy Backend
```bash
# In backend folder
railway login
railway init
railway up
```

### 3.3 Set Environment Variables in Railway
- `DATABASE_URL` - Your Supabase connection string
- `ANTHROPIC_API_KEY` - Your Claude API key
- `CLERK_SECRET_KEY` - For verifying auth tokens

### 3.4 Get Your Backend URL
After deployment, Railway gives you a URL like:
`https://linkedin-content-engine-backend.up.railway.app`

## Step 4: Deploy Frontend (Vercel)

### 4.1 Deploy to Vercel
```bash
# In frontend folder
npx vercel
```

Or connect via GitHub:
1. Go to [vercel.com](https://vercel.com)
2. Import your repository
3. Set root directory to `frontend`

### 4.2 Set Environment Variables in Vercel
- `REACT_APP_CLERK_PUBLISHABLE_KEY`
- `REACT_APP_API_URL` - Your Railway backend URL

## Step 5: Configure CORS

Update `backend/main.py` CORS settings:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 6: Test Deployment

1. Visit your Vercel URL
2. Sign up/sign in with Clerk
3. Create an idea to test the flow
4. Check Analytics page loads

## Freemium Model Setup

### Free Tier Limits
Add to backend to enforce limits:

```python
FREE_TIER_LIMITS = {
    "ideas_per_month": 20,
    "posts_per_month": 5,
    "ai_regenerations": 10,
}

async def check_user_limits(user_id: str, action: str, db: Session):
    # Implement limit checking logic
    pass
```

### Stripe Integration (for paid tier)
```bash
pip install stripe
```

## Quick Start Checklist

- [ ] Create Clerk account and app
- [ ] Create Supabase project
- [ ] Create Railway account
- [ ] Create Vercel account
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Set all environment variables
- [ ] Test sign up flow
- [ ] Test idea creation
- [ ] Test post generation

## Environment Variables Summary

### Frontend (Vercel)
```
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_...
REACT_APP_API_URL=https://your-backend.railway.app/api
```

### Backend (Railway)
```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
CLERK_SECRET_KEY=sk_...
```

## Cost Estimates (Monthly)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth | $20/mo |
| Railway | $5 credit | ~$5-10/mo |
| Supabase | 500MB, 2GB transfer | $25/mo |
| Clerk | 10k MAU | $25/mo |
| Claude API | N/A | ~$10-50/mo |

**Estimated total for small scale**: $0-25/month on free tiers

## Troubleshooting

### CORS Errors
Make sure your Vercel URL is in the CORS allowed origins.

### Database Connection Issues
Check that DATABASE_URL uses `postgresql://` not `postgres://`.

### Auth Not Working
Verify Clerk keys match between frontend and backend.

### API Calls Failing
Check Railway logs: `railway logs`
