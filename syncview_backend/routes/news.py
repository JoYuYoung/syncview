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
import psutil  # 메모리 사용량 모니터링
import time  # API 재시도 대기용

# ✅ accelerate와 meta device 완전히 비활성화
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"
os.environ["ACCELERATE_USE_CPU"] = "1"
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:512"

# ✅ torch 기본 device를 CPU로 강제 설정
torch.set_default_device('cpu')

router = APIRouter()
logger = logging.getLogger(__name__)

# ✅ 감성 분석 모델만 로컬 사용
sentiment_analyzer = None

# 🌐 Hugging Face Inference API 설정 (요약만 사용)
HF_API_URL_SUMMARIZE = "https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6"
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")  # 환경 변수에서 토큰 읽기 (선택사항, 무료 한도로도 충분)

def _call_hf_api(api_url: str, payload: dict, retry_count: int = 3) -> dict:
    """Hugging Face Inference API 호출 (재시도 로직 포함)"""
    headers = {"Content-Type": "application/json"}
    if HF_API_TOKEN:
        headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
    
    for attempt in range(retry_count):
        try:
            response = requests.post(api_url, headers=headers, json=payload, timeout=30)
            
            # 모델 로딩 중인 경우 (503)
            if response.status_code == 503:
                try:
                    result = response.json()
                    if "estimated_time" in result:
                        wait_time = min(result["estimated_time"], 20)  # 최대 20초
                        logger.info(f"⏳ 요약 모델 로딩 중... {wait_time}초 대기 (시도 {attempt + 1}/{retry_count})")
                        time.sleep(wait_time)
                        continue
                except:
                    # JSON 파싱 실패 시 기본 대기
                    if attempt < retry_count - 1:
                        logger.info(f"⏳ 재시도 중... (시도 {attempt + 1}/{retry_count})")
                        time.sleep(5)
                        continue
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            logger.warning(f"⏱️ 요약 API 타임아웃 (시도 {attempt + 1}/{retry_count})")
            if attempt == retry_count - 1:
                raise HTTPException(status_code=504, detail="요약 API 요청 시간 초과")
            time.sleep(2)  # 재시도 전 대기
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 요약 API 호출 실패 (시도 {attempt + 1}/{retry_count}): {e}")
            if attempt == retry_count - 1:
                raise HTTPException(status_code=503, detail=f"요약 API 호출 실패: {str(e)}")
            time.sleep(2)  # 재시도 전 대기
    
    raise HTTPException(status_code=503, detail="요약 API 호출 최대 재시도 초과")

def _get_sentiment_analyzer():
    """감성 분석 모델 초기화 (서버 시작 시 사전 로딩 - 가장 중요한 기능)"""
    global sentiment_analyzer
    if sentiment_analyzer is None:
        try:
            process = psutil.Process(os.getpid())
            mem_before = process.memory_info().rss / 1024 / 1024
            
            logger.info("🔄 감성 분석 모델 로딩 중 (~268MB)...")
            # ✅ device_map / low_cpu_mem_usage 없이 깔끔하게 로드
            sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=-1,  # CPU 강제
                framework="pt"  # PyTorch 명시
            )
            gc.collect()  # 메모리 정리
            
            mem_after = process.memory_info().rss / 1024 / 1024
            logger.info(f"✅ 감성 분석 모델 로딩 완료 (+{mem_after - mem_before:.1f} MB)")
            logger.info(f"📊 현재 총 메모리: {mem_after:.1f} MB")
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
# 3. 기사 요약하기 (Hugging Face Inference API 사용)
# -------------------------------
@router.get("/summary")
def summarize_news(url: str):
    try:
        logger.info(f"🔄 뉴스 요약 요청 (외부 API): {url}")
        
        # 웹페이지 내용 가져오기
        res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        paragraphs = soup.find_all("p")
        content = " ".join([p.get_text() for p in paragraphs])[:1024]  # API 제한 고려

        if not content or len(content.strip()) < 50:
            logger.warning("뉴스 본문이 너무 짧거나 없습니다.")
            return {"url": url, "summary": "본문을 요약할 수 없습니다. 내용이 너무 짧거나 접근할 수 없습니다."}

        # Hugging Face Inference API 호출
        payload = {
            "inputs": content,
            "parameters": {
                "max_length": 130,
                "min_length": 30,
                "do_sample": False
            }
        }
        
        result = _call_hf_api(HF_API_URL_SUMMARIZE, payload)
        
        # API 응답 처리
        if isinstance(result, list) and len(result) > 0:
            summary_text = result[0].get("summary_text", "요약 실패")
        else:
            summary_text = "요약을 생성할 수 없습니다."

        logger.info("✅ 뉴스 요약 완료 (외부 API)")
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
