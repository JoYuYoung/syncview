from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

from database import get_db
from models import Bookmark, User

router = APIRouter()
logger = logging.getLogger(__name__)


class BookmarkCreate(BaseModel):
    user_id: int
    title: str
    url: str
    summary: Optional[str] = None
    source: Optional[str] = None
    published: Optional[str] = None


class BookmarkResponse(BaseModel):
    id: int
    user_id: int
    title: str
    url: str
    summary: Optional[str]
    source: Optional[str]
    published: Optional[str]
    saved_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/", response_model=BookmarkResponse)
def create_bookmark(bookmark: BookmarkCreate, db: Session = Depends(get_db)):
    """북마크 생성"""
    try:
        # 중복 확인
        existing = db.query(Bookmark).filter(
            Bookmark.user_id == bookmark.user_id,
            Bookmark.url == bookmark.url
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="이미 북마크된 뉴스입니다.")
        
        new_bookmark = Bookmark(**bookmark.dict())
        db.add(new_bookmark)
        db.commit()
        db.refresh(new_bookmark)
        
        logger.info(f"북마크 생성 완료: user_id={bookmark.user_id}, url={bookmark.url}")
        return new_bookmark
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"북마크 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=f"북마크 생성 중 오류가 발생했습니다: {str(e)}")


@router.get("/{user_id}", response_model=List[BookmarkResponse])
def get_bookmarks(user_id: int, db: Session = Depends(get_db)):
    """사용자의 모든 북마크 조회"""
    try:
        bookmarks = db.query(Bookmark).filter(Bookmark.user_id == user_id).order_by(Bookmark.saved_at.desc()).all()
        return bookmarks
        
    except Exception as e:
        logger.error(f"북마크 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"북마크 조회 중 오류가 발생했습니다: {str(e)}")


@router.delete("/{bookmark_id}")
def delete_bookmark(bookmark_id: int, user_id: int, db: Session = Depends(get_db)):
    """북마크 삭제"""
    try:
        bookmark = db.query(Bookmark).filter(
            Bookmark.id == bookmark_id,
            Bookmark.user_id == user_id
        ).first()
        
        if not bookmark:
            raise HTTPException(status_code=404, detail="북마크를 찾을 수 없습니다.")
        
        db.delete(bookmark)
        db.commit()
        
        logger.info(f"북마크 삭제 완료: bookmark_id={bookmark_id}")
        return {"message": "북마크가 삭제되었습니다."}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"북마크 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail=f"북마크 삭제 중 오류가 발생했습니다: {str(e)}")

