"""
Clerk authentication utilities for the LinkedIn Content Engine backend.
"""
import os
import jwt
import httpx
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from typing import Optional

security = HTTPBearer(auto_error=False)

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_ISSUER = os.getenv("CLERK_ISSUER")  # e.g., https://clerk.your-app.com

# Cache for Clerk's JWKS (JSON Web Key Set)
_jwks_cache = None


async def get_clerk_jwks():
    """Fetch Clerk's public keys for JWT verification."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    if not CLERK_ISSUER:
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CLERK_ISSUER}/.well-known/jwks.json")
            if response.status_code == 200:
                _jwks_cache = response.json()
                return _jwks_cache
    except Exception as e:
        print(f"Error fetching JWKS: {e}")

    return None


def verify_clerk_token(token: str) -> Optional[dict]:
    """
    Verify a Clerk JWT token and return the claims.

    For development without Clerk configured, returns a mock user.
    """
    if not CLERK_SECRET_KEY and not CLERK_ISSUER:
        # Development mode - return mock user
        return {
            "sub": "dev_user_123",
            "email": "dev@localhost",
            "name": "Developer"
        }

    try:
        # Decode without verification first to get the header
        unverified = jwt.decode(token, options={"verify_signature": False})

        # For simple verification using the secret key
        if CLERK_SECRET_KEY:
            claims = jwt.decode(
                token,
                CLERK_SECRET_KEY,
                algorithms=["HS256", "RS256"],
                options={"verify_aud": False}
            )
            return claims

        return unverified
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    FastAPI dependency to get the current authenticated user.

    If no auth is configured (dev mode), returns a mock user.
    If auth is configured but no token provided, raises 401.
    """
    # Check if auth is configured
    auth_configured = bool(CLERK_SECRET_KEY or CLERK_ISSUER)

    if not auth_configured:
        # Development mode - return mock user
        return {
            "user_id": "dev_user_123",
            "email": "dev@localhost",
            "name": "Developer"
        }

    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    token = credentials.credentials
    claims = verify_clerk_token(token)

    return {
        "user_id": claims.get("sub"),
        "email": claims.get("email"),
        "name": claims.get("name")
    }


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Optional[dict]:
    """
    FastAPI dependency that returns the current user if authenticated,
    or None if not. Useful for endpoints that work both ways.
    """
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


# Rate limiting for free tier users
FREE_TIER_LIMITS = {
    "ideas_per_month": 20,
    "posts_per_month": 5,
    "ai_generations": 10,
}

# Premium users have no limits
PREMIUM_TIER_LIMITS = {
    "ideas_per_month": float('inf'),
    "posts_per_month": float('inf'),
    "ai_generations": float('inf'),
}


def get_user_tier(user_id: str) -> str:
    """
    Check if a user is on free or premium tier.
    In production, this would check Stripe subscription status.
    """
    # TODO: Integrate with Stripe to check subscription
    # For now, all users are on free tier
    return "free"


def get_user_limits(user_id: str) -> dict:
    """Get the usage limits for a user based on their tier."""
    tier = get_user_tier(user_id)
    if tier == "premium":
        return PREMIUM_TIER_LIMITS
    return FREE_TIER_LIMITS
