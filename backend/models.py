from sqlalchemy import Column, Integer, String, Text, Float, DateTime, JSON, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# Association table for many-to-many relationship between posts and ideas
post_ideas = Table(
    'post_ideas',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id'), primary_key=True),
    Column('idea_id', Integer, ForeignKey('ideas.id'), primary_key=True)
)

class Idea(Base):
    __tablename__ = "ideas"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    source = Column(String(20), default="text")  # "voice" or "text"
    raw_input = Column(Text, nullable=False)
    pillar = Column(String(1))  # A, B, C, D, E
    pillar_confidence = Column(Float)
    tags = Column(JSON, default=list)
    status = Column(String(20), default="captured")  # captured, drafted, scheduled, published

    # Relationship to posts
    posts = relationship("Post", secondary=post_ideas, back_populates="ideas")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    content = Column(Text)
    format = Column(String(50), default="Text Only")  # Text Only, Text + Image, Carousel
    image_prompt = Column(Text)
    tweet_version = Column(Text)
    scheduled_date = Column(String(20))
    scheduled_time = Column(String(10))
    status = Column(String(20), default="draft")  # draft, scheduled, published
    performance = Column(JSON, default=dict)

    # Relationship to ideas
    ideas = relationship("Idea", secondary=post_ideas, back_populates="posts")
