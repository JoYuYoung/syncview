from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import feedparser
import requests
from bs4 import BeautifulSoup
import logging
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import os
import random
from datetime import datetime
from dateutil import parser as date_parser
from sqlalchemy.orm import Session
from database import get_db
from models import ReadArticle

router = APIRouter()
logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Cloud Run AI 서비스 공통 함수
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def call_ai_service(path: str, payload: dict, timeout: int = 60) -> dict:
    """
    Cloud Run AI 서비스로 HTTP 요청 전달 (공통 프록시 함수)
    
    Args:
        path: API 경로 (예: "/sentiment", "/summarize", "/translate")
        payload: 요청 데이터 (JSON)
        timeout: 타임아웃 (초)
    
    Returns:
        AI 서비스 응답 (JSON)
    
    Raises:
        HTTPException: AI 서비스 호출 실패 시
    """
    # 환경 변수에서 AI 서비스 URL 읽기
    AI_SERVICE_URL = os.getenv("AI_SERVICE_URL")
    
    if not AI_SERVICE_URL:
        logger.error("❌ AI_SERVICE_URL 환경 변수가 설정되지 않았습니다")
        raise HTTPException(
            status_code=500,
            detail="AI 서비스가 구성되지 않았습니다. 관리자에게 문의하세요."
        )
    
    # URL 구성
    full_url = f"{AI_SERVICE_URL.rstrip('/')}{path}"
    
    try:
        logger.info(f"🔄 Cloud Run AI 서비스 호출: {path}")
        logger.debug(f"   URL: {full_url}")
        logger.debug(f"   Payload: {payload}")
        
        # Cloud Run AI 서비스로 POST 요청
        response = requests.post(
            full_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout
        )
        
        # 응답 상태 코드 확인
        if response.status_code != 200:
            error_detail = f"AI 서비스 오류 (HTTP {response.status_code})"
            try:
                error_body = response.json()
                error_detail = error_body.get("detail", error_detail)
            except:
                error_detail = response.text or error_detail
            
            logger.error(f"❌ Cloud Run AI 서비스 오류: {error_detail}")
            raise HTTPException(
                status_code=response.status_code,
                detail=error_detail
            )
        
        # 성공 응답 반환
        result = response.json()
        logger.info(f"✅ Cloud Run AI 서비스 응답 완료: {path}")
        return result
        
    except requests.exceptions.Timeout:
        logger.error(f"⏱️ Cloud Run AI 서비스 타임아웃: {path}")
        raise HTTPException(
            status_code=504,
            detail=f"AI 서비스 요청 시간 초과 ({timeout}초)"
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Cloud Run AI 서비스 호출 실패: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"AI 서비스에 연결할 수 없습니다: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 예상치 못한 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AI 서비스 호출 중 오류 발생: {str(e)}"
        )

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 로컬 AI 모델 로딩 함수 (USE_LOCAL_AI=true 일 때만 사용)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

sentiment_analyzer = None

def _get_sentiment_analyzer():
    """
    감성 분석 모델 초기화 (로컬 모드 전용 - USE_LOCAL_AI=true)
    프로덕션에서는 사용하지 않음
    """
    global sentiment_analyzer
    if sentiment_analyzer is None:
        try:
            import torch
            from transformers import pipeline
            import gc
            import psutil
            
            process = psutil.Process(os.getpid())
            mem_before = process.memory_info().rss / 1024 / 1024
            
            logger.info("🔄 감성 분석 모델 로딩 중 (~268MB)...")
            sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=-1,
                framework="pt"
            )
            gc.collect()
            
            mem_after = process.memory_info().rss / 1024 / 1024
            logger.info(f"✅ 감성 분석 모델 로딩 완료 (+{mem_after - mem_before:.1f} MB)")
        except Exception as e:
            logger.error(f"❌ 감성 분석 모델 로딩 실패: {e}")
            raise HTTPException(status_code=503, detail="감성 분석 모델을 로딩할 수 없습니다.")
    return sentiment_analyzer

# -------------------------------
# 1. BBC RSS 뉴스 목록 가져오기
# -------------------------------
@router.get("/bbc")
def get_bbc_news():
    try:
        rss_url = "http://feeds.bbci.co.uk/news/world/rss.xml"
        logger.info(f"BBC RSS 피드 요청: {rss_url}")
        
        # RSS 피드 파싱
        feed = feedparser.parse(rss_url)
        
        if not feed.entries:
            logger.warning("BBC RSS 피드에서 뉴스를 찾을 수 없습니다.")
            return {"articles": [], "message": "뉴스를 불러올 수 없습니다."}
        
        articles = []
        for entry in feed.entries[:10]:
            try:
                article = {
                    "title": entry.get("title", "제목 없음"),
                    "link": entry.get("link", ""),
                    "summary": entry.get("summary", entry.get("description", "요약 없음")),
                    "published": entry.get("published", "")
                }
                articles.append(article)
            except Exception as e:
                logger.warning(f"뉴스 항목 처리 중 오류: {e}")
                continue
        
        logger.info(f"BBC 뉴스 {len(articles)}개 로딩 완료")
        return {"articles": articles}
        
    except Exception as e:
        logger.error(f"BBC 뉴스 로딩 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"뉴스를 불러오는 중 오류가 발생했습니다: {str(e)}"
        )

# -------------------------------
# Reuters RSS 뉴스 목록 가져오기
# -------------------------------
@router.get("/reuters")
def get_reuters_news():
    try:
        # Reuters Agency 공식 RSS 피드
        rss_url = "https://www.reutersagency.com/feed/?best-topics=tech&post_type=best"
        logger.info(f"Reuters RSS 피드 요청: {rss_url}")
        
        # RSS 피드 파싱
        feed = feedparser.parse(rss_url)
        logger.info(f"파싱된 entries 개수: {len(feed.entries)}")
        
        # 실패 시 BBC World로 대체
        if not feed.entries:
            logger.warning("Reuters RSS 실패, BBC World로 대체")
            rss_url = "http://feeds.bbci.co.uk/news/world/rss.xml"
            feed = feedparser.parse(rss_url)
            logger.info(f"대체 피드 - 파싱된 entries 개수: {len(feed.entries)}")
        
        if not feed.entries:
            logger.warning("Reuters RSS 피드에서 뉴스를 찾을 수 없습니다.")
            return {"articles": [], "message": "뉴스를 불러올 수 없습니다."}
        
        articles = []
        for entry in feed.entries[:10]:
            try:
                title = entry.get("title", "제목 없음")
                # 제목에서 출처 제거 (예: " - Reuters", " - 로이터")
                title = title.split(" - Reuters")[0].split(" - 로이터")[0].strip()
                
                # description에서 HTML 태그 제거
                description = entry.get("description", entry.get("summary", ""))
                if description:
                    soup = BeautifulSoup(description, "html.parser")
                    clean_desc = soup.get_text(strip=True)
                else:
                    clean_desc = ""
                
                article = {
                    "title": title,
                    "link": entry.get("link", ""),
                    "summary": "",  # Reuters는 요약 표시 안 함
                    "published": entry.get("published", "")
                }
                articles.append(article)
            except Exception as e:
                logger.warning(f"뉴스 항목 처리 중 오류: {e}")
                continue
        
        logger.info(f"Reuters 뉴스 {len(articles)}개 로딩 완료")
        return {"articles": articles}
        
    except Exception as e:
        logger.error(f"Reuters 뉴스 로딩 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"뉴스를 불러오는 중 오류가 발생했습니다: {str(e)}"
        )

# -------------------------------
# CNN RSS 뉴스 목록 가져오기
# -------------------------------
@router.get("/cnn")
def get_cnn_news():
    try:
        # CNN Top Stories RSS 피드
        rss_url = "http://rss.cnn.com/rss/cnn_topstories.xml"
        logger.info(f"CNN RSS 피드 요청: {rss_url}")
        
        # RSS 피드 파싱
        feed = feedparser.parse(rss_url)
        logger.info(f"파싱된 entries 개수: {len(feed.entries)}")
        
        if not feed.entries:
            logger.warning("CNN RSS 피드에서 뉴스를 찾을 수 없습니다.")
            return {"articles": [], "message": "뉴스를 불러올 수 없습니다."}
        
        articles = []
        for entry in feed.entries[:10]:
            try:
                # CNN RSS에서 summary 추출
                summary = entry.get("summary", entry.get("description", ""))
                # HTML 태그 제거
                if summary:
                    soup = BeautifulSoup(summary, "html.parser")
                    summary = soup.get_text().strip()
                
                article = {
                    "title": entry.get("title", "제목 없음"),
                    "link": entry.get("link", ""),
                    "summary": summary if summary else "",
                    "published": entry.get("published", "")
                }
                articles.append(article)
            except Exception as e:
                logger.warning(f"뉴스 항목 처리 중 오류: {e}")
                continue
        
        logger.info(f"CNN 뉴스 {len(articles)}개 로딩 완료")
        return {"articles": articles}
        
    except Exception as e:
        logger.error(f"CNN 뉴스 로딩 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"뉴스를 불러오는 중 오류가 발생했습니다: {str(e)}"
        )

# -------------------------------
# 통합 뉴스 엔드포인트 (매체 선택)
# -------------------------------
@router.get("/news")
def get_news(source: str = "BBC"):
    """
    매체별 뉴스 가져오기
    source: BBC, Reuters (로이터), CNN
    """
    try:
        source_lower = source.lower()
        
        if source_lower == "bbc":
            return get_bbc_news()
        elif source_lower in ["reuters", "reuters (로이터)", "로이터"]:
            return get_reuters_news()
        elif source_lower == "cnn":
            return get_cnn_news()
        else:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 매체입니다: {source}. BBC, Reuters (로이터), CNN 중 하나를 선택하세요."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"뉴스 로딩 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"뉴스를 불러오는 중 오류가 발생했습니다: {str(e)}"
        )

# -------------------------------
# 2. 특정 기사 본문 가져오기
# -------------------------------
@router.get("/detail")
def get_news_detail(url: str):
    try:
        res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        paragraphs = soup.find_all("p")
        content = " ".join([p.get_text() for p in paragraphs])

        return {"url": url, "content": content[:3000]}
    except Exception as e:
        logger.error(f"뉴스 본문 가져오기 실패: {e}")
        raise HTTPException(status_code=500, detail=f"뉴스 본문을 가져올 수 없습니다: {str(e)}")

# -------------------------------
# 3. 기사 요약하기 (Cloud Run AI 서비스)
# -------------------------------
@router.get("/summary")
def summarize_news(url: str):
    """
    뉴스 기사 요약 (Cloud Run AI 서비스로 프록시)
    
    Args:
        url: 요약할 뉴스 기사 URL
    
    Returns:
        {"url": str, "summary": str}
    """
    try:
        logger.info(f"🔄 뉴스 요약 요청: {url}")
        
        # 웹페이지 내용 가져오기
        res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        paragraphs = soup.find_all("p")
        content = " ".join([p.get_text() for p in paragraphs])[:1024]  # 최대 1024자

        if not content or len(content.strip()) < 50:
            logger.warning("뉴스 본문이 너무 짧거나 없습니다.")
            return {"url": url, "summary": "본문을 요약할 수 없습니다. 내용이 너무 짧거나 접근할 수 없습니다."}

        # Cloud Run AI 서비스로 요약 요청
        payload = {
            "text": content,
            "max_length": 130,
            "min_length": 30
        }
        
        result = call_ai_service("/summarize", payload, timeout=60)
        
        # 응답 처리
        summary_text = result.get("summary", "요약을 생성할 수 없습니다.")

        logger.info("✅ 뉴스 요약 완료 (Cloud Run AI)")
        return {"url": url, "summary": summary_text}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 뉴스 요약 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"뉴스 요약 중 오류가 발생했습니다: {str(e)}"
        )

# -------------------------------
# 4. 감성 분석 API (Cloud Run AI 서비스)
# -------------------------------
@router.post("/sentiment")
def analyze_sentiment(data: dict):
    """
    텍스트의 감성을 분석합니다 (Cloud Run AI 서비스로 프록시)
    
    요청 본문: {"text": "분석할 텍스트"}
    응답: {"sentiment": "positive" | "negative" | "neutral", "score": 0.95, "label": "긍정"}
    """
    try:
        text = data.get("text", "")
        if not text or len(text.strip()) < 10:
            return {"sentiment": "neutral", "score": 0.5, "label": "중립"}
        
        # USE_LOCAL_AI 환경 변수 확인 (로컬 개발 모드)
        USE_LOCAL_AI = os.getenv("USE_LOCAL_AI", "false").lower() == "true"
        
        if USE_LOCAL_AI:
            # 로컬 모델 사용 (개발/테스트)
            logger.info("🏠 감성 분석: 로컬 모델 사용")
            analyzer = _get_sentiment_analyzer()
            result = analyzer(text[:512])[0]
            
            sentiment_map = {
                "POSITIVE": {"sentiment": "positive", "label": "긍정"},
                "NEGATIVE": {"sentiment": "negative", "label": "부정"}
            }
            sentiment_info = sentiment_map.get(result["label"], {"sentiment": "neutral", "label": "중립"})
            
            return {
                "sentiment": sentiment_info["sentiment"],
                "label": sentiment_info["label"],
                "score": round(result["score"], 2)
            }
        else:
            # Cloud Run AI 서비스 사용 (프로덕션)
            logger.info("☁️  감성 분석: Cloud Run AI 서비스 사용")
            payload = {"text": text}
            result = call_ai_service("/sentiment", payload, timeout=30)
            return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 감성 분석 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"감성 분석 중 오류가 발생했습니다: {str(e)}"
        )

# -------------------------------
# 5. 유사 기사 분석 API
# -------------------------------
@router.post("/similarity")
def find_similar_articles(data: dict):
    """
    유사 기사를 찾습니다.
    요청 본문: {
        "target_article": {"title": "...", "summary": "..."},
        "articles": [{"title": "...", "summary": "..."}, ...]
    }
    응답: [{"index": 0, "similarity": 0.95, "title": "..."}, ...]
    """
    try:
        target = data.get("target_article", {})
        articles = data.get("articles", [])
        
        if not target or not articles:
            return []
        
        # 타겟 기사와 다른 기사들의 텍스트 준비
        target_text = f"{target.get('title', '')} {target.get('summary', '')}"
        article_texts = [f"{art.get('title', '')} {art.get('summary', '')}" for art in articles]
        
        if not target_text.strip():
            return []
        
        # TF-IDF 벡터화
        all_texts = [target_text] + article_texts
        vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        
        # 코사인 유사도 계산
        target_vector = tfidf_matrix[0:1]
        article_vectors = tfidf_matrix[1:]
        similarities = cosine_similarity(target_vector, article_vectors)[0]
        
        # 유사도가 높은 기사들 필터링 (0.3 이상)
        similar_articles = []
        for idx, sim in enumerate(similarities):
            if sim >= 0.3:  # 유사도 임계값
                similar_articles.append({
                    "index": idx,
                    "similarity": round(float(sim), 2),
                    "title": articles[idx].get("title", ""),
                    "url": articles[idx].get("url", "")
                })
        
        # 유사도 높은 순으로 정렬
        similar_articles.sort(key=lambda x: x["similarity"], reverse=True)
        
        # 최대 5개만 반환
        return similar_articles[:5]
        
    except Exception as e:
        logger.error(f"유사 기사 분석 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"유사 기사 분석 중 오류가 발생했습니다: {str(e)}"
        )

# -------------------------------
# 6. 추천 뉴스 API (TOP 10 중 필터링)
# -------------------------------
class RecommendRequest(BaseModel):
    user_id: int
    topic: Optional[str] = None  # 사용자 관심 주제 (정치, 경제, 기술, 스포츠, 문화)
    articles: List[Dict[str, Any]]  # TOP 10 뉴스 목록

@router.post("/recommend")
def recommend_news(data: RecommendRequest, db: Session = Depends(get_db)):
    """
    사용자 맞춤 추천 뉴스 10개 반환 (관심사 + 읽기 기록 + 최신성 기반)
    
    추천 알고리즘:
    1. 관심사 기반: 사용자 topic과 뉴스 제목 키워드 매칭
    2. 읽은 기사 기반: 사용자 읽기 기록과 TF-IDF 유사도 분석
    3. 최신성 기반: 최근 발행일수록 가점
    4. 다양성 확보: 상위 3개 고정 + 나머지 7개 랜덤 샘플링
    """
    try:
        user_id = data.user_id
        topic = data.topic
        articles = data.articles
        
        if not articles or len(articles) == 0:
            return {"recommended": []}
        
        # 각 뉴스에 추천 점수 부여
        scored_articles = []
        
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # 1. 관심사 기반 점수 (topic 키워드 매칭)
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        topic_keywords = {
            "정치": ["election", "government", "politics", "minister", "president", "policy", "vote", "parliament", "congress"],
            "경제": ["economy", "market", "finance", "stock", "trade", "business", "investment", "inflation", "GDP", "bank"],
            "기술": ["technology", "AI", "software", "digital", "innovation", "tech", "smartphone", "computer", "cyber", "robot", "space"],
            "스포츠": ["sports", "football", "soccer", "basketball", "olympic", "game", "player", "team", "match", "tournament"],
            "문화": ["culture", "movie", "music", "art", "entertainment", "film", "celebrity", "festival", "book", "theater"]
        }
        
        for article in articles:
            score = 0.0
            recommendation_reason = None
            
            title = article.get("title", "").lower()
            summary = article.get("summary", "").lower()
            content = f"{title} {summary}"
            
            # 관심사 키워드 매칭 점수
            interest_score = 0.0
            if topic and topic in topic_keywords:
                keywords = topic_keywords[topic]
                matched_keywords = sum(1 for keyword in keywords if keyword.lower() in content)
                interest_score = matched_keywords / len(keywords)  # 0~1 점수
                
                if interest_score > 0.3:  # 30% 이상 매칭 시
                    score += interest_score * 10  # 가중치 10
                    recommendation_reason = "interest"
            
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            # 2. 읽은 기사 기반 점수 (TF-IDF 유사도)
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            history_score = 0.0
            try:
                # 사용자가 읽은 최근 10개 기사 가져오기
                read_articles = db.query(ReadArticle).filter(
                    ReadArticle.user_id == user_id
                ).order_by(ReadArticle.read_at.desc()).limit(10).all()
                
                if read_articles and len(read_articles) > 0:
                    # 읽은 기사 제목들
                    read_titles = [ra.article_title for ra in read_articles if ra.article_title]
                    
                    if read_titles:
                        # TF-IDF 벡터화
                        all_texts = read_titles + [content]
                        vectorizer = TfidfVectorizer(stop_words='english', max_features=500)
                        tfidf_matrix = vectorizer.fit_transform(all_texts)
                        
                        # 현재 기사와 읽은 기사들의 유사도 계산
                        current_vector = tfidf_matrix[-1:]  # 마지막 (현재 기사)
                        read_vectors = tfidf_matrix[:-1]    # 나머지 (읽은 기사들)
                        similarities = cosine_similarity(current_vector, read_vectors)[0]
                        
                        # 최대 유사도를 점수로 사용
                        max_similarity = float(np.max(similarities))
                        history_score = max_similarity
                        
                        if max_similarity > 0.3:  # 30% 이상 유사 시
                            score += history_score * 10  # 가중치 10
                            if recommendation_reason is None:
                                recommendation_reason = "history"
                            elif recommendation_reason == "interest":
                                recommendation_reason = "both"  # 관심사 + 읽기 패턴
            except Exception as e:
                logger.warning(f"읽기 기록 분석 중 오류 (user_id={user_id}): {e}")
            
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            # 3. 최신성 점수 (발행일 기준, 최근일수록 높은 점수)
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            recency_score = 0.0
            published_str = article.get("published", "")
            if published_str:
                try:
                    # 발행일 파싱 (다양한 형식 지원)
                    published_date = date_parser.parse(published_str)
                    now = datetime.now(published_date.tzinfo) if published_date.tzinfo else datetime.now()
                    
                    # 시간 차이 (시간 단위)
                    time_diff_hours = (now - published_date).total_seconds() / 3600
                    
                    # 최신성 점수 계산 (24시간 이내: 5점, 48시간: 2.5점, 그 이후: 감소)
                    if time_diff_hours < 24:
                        recency_score = 5.0
                    elif time_diff_hours < 48:
                        recency_score = 2.5
                    elif time_diff_hours < 72:
                        recency_score = 1.0
                    else:
                        recency_score = 0.5
                    
                    score += recency_score
                except Exception as e:
                    logger.debug(f"발행일 파싱 실패: {published_str}, {e}")
                    recency_score = 0.5
                    score += recency_score
            else:
                # 발행일 정보 없으면 기본 점수
                recency_score = 0.5
                score += recency_score
            
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            # 4. 기본 점수 (모든 기사에 부여)
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            score += 1.0  # 기본 점수 (0점인 기사가 없도록)
            
            # 추천 이유가 없으면 기본값
            if recommendation_reason is None:
                recommendation_reason = "interest"  # 기본값
            
            scored_articles.append({
                **article,
                "recommendation_score": round(score, 2),
                "recommendation_reason": recommendation_reason
            })
        
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # 다양성 확보: 상위 3개 고정 + 나머지 7개 랜덤 샘플링
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        scored_articles.sort(key=lambda x: x["recommendation_score"], reverse=True)
        
        # 기사가 10개 이하면 전체 반환
        if len(scored_articles) <= 10:
            top_recommended = scored_articles
        else:
            # 상위 3개는 고정 (가장 추천 점수 높은 기사들)
            top_3_fixed = scored_articles[:3]
            
            # 나머지 후보군 (4~끝)
            remaining_candidates = scored_articles[3:]
            
            # 나머지 후보군에서 7개 랜덤 샘플링 (다양성 확보)
            if len(remaining_candidates) <= 7:
                sampled = remaining_candidates
            else:
                sampled = random.sample(remaining_candidates, 7)
            
            # 최종 추천 목록: 고정 3개 + 랜덤 7개
            top_recommended = top_3_fixed + sampled
        
        logger.info(f"추천 뉴스 {len(top_recommended)}개 생성 완료 (user_id={user_id}, topic={topic})")
        logger.debug(f"추천 점수 범위: {top_recommended[0]['recommendation_score']:.2f} ~ {top_recommended[-1]['recommendation_score']:.2f}")
        
        return {
            "recommended": top_recommended,
            "total": len(top_recommended)
        }
        
    except Exception as e:
        logger.error(f"추천 뉴스 생성 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"추천 뉴스 생성 중 오류가 발생했습니다: {str(e)}"
        )
