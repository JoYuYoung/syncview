from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Bookmark(Base):
    """북마크 모델"""
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    source = Column(String, nullable=True)  # BBC, Reuters, 연합뉴스
    published = Column(String, nullable=True)
    saved_at = Column(DateTime, default=datetime.utcnow)
    
    # 관계
    user = relationship("User", back_populates="bookmarks")


class Subscription(Base):
    """구독 설정 모델"""
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    topic = Column(String, nullable=True)  # 정치, 경제, 사회, 국제, IT/과학, 스포츠
    source = Column(String, nullable=False)  # BBC, Reuters (로이터), 연합뉴스
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    user = relationship("User", back_populates="subscription")


class ReadArticle(Base):
    """읽은 기사 기록 모델"""
    __tablename__ = "read_articles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    source = Column(String, nullable=True)  # BBC, Reuters, 연합뉴스
    category = Column(String, nullable=True)  # 정치, 경제, 사회, 국제, IT/과학, 스포츠
    sentiment = Column(String, nullable=True)  # positive, negative, neutral
    sentiment_score = Column(Float, nullable=True)
    read_at = Column(DateTime, default=datetime.utcnow)
    
    # 관계
    user = relationship("User", back_populates="read_articles")

