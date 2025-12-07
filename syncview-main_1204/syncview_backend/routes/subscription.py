from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from database import get_db
from models import Subscription, User

router = APIRouter()
logger = logging.getLogger(__name__)


class SubscriptionCreate(BaseModel):
    user_id: int
    topic: Optional[str] = None
    source: str  # BBC, Reuters (로이터), 연합뉴스


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    topic: Optional[str]
    source: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/", response_model=SubscriptionResponse)
def create_or_update_subscription(subscription: SubscriptionCreate, db: Session = Depends(get_db)):
    """구독 설정 생성 또는 업데이트"""
    try:
        # 기존 구독 확인
        existing = db.query(Subscription).filter(Subscription.user_id == subscription.user_id).first()
        
        if existing:
            # 업데이트
            existing.topic = subscription.topic
            existing.source = subscription.source
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            logger.info(f"구독 설정 업데이트 완료: user_id={subscription.user_id}")
            return existing
        else:
            # 생성
            new_subscription = Subscription(**subscription.dict())
            db.add(new_subscription)
            db.commit()
            db.refresh(new_subscription)
            logger.info(f"구독 설정 생성 완료: user_id={subscription.user_id}")
            return new_subscription
        
    except Exception as e:
        db.rollback()
        logger.error(f"구독 설정 저장 실패: {e}")
        raise HTTPException(status_code=500, detail=f"구독 설정 저장 중 오류가 발생했습니다: {str(e)}")


@router.get("/{user_id}")
def get_subscription(user_id: int, db: Session = Depends(get_db)):
    """사용자의 구독 설정 조회 (없으면 null 반환)"""
    try:
        subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()

        if not subscription:
            # 404 에러 대신 null 반환 (프론트엔드에서 구독 설정이 없음을 알 수 있도록)
            return None

        return subscription

    except Exception as e:
        logger.error(f"구독 설정 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"구독 설정 조회 중 오류가 발생했습니다: {str(e)}")


@router.delete("/{user_id}")
def delete_subscription(user_id: int, db: Session = Depends(get_db)):
    """구독 설정 삭제"""
    try:
        subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="구독 설정을 찾을 수 없습니다.")
        
        db.delete(subscription)
        db.commit()
        
        logger.info(f"구독 설정 삭제 완료: user_id={user_id}")
        return {"message": "구독 설정이 삭제되었습니다."}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"구독 설정 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail=f"구독 설정 삭제 중 오류가 발생했습니다: {str(e)}")

