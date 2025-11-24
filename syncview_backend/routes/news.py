from fastapi import APIRouter, HTTPException
import feedparser
import requests
import torch
from bs4 import BeautifulSoup
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForSequenceClassification
import logging
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import os
import gc  # 메모리 최적화를 위한 가비지 컬렉션

# ✅ accelerate와 meta device 완전히 비활성화
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"
os.environ["ACCELERATE_USE_CPU"] = "1"
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:512"

# ✅ torch 기본 device를 CPU로 강제 설정
torch.set_default_device('cpu')

router = APIRouter()
logger = logging.getLogger(__name__)

# ✅ 요약 모델 (BART 사용, 처음 실행 시 다운로드됨)
summarizer = None
sentiment_analyzer = None

def _get_summarizer():
    """지연 로딩으로 요약 모델 초기화 (2GB RAM 최적화 - 더 작은 모델)"""
    global summarizer
    if summarizer is None:
        try:
            logger.info("요약 모델 로딩 중 (경량 버전, ~150MB)...")
            # ✅ 더 작은 모델 사용: distilbart-cnn-6-6 (12-6보다 50% 작음)
            summarizer = pipeline(
                "summarization",
                model="sshleifer/distilbart-cnn-6-6",
                device=-1  # CPU 강제
            )
            gc.collect()  # 메모리 정리
            logger.info("✅ 요약 모델 로딩 완료 (CPU, 경량 버전)")
        except Exception as e:
            logger.error(f"❌ 요약 모델 로딩 실패: {e}")
            raise HTTPException(status_code=503, detail="요약 모델을 로딩할 수 없습니다.")
    return summarizer

def _get_sentiment_analyzer():
    """지연 로딩으로 감성 분석 모델 초기화 (2GB RAM 최적화)"""
    global sentiment_analyzer
    if sentiment_analyzer is None:
        try:
            logger.info("감성 분석 모델 로딩 중 (~268MB)...")
            # ✅ device_map / low_cpu_mem_usage 없이 깔끔하게 로드
            sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=-1  # CPU 강제 (pipeline이 알아서 처리)
            )
            gc.collect()  # 메모리 정리
            logger.info("✅ 감성 분석 모델 로딩 완료 (CPU)")
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
# 3. 기사 요약하기 (Hugging Face 사용)
# -------------------------------
@router.get("/summary")
def summarize_news(url: str):
    try:
        logger.info(f"뉴스 요약 요청: {url}")
        
        # 웹페이지 내용 가져오기
        res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        paragraphs = soup.find_all("p")
        content = " ".join([p.get_text() for p in paragraphs])[:3000]

        if not content or len(content.strip()) < 50:
            logger.warning("뉴스 본문이 너무 짧거나 없습니다.")
            return {"url": url, "summary": "본문을 요약할 수 없습니다. 내용이 너무 짧거나 접근할 수 없습니다."}

        # 요약 모델 로딩 및 실행
        summarizer_model = _get_summarizer()
        result = summarizer_model(content, max_length=130, min_length=30, do_sample=False)

        logger.info("뉴스 요약 완료")
        return {"url": url, "summary": result[0]["summary_text"]}
        
    except Exception as e:
        logger.error(f"뉴스 요약 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"뉴스 요약 중 오류가 발생했습니다: {str(e)}"
        )

# -------------------------------
# 4. 감성 분석 API
# -------------------------------
@router.post("/sentiment")
def analyze_sentiment(data: dict):
    """
    텍스트의 감성을 분석합니다.
    요청 본문: {"text": "분석할 텍스트"}
    응답: {"sentiment": "positive" | "negative" | "neutral", "score": 0.95}
    """
    try:
        text = data.get("text", "")
        if not text or len(text.strip()) < 10:
            return {"sentiment": "neutral", "score": 0.5, "label": "중립"}
        
        # 감성 분석 모델 로딩 및 실행
        analyzer = _get_sentiment_analyzer()
        result = analyzer(text[:512])[0]  # 최대 512 토큰
        
        # POSITIVE/NEGATIVE를 한국어로 변환
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
        
    except Exception as e:
        logger.error(f"감성 분석 실패: {e}")
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
