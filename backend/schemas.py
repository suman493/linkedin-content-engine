from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Idea schemas
class IdeaBase(BaseModel):
    raw_input: str
    source: str = "text"

class IdeaCreate(IdeaBase):
    pass

class IdeaUpdate(BaseModel):
    raw_input: Optional[str] = None
    pillar: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

class IdeaResponse(BaseModel):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    source: str
    raw_input: str
    pillar: Optional[str]
    pillar_confidence: Optional[float]
    tags: List[str]
    status: str

    class Config:
        from_attributes = True

# Post schemas
class PostBase(BaseModel):
    content: str
    format: str = "Text Only"

class PostCreate(BaseModel):
    idea_ids: List[int]
    format: str = "Text Only"

class PostUpdate(BaseModel):
    content: Optional[str] = None
    format: Optional[str] = None
    image_prompt: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = None

class PostResponse(BaseModel):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    content: Optional[str]
    format: str
    image_prompt: Optional[str]
    tweet_version: Optional[str]
    scheduled_date: Optional[str]
    scheduled_time: Optional[str]
    status: str
    performance: dict
    ideas: List[IdeaResponse]

    class Config:
        from_attributes = True

# Generation request schemas
class GeneratePostRequest(BaseModel):
    idea_ids: List[int]
    format: str = "Text Only"
    pillar: Optional[str] = None

class CategorizeResponse(BaseModel):
    pillar: str
    pillar_name: str
    confidence: float
    reasoning: str
