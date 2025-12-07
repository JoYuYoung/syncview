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
from urllib.parse import urlparse
from utils import call_ai_service


router = APIRouter()
logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# (기존) 기사 본문 추출 유틸 - 지금은 직접 호출하진 않지만 남겨둠
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def extract_reuters_article(soup: BeautifulSoup) -> str:
    """
    Reuters 전용 본문 추출 로직
    - <article> 또는 data-testid="BodyWrapper" 같은 컨테이너 안의 <p>를 모음
    - 'Subscribe to Reuters' 같은 구독 문구 아래는 버림
    """
    article = (
        soup.find("div", attrs={"data-testid": "Body"})
        or soup.find("article")
        or soup.find(attrs={"data-testid": "BodyWrapper"})
        or soup.body
    )

    paragraphs = []
    for p in article.find_all("p", recursive=True):
        text = p.get_text(" ", strip=True)
        if not text:
            continue

        lower = text.lower()
        # 구독/약관/광고 같은 하단 문구 만나면 거기서 끊기
        if "subscribe to reuters" in lower:
            break
        if "our standards:" in lower and "thomson reuters trust principles" in lower:
            break

        paragraphs.append(text)

    return "\n\n".join(paragraphs).strip()


def extract_generic_article(soup: BeautifulSoup) -> str:
    """
    기본 본문 추출 로직 (BBC, CNN 등)
    - <article> 있으면 그 안의 <p>, 없으면 전체에서 <p>
    """
    article = soup.find("article") or soup.body
    paragraphs = [
        p.get_text(" ", strip=True) for p in article.find_all("p", recursive=True)
    ]
    paragraphs = [t for t in paragraphs if t]
    return "\n\n".join(paragraphs).strip()


def extract_article_content(url: str) -> str:
    """
    URL 기준으로 도메인 분기해서 적절한 파서 사용
    (현재는 사용하지 않지만, 혹시 몰라 보존)
    """
    res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")
    domain = urlparse(url).netloc.lower()

    if "reuters.com" in domain:
        content = extract_reuters_article(soup)
    else:
        content = extract_generic_article(soup)

    # 너무 짧으면 (JS 로드 안된 경우 등) 한 번 더 fallback
    if not content or len(content.strip()) < 50:
        meta_og = soup.find("meta", attrs={"property": "og:description"})
        if meta_og and meta_og.get("content"):
            content = meta_og["content"].strip()

    return content


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
        
        feed = feedparser.parse(rss_url)
        
        if not feed.entries:
            logger.warning("BBC RSS 피드에서 뉴스를 찾을 수 없습니다.")
            return {"articles": [], "message": "뉴스를 불러올 수 없습니다."}
        
        articles = []
        for entry in feed.entries[:20]:
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
        # Reuters 공식 RSS 피드 사용
        rss_url = "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best"
        logger.info(f"Reuters RSS 피드 요청: {rss_url}")
        
        feed = feedparser.parse(rss_url)
        logger.info(f"파싱된 entries 개수: {len(feed.entries)}")
        
        if not feed.entries:
            logger.warning("Reuters RSS 피드에서 뉴스를 찾을 수 없습니다.")
            return {"articles": [], "message": "뉴스를 불러올 수 없습니다."}
        
        articles = []
        for entry in feed.entries[:20]:
            try:
                title = entry.get("title", "제목 없음")

                # summary에서 HTML 태그 제거
                summary = entry.get("summary", entry.get("description", ""))
                if summary:
                    soup = BeautifulSoup(summary, "html.parser")
                    summary = soup.get_text().strip()

                article = {
                    "title": title,
                    "link": entry.get("link", ""),
                    "summary": summary if summary else "",
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
        # CNN 공식 RSS 피드 사용 (Top Stories)
        rss_url = "http://rss.cnn.com/rss/edition.rss"
        logger.info(f"CNN RSS 피드 요청: {rss_url}")
        
        feed = feedparser.parse(rss_url)
        logger.info(f"파싱된 entries 개수: {len(feed.entries)}")
        
        if not feed.entries:
            logger.warning("CNN RSS 피드에서 뉴스를 찾을 수 없습니다.")
            return {"articles": [], "message": "뉴스를 불러올 수 없습니다."}
        
        articles = []
        for entry in feed.entries[:20]:
            try:
                # Google News에서 가져온 제목 정리 (- CNN 제거)
                title = entry.get("title", "제목 없음")
                title = title.split(" - CNN")[0].strip()

                # Google News는 summary에 HTML이 포함될 수 있음
                description = entry.get("description", entry.get("summary", ""))
                if description:
                    soup = BeautifulSoup(description, "html.parser")
                    clean_desc = soup.get_text(strip=True)
                else:
                    clean_desc = ""

                article = {
                    "title": title,
                    "link": entry.get("link", ""),
                    "summary": "",  # Google News CNN은 요약 표시 안 함 (Reuters와 동일)
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

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 기사 본문 추출 헬퍼 (실제 detail/summary에서 사용하는 버전)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _extract_article_text(final_url: str, html: str) -> str:
    """
    뉴스 사이트별로 본문을 파싱하는 헬퍼.
    - Reuters: 새 레이아웃(+구 레이아웃) 모두 시도
    - 기타: article 태그 → 전체 p 순으로 시도
    """
    domain = urlparse(final_url).netloc.lower()
    soup = BeautifulSoup(html, "html.parser")

    paragraphs = []

    if "reuters.com" in domain:
        # 1) 새 레이아웃: <div data-testid="Body"> 안의 <p>
        body = soup.find("div", attrs={"data-testid": "Body"})
        if body:
            paragraphs = body.find_all("p")

        # 2) 못 찾으면 <article> 안의 <p>
        if not paragraphs:
            article_tag = soup.find("article")
            if article_tag:
                paragraphs = article_tag.find_all("p")

        # 3) 아주 옛날 레이아웃: class 기반
        if not paragraphs:
            old_body = soup.find("div", class_="article-body__content")
            if old_body:
                paragraphs = old_body.find_all("p")
    else:
        # 기타 사이트: article 태그 우선, 없으면 전체 p
        article_tag = soup.find("article")
        if article_tag:
            paragraphs = article_tag.find_all("p")

    # 최종 fallback: 그냥 페이지 전체 p
    if not paragraphs:
        paragraphs = soup.find_all("p")

    texts = [
        p.get_text(" ", strip=True)
        for p in paragraphs
        if p.get_text(" ", strip=True)
    ]
    content = " ".join(texts)

    logger.info(
        f"본문 추출 완료: domain={domain}, paragraphs={len(paragraphs)}, length={len(content)}"
    )

    # 너무 짧으면 og:description도 한 번 확인
    if len(content.strip()) < 20:
        og = soup.find("meta", property="og:description")
        if og and og.get("content"):
            content = og["content"].strip()

    return content

# -------------------------------
# 2. 특정 기사 본문 가져오기
# -------------------------------
@router.get("/detail")
def get_news_detail(url: str):
    try:
        # Google News URL인 경우 실제 기사 URL 추출
        if "news.google.com" in url:
            # Google News 리다이렉트 페이지 가져오기
            res = requests.get(
                url,
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=10,
                allow_redirects=True,
            )

            # HTML에서 실제 기사 링크 찾기
            soup = BeautifulSoup(res.text, "html.parser")

            # 방법 1: <a> 태그에서 실제 링크 찾기
            link_tag = soup.find("a", href=True)
            if link_tag and link_tag.get("href"):
                actual_url = link_tag["href"]
                # Google News 리다이렉트가 아닌 실제 뉴스 사이트 URL인지 확인
                if not "google.com" in actual_url:
                    url = actual_url
                    logger.info(f"Google News에서 실제 URL 추출: {url}")

        res = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
            allow_redirects=True,
        )

        final_url = res.url
        html = res.text

        content = _extract_article_text(final_url, html)

        if not content or len(content.strip()) == 0:
            logger.warning("뉴스 본문이 비어 있습니다.")
            return {
                "url": final_url,
                "content": "본문을 가져올 수 없습니다. 내용이 너무 짧거나 접근할 수 없습니다.",
            }

        return {"url": final_url, "content": content[:3000]}
    except Exception as e:
        logger.error(f"뉴스 본문 가져오기 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"뉴스 본문을 가져올 수 없습니다: {str(e)}",
        )

# -------------------------------
# 3. 기사 요약하기 (Cloud Run AI 서비스)
# -------------------------------
@router.get("/summary")
def summarize_news(url: str):
    try:
        logger.info(f"뉴스 요약 요청: {url}")

        # Google News URL인 경우 실제 기사 URL 추출
        if "news.google.com" in url:
            # Google News 리다이렉트 페이지 가져오기
            res = requests.get(
                url,
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=10,
                allow_redirects=True,
            )

            # HTML에서 실제 기사 링크 찾기
            soup = BeautifulSoup(res.text, "html.parser")

            # 방법 1: <a> 태그에서 실제 링크 찾기
            link_tag = soup.find("a", href=True)
            if link_tag and link_tag.get("href"):
                actual_url = link_tag["href"]
                # Google News 리다이렉트가 아닌 실제 뉴스 사이트 URL인지 확인
                if not "google.com" in actual_url:
                    url = actual_url
                    logger.info(f"Google News에서 실제 URL 추출: {url}")

        res = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
            allow_redirects=True,
        )
        final_url = res.url
        html = res.text

        content = _extract_article_text(final_url, html)
        content = content.strip()

        if not content:
            logger.warning("뉴스 본문이 거의 없습니다.")
            return {
                "url": final_url,
                "summary": "본문을 요약할 수 없습니다. 내용이 너무 짧거나 접근할 수 없습니다.",
            }

        # 아주 짧은 기사(한두 문장)는 그대로 summary로 사용
        if len(content) < 200:
            logger.info("본문이 짧아서 그대로 요약 결과로 사용합니다.")
            return {"url": final_url, "summary": content}

        # AI_SERVICE_URL이 설정되어 있으면 Cloud Run 사용
        AI_SERVICE_URL = os.getenv("AI_SERVICE_URL")

        if AI_SERVICE_URL:
            # Cloud Run AI 서비스로 요약
            logger.info("☁️  요약: Cloud Run AI 서비스 사용")
            payload = {
                "text": content[:2048],
                "max_length": 130,
                "min_length": 30,
            }
            result = call_ai_service("/summarize", payload, timeout=120)
            summary_text = result.get("summary", "").strip() or "요약을 생성할 수 없습니다."
            logger.info("뉴스 요약 완료 (Cloud Run AI)")
            return {"url": final_url, "summary": summary_text}

        else:
            # 로컬 개발: 간단한 요약 생성 (첫 3문장 추출)
            logger.info("📝 요약: 로컬 모드 (첫 3문장 추출)")

            # 문장 분리 (간단한 방법)
            sentences = []
            for delimiter in ['. ', '! ', '? ']:
                if delimiter in content:
                    parts = content.split(delimiter)
                    for i, part in enumerate(parts[:-1]):
                        sentences.append(part + delimiter.strip())
                    if parts[-1]:
                        sentences.append(parts[-1])
                    break

            if not sentences:
                # 문장 구분이 안 되면 첫 500자만 사용
                summary_text = content[:500] + "..."
            else:
                # 첫 3문장 사용
                summary_text = " ".join(sentences[:3])
                if len(summary_text) > 500:
                    summary_text = summary_text[:500] + "..."

            logger.info("뉴스 요약 완료 (로컬 - 첫 3문장)")
            return {"url": final_url, "summary": summary_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"뉴스 요약 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"뉴스 요약 중 오류가 발생했습니다: {str(e)}",
        )

# -------------------------------
# 4. 감성 분석 API (Cloud Run AI 서비스)
# -------------------------------
@router.post("/sentiment")
def analyze_sentiment(data: dict):
    """
    텍스트의 감성을 분석합니다 (Cloud Run AI 서비스로 프록시)
    """
    try:
        text = data.get("text", "")
        if not text or len(text.strip()) < 10:
            return {"sentiment": "neutral", "score": 0.5, "label": "중립"}
        
        USE_LOCAL_AI = os.getenv("USE_LOCAL_AI", "false").lower() == "true"
        
        if USE_LOCAL_AI:
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
            # AI_SERVICE_URL이 설정되어 있으면 Cloud Run 사용
            AI_SERVICE_URL = os.getenv("AI_SERVICE_URL")

            if AI_SERVICE_URL:
                logger.info("☁️  감성 분석: Cloud Run AI 서비스 사용")
                payload = {"text": text}
                result = call_ai_service("/sentiment", payload, timeout=30)
                return result
            else:
                # 로컬 개발: 뉴스 특화 키워드 기반 감성 분석
                logger.info("📊 감성 분석: 로컬 모드 (뉴스 특화 키워드)")

                text_lower = text.lower()

                # 긍정 키워드 (가중치 포함)
                positive_keywords = {
                    # 성공/성취 (가중치 3)
                    'success': 3, 'successful': 3, 'achieve': 3, 'achieved': 3,
                    'accomplishment': 3, 'breakthrough': 3, 'triumph': 3,
                    # 승리/우승 (가중치 3)
                    'win': 3, 'wins': 3, 'won': 3, 'victory': 3, 'champion': 3,
                    # 긍정적 변화 (가중치 2)
                    'progress': 2, 'improve': 2, 'improved': 2, 'improvement': 2,
                    'growth': 2, 'rise': 2, 'rose': 2, 'rising': 2, 'increase': 2,
                    'gain': 2, 'surge': 2, 'boost': 2, 'recover': 2, 'recovery': 2,
                    'deal': 2, 'deals': 2, 'blockbuster': 2, 'record': 2, 'historic': 2,
                    # 긍정적 평가 (가중치 2)
                    'excellent': 2, 'outstanding': 2, 'remarkable': 2, 'impressive': 2,
                    'positive': 2, 'optimistic': 2, 'favorable': 2, 'promising': 2,
                    # 일반 긍정 (가중치 1)
                    'good': 1, 'great': 1, 'better': 1, 'best': 1, 'wonderful': 1,
                    'fantastic': 1, 'amazing': 1, 'happy': 1, 'pleased': 1, 'hope': 1,
                    'peace': 1, 'celebrate': 1, 'celebration': 1, 'joy': 1, 'love': 1,
                    'support': 1, 'help': 1, 'agreement': 1, 'cooperation': 1,
                    'agree': 1, 'agreed': 1, 'welcome': 1, 'welcomes': 1, 'welcomed': 1,
                    'benefit': 1, 'benefits': 1, 'opportunity': 1, 'opportunities': 1
                }

                # 부정 키워드 (가중치 포함)
                negative_keywords = {
                    # 폭력/재난 (가중치 3)
                    'kill': 3, 'killed': 3, 'death': 3, 'deaths': 3, 'die': 3, 'died': 3,
                    'attack': 3, 'attacked': 3, 'war': 3, 'bomb': 3, 'bombard': 3,
                    'explosion': 3, 'disaster': 3, 'tragedy': 3, 'crisis': 3,
                    'emergency': 3, 'terror': 3, 'terrorism': 3, 'violence': 3,
                    # 범죄/사고 (가중치 3)
                    'murder': 3, 'crash': 3, 'accident': 3, 'fire': 3, 'flood': 3,
                    'earthquake': 3, 'storm': 3, 'hurricane': 3, 'deadly': 3,
                    'shooting': 3, 'shot': 3, 'fighting': 3, 'fight': 3,
                    # 실패/손실 (가중치 2)
                    'fail': 2, 'failed': 2, 'failure': 2, 'loss': 2, 'lost': 2,
                    'lose': 2, 'defeat': 2, 'collapse': 2, 'decline': 2, 'fall': 2,
                    'drop': 2, 'decrease': 2, 'cut': 2, 'slash': 2,
                    # 부정적 평가 (가중치 2)
                    'bad': 2, 'terrible': 2, 'awful': 2, 'worst': 2, 'worse': 2,
                    'poor': 2, 'negative': 2, 'pessimistic': 2, 'concern': 2,
                    'worry': 2, 'fear': 2, 'threat': 2, 'risk': 2, 'danger': 2,
                    # 일반 부정 (가중치 1)
                    'problem': 1, 'issue': 1, 'difficult': 1, 'challenge': 1,
                    'trouble': 1, 'conflict': 1, 'dispute': 1, 'protest': 1,
                    'angry': 1, 'sad': 1, 'disappointed': 1, 'sorry': 1
                }

                # 가중치 적용하여 점수 계산
                positive_score = sum(weight for word, weight in positive_keywords.items() if word in text_lower)
                negative_score = sum(weight for word, weight in negative_keywords.items() if word in text_lower)

                logger.info(f"긍정 점수: {positive_score}, 부정 점수: {negative_score}")

                # 점수 차이가 2 이상이면 명확한 감성으로 판단
                if positive_score > negative_score + 1:
                    sentiment = "positive"
                    label = "긍정"
                    # 점수 차이에 따라 신뢰도 계산
                    diff = positive_score - negative_score
                    score = min(0.55 + diff * 0.05, 0.95)
                elif negative_score > positive_score + 1:
                    sentiment = "negative"
                    label = "부정"
                    diff = negative_score - positive_score
                    score = min(0.55 + diff * 0.05, 0.95)
                else:
                    sentiment = "neutral"
                    label = "중립"
                    score = 0.5

                return {
                    "sentiment": sentiment,
                    "label": label,
                    "score": round(score, 2)
                }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 감성 분석 실패: {e}")
        # 오류 발생 시 중립 반환 (사용자 경험 개선)
        logger.warning("감성 분석 실패 - 중립 반환")
        return {"sentiment": "neutral", "label": "중립", "score": 0.5}

# -------------------------------
# 5. 유사 기사 분석 API
# -------------------------------
@router.post("/similarity")
def find_similar_articles(data: dict):
    """
    유사 기사를 찾습니다.
    """
    try:
        target = data.get("target_article", {})
        articles = data.get("articles", [])
        
        if not target or not articles:
            return []
        
        target_text = f"{target.get('title', '')} {target.get('summary', '')}"
        article_texts = [f"{art.get('title', '')} {art.get('summary', '')}" for art in articles]
        
        if not target_text.strip():
            return []
        
        all_texts = [target_text] + article_texts
        vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        
        target_vector = tfidf_matrix[0:1]
        article_vectors = tfidf_matrix[1:]
        similarities = cosine_similarity(target_vector, article_vectors)[0]
        
        similar_articles = []
        for idx, sim in enumerate(similarities):
            if sim >= 0.3:
                similar_articles.append({
                    "index": idx,
                    "similarity": round(float(sim), 2),
                    "title": articles[idx].get("title", ""),
                    "url": articles[idx].get("url", "")
                })
        
        similar_articles.sort(key=lambda x: x["similarity"], reverse=True)
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
    사용자 맞춤 추천 뉴스 5개 반환 (관심사 기반 2개 + 인기 뉴스 3개)
    """
    try:
        user_id = data.user_id
        topic = data.topic
        articles = data.articles
        
        if not articles or len(articles) == 0:
            return {"recommended": []}
        
        topic_keywords = {
            "정치": ["election", "government", "politics", "minister", "president", "policy", "vote", "parliament", "congress"],
            "경제": ["economy", "market", "finance", "stock", "trade", "business", "investment", "inflation", "GDP", "bank"],
            "기술": ["technology", "AI", "software", "digital", "innovation", "tech", "smartphone", "computer", "cyber", "robot", "space"],
            "스포츠": ["sports", "football", "soccer", "basketball", "olympic", "game", "player", "team", "match", "tournament"],
            "문화": ["culture", "movie", "music", "art", "entertainment", "film", "celebrity", "festival", "book", "theater"]
        }
        
        interest_based_articles = []
        if topic and topic in topic_keywords:
            keywords = topic_keywords[topic]
            
            scored_for_interest = []
            for article in articles:
                title = article.get("title", "").lower()
                summary = article.get("summary", "").lower()
                content = f"{title} {summary}"
                
                matched_keywords = sum(1 for keyword in keywords if keyword.lower() in content)
                interest_score = matched_keywords / len(keywords) if len(keywords) > 0 else 0.0
                
                if interest_score > 0:
                    scored_for_interest.append({
                        "article": article,
                        "score": interest_score
                    })
            
            if scored_for_interest:
                scored_for_interest.sort(key=lambda x: x["score"], reverse=True)
                interest_based_articles = [
                    {
                        **item["article"],
                        "recommendation_reason": "interest"
                    }
                    for item in scored_for_interest[:2]
                ]
        
        if not interest_based_articles:
            interest_based_articles = [
                {
                    **articles[0],
                    "recommendation_reason": "interest"
                },
                {
                    **articles[1],
                    "recommendation_reason": "interest"
                } if len(articles) > 1 else None
            ]
            interest_based_articles = [a for a in interest_based_articles if a is not None]
        
        selected_urls = {article.get("url") for article in interest_based_articles}
        
        popular_candidates = []
        for article in articles:
            if article.get("url") in selected_urls:
                continue
            
            score = 0.0
            
            published_str = article.get("published", "")
            if published_str:
                try:
                    published_date = date_parser.parse(published_str)
                    now = datetime.now(published_date.tzinfo) if published_date.tzinfo else datetime.now()
                    time_diff_hours = (now - published_date).total_seconds() / 3600
                    
                    if time_diff_hours < 24:
                        score += 10.0
                    elif time_diff_hours < 48:
                        score += 5.0
                    elif time_diff_hours < 72:
                        score += 2.0
                    else:
                        score += 1.0
                except:
                    score += 1.0
            else:
                score += 1.0
            
            sentiment = article.get("sentiment", "neutral")
            if sentiment == "positive":
                score += 5.0
            elif sentiment == "neutral":
                score += 2.0
            
            popular_candidates.append({
                "article": article,
                "score": score
            })
        
        popular_candidates.sort(key=lambda x: x["score"], reverse=True)
        popular_articles = [
            {
                **item["article"],
                "recommendation_reason": "trending"
            }
            for item in popular_candidates[:3]
        ]
        
        recommended = interest_based_articles + popular_articles
        
        seen_urls = set()
        unique_recommended = []
        for item in recommended:
            url = item.get("url")
            if url not in seen_urls:
                unique_recommended.append(item)
                seen_urls.add(url)
        
        final_recommended = unique_recommended[:5]
        
        logger.info(f"추천 뉴스 {len(final_recommended)}개 생성 완료 (user_id={user_id}, topic={topic})")
        logger.info(f"  - 관심사 기반: {len(interest_based_articles)}개")
        logger.info(f"  - 인기 뉴스: {len(popular_articles)}개")
        
        return {
            "recommended": final_recommended,
            "total": len(final_recommended)
        }
        
    except Exception as e:
        logger.error(f"추천 뉴스 생성 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"추천 뉴스 생성 중 오류가 발생했습니다: {str(e)}"
        )
