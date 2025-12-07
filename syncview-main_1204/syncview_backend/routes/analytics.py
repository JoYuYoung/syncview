from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from database import get_db
from models import ReadArticle, User

router = APIRouter()
logger = logging.getLogger(__name__)


class ReadArticleCreate(BaseModel):
    user_id: int
    title: str
    url: str
    source: Optional[str] = None
    category: Optional[str] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None


class ReadArticleResponse(BaseModel):
    id: int
    user_id: int
    title: str
    url: str
    source: Optional[str]
    category: Optional[str]
    sentiment: Optional[str]
    sentiment_score: Optional[float]
    read_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/read-article", response_model=ReadArticleResponse)
def record_read_article(article: ReadArticleCreate, db: Session = Depends(get_db)):
    """읽은 기사 기록"""
    try:
        new_record = ReadArticle(**article.dict())
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        
        logger.info(f"읽은 기사 기록 완료: user_id={article.user_id}, url={article.url}")
        return new_record
        
    except Exception as e:
        db.rollback()
        logger.error(f"읽은 기사 기록 실패: {e}")
        raise HTTPException(status_code=500, detail=f"읽은 기사 기록 중 오류가 발생했습니다: {str(e)}")


@router.get("/stats/{user_id}")
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    """사용자의 통계 데이터 조회"""
    try:
        # 총 읽은 기사 수
        total_articles = db.query(ReadArticle).filter(ReadArticle.user_id == user_id).count()
        
        # 감성 분석 통계
        sentiment_stats = db.query(
            ReadArticle.sentiment,
            func.count(ReadArticle.id).label('count')
        ).filter(
            ReadArticle.user_id == user_id,
            ReadArticle.sentiment.isnot(None)
        ).group_by(ReadArticle.sentiment).all()
        
        sentiment_data = {
            "positive": 0,
            "negative": 0,
            "neutral": 0
        }
        for sentiment, count in sentiment_stats:
            sentiment_data[sentiment] = count
        
        # 감성 분석 통계를 배열로 변환 (프론트엔드 요구사항)
        sentiment_distribution = [
            {"label": "positive", "count": sentiment_data["positive"]},
            {"label": "negative", "count": sentiment_data["negative"]},
            {"label": "neutral", "count": sentiment_data["neutral"]}
        ]
        
        # 긍정 비율 계산
        total_sentiment = sum(sentiment_data.values())
        positive_ratio = round((sentiment_data["positive"] / total_sentiment * 100) if total_sentiment > 0 else 0, 1)
        
        # 카테고리별 통계
        category_stats = db.query(
            ReadArticle.category,
            func.count(ReadArticle.id).label('count')
        ).filter(
            ReadArticle.user_id == user_id,
            ReadArticle.category.isnot(None)
        ).group_by(ReadArticle.category).all()
        
        category_data = [{"category": cat, "count": count} for cat, count in category_stats]
        
        # 인기 카테고리
        popular_category = category_stats[0][0] if category_stats else "없음"
        
        # 요일별 읽기 활동 (최근 7일)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        daily_stats = db.query(
            func.date(ReadArticle.read_at).label('date'),
            func.count(ReadArticle.id).label('count')
        ).filter(
            ReadArticle.user_id == user_id,
            ReadArticle.read_at >= seven_days_ago
        ).group_by(func.date(ReadArticle.read_at)).all()
        
        # 날짜별 데이터 (프론트엔드 요구사항)
        daily_read_counts = []
        for date, count in daily_stats:
            daily_read_counts.append({
                "date": str(date),
                "count": count
            })
        
        # 시간대별 감성 트렌드 (최근 7일)
        hourly_sentiment = db.query(
            extract('hour', ReadArticle.read_at).label('hour'),
            ReadArticle.sentiment,
            func.count(ReadArticle.id).label('count')
        ).filter(
            ReadArticle.user_id == user_id,
            ReadArticle.read_at >= seven_days_ago,
            ReadArticle.sentiment.isnot(None)
        ).group_by('hour', ReadArticle.sentiment).all()
        
        # 시간대별 데이터 구조화
        hourly_data = {}
        for hour, sentiment, count in hourly_sentiment:
            hour_key = f"{int(hour):02d}:00"
            if hour_key not in hourly_data:
                hourly_data[hour_key] = {"time": hour_key, "positive": 0, "negative": 0, "neutral": 0}
            hourly_data[hour_key][sentiment] = count
        
        hourly_list = sorted(hourly_data.values(), key=lambda x: x['time'])
        
        # 평균 읽기 속도 (임의 계산)
        avg_reading_speed = round(total_articles / 7 if total_articles > 0 else 0, 1)
        
        return {
            "total_read_articles": total_articles,
            "positive_ratio": positive_ratio,
            "popular_category": popular_category,
            "reading_speed": f"{avg_reading_speed}개/일",
            "sentiment_distribution": sentiment_distribution,
            "category_distribution": category_data,
            "daily_read_counts": daily_read_counts,
            "hourly_sentiment": hourly_list,
            "insights": _generate_insights(
                total_articles,
                positive_ratio,
                popular_category,
                sentiment_data
            )
        }
        
    except Exception as e:
        logger.error(f"통계 데이터 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"통계 데이터 조회 중 오류가 발생했습니다: {str(e)}")


def _generate_insights(total_articles: int, positive_ratio: float, popular_category: str, sentiment_data: dict) -> List[Dict[str, Any]]:
    """AI 인사이트 생성"""
    insights = []
    
    if total_articles >= 10:
        insights.append({
            "icon": "trophy",
            "color": "blue",
            "title": "독서왕",
            "description": f"총 {total_articles}개의 기사를 읽으셨네요! 꾸준한 독서 습관이 돋보입니다."
        })
    
    if positive_ratio >= 60:
        insights.append({
            "icon": "smile",
            "color": "green",
            "title": "긍정적인 시각",
            "description": f"긍정적인 뉴스를 {positive_ratio}% 읽으셨어요. 밝은 세상을 보는 눈을 가지셨네요!"
        })
    elif positive_ratio <= 30:
        insights.append({
            "icon": "alert",
            "color": "orange",
            "title": "균형 잡힌 시각 필요",
            "description": "부정적인 뉴스가 많아요. 긍정적인 소식도 함께 읽어보세요!"
        })
    
    if popular_category and popular_category != "없음":
        insights.append({
            "icon": "target",
            "color": "purple",
            "title": "관심 분야",
            "description": f"{popular_category} 분야에 관심이 많으시군요! 전문가가 되어가고 있어요."
        })
    
    return insights


@router.get("/history/{user_id}", response_model=List[ReadArticleResponse])
def get_read_history(user_id: int, limit: int = 50, db: Session = Depends(get_db)):
    """읽은 기사 기록 조회"""
    try:
        history = db.query(ReadArticle).filter(
            ReadArticle.user_id == user_id
        ).order_by(ReadArticle.read_at.desc()).limit(limit).all()
        
        return history
        
    except Exception as e:
        logger.error(f"읽은 기사 기록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"읽은 기사 기록 조회 중 오류가 발생했습니다: {str(e)}")

