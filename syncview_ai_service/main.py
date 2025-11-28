# syncview_ai_service/main.py
# Cloud Run에서 실행될 AI 전용 마이크로서비스

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import pipeline
import logging
import os
import gc

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 로깅 설정
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 환경 변수 설정 (CPU 강제)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"
os.environ["ACCELERATE_USE_CPU"] = "1"
os.environ["CUDA_VISIBLE_DEVICES"] = ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FastAPI 앱 생성
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app = FastAPI(title="SyncView AI Service", version="1.0.0")

# CORS 설정 (모든 origin 허용 - 프로덕션에서는 특정 도메인만 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AI 모델 전역 변수 (서버 시작 시 1회 로딩)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
sentiment_analyzer = None
summarizer = None
translator = None

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Pydantic 모델 (요청/응답 스키마)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class SentimentRequest(BaseModel):
    text: str

class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 130
    min_length: int = 30

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str = "ko"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 서버 시작 이벤트 (모델 사전 로딩)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@app.on_event("startup")
async def startup_event():
    """서버 시작 (감성 분석만 사전 로딩, 나머지는 지연 로딩)"""
    global sentiment_analyzer
    
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("🚀 SyncView AI Service 시작 (메모리 최적화 모드)")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    try:
        # ✅ 감성 분석만 사전 로딩 (가장 많이 사용)
        logger.info("🔄 감성 분석 모델 로딩 중...")
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1,
            framework="pt"
        )
        gc.collect()
        logger.info("✅ 감성 분석 모델 로딩 완료")
        
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info("🎉 서버 준비 완료!")
        logger.info("💡 요약/번역 모델은 첫 요청 시 자동 로드 (10-20초)")
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
    except Exception as e:
        logger.error(f"❌ 모델 로딩 실패: {e}")
        raise

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# API 엔드포인트
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/")
def root():
    """헬스체크 엔드포인트"""
    return {
        "service": "SyncView AI Service",
        "status": "running",
        "version": "1.0.0",
        "models": {
            "sentiment": "loaded" if sentiment_analyzer else "not loaded",
            "summarize": "loaded" if summarizer else "not loaded",
            "translate": "loaded" if translator else "not loaded"
        }
    }

@app.get("/health")
def health():
    """상세 헬스체크"""
    return {
        "status": "healthy",
        "models_loaded": all([sentiment_analyzer, summarizer, translator])
    }

@app.post("/sentiment")
def analyze_sentiment(request: SentimentRequest):
    """감성 분석 API"""
    try:
        if not sentiment_analyzer:
            raise HTTPException(status_code=503, detail="감성 분석 모델이 로딩되지 않았습니다")
        
        text = request.text[:512]  # 최대 512 토큰
        result = sentiment_analyzer(text)[0]
        
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
        logger.error(f"❌ 감성 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=f"감성 분석 실패: {str(e)}")

@app.post("/summarize")
def summarize_text(request: SummarizeRequest):
    """텍스트 요약 API (지연 로딩)"""
    global summarizer
    
    try:
        # 지연 로딩: 모델이 없으면 로드
        if not summarizer:
            logger.info("🔄 요약 모델 지연 로딩 중... (첫 요청)")
            summarizer = pipeline(
                "summarization",
                model="sshleifer/distilbart-cnn-12-6",
                device=-1,
                framework="pt"
            )
            gc.collect()
            logger.info("✅ 요약 모델 로딩 완료")
        
        text = request.text[:1024]  # 최대 1024자
        
        if len(text.strip()) < 50:
            return {"summary": "텍스트가 너무 짧아 요약할 수 없습니다."}
        
        result = summarizer(
            text,
            max_length=request.max_length,
            min_length=request.min_length,
            do_sample=False
        )
        
        return {"summary": result[0]["summary_text"]}
        
    except Exception as e:
        logger.error(f"❌ 요약 실패: {e}")
        raise HTTPException(status_code=500, detail=f"요약 실패: {str(e)}")

@app.post("/translate")
def translate_text(request: TranslateRequest):
    """텍스트 번역 API (영어 → 한국어, 지연 로딩)"""
    global translator
    
    try:
        # 지연 로딩: 모델이 없으면 로드
        if not translator:
            logger.info("🔄 번역 모델 지연 로딩 중... (첫 요청)")
            from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
            model_name = "facebook/nllb-200-distilled-600M"
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            translator = {"tokenizer": tokenizer, "model": model}
            gc.collect()
            logger.info("✅ 번역 모델 로딩 완료")
        
        tokenizer = translator["tokenizer"]
        model = translator["model"]
        
        # NLLB 모델은 소스/타깃 언어 설정 필요
        tokenizer.src_lang = "eng_Latn"  # 영어
        
        # 텍스트를 작은 청크로 나누기 (700자씩)
        chunks = []
        text = request.text
        while text:
            chunk = text[:700]
            chunks.append(chunk)
            text = text[700:]
        
        # 각 청크 번역
        translated_chunks = []
        for chunk in chunks:
            inputs = tokenizer(chunk, return_tensors="pt", padding=True, truncation=True, max_length=512)
            
            # NLLB는 forced_bos_token_id로 타깃 언어 지정
            forced_bos_token_id = tokenizer.convert_tokens_to_ids("kor_Hang")  # 한국어
            
            with torch.no_grad():
                generated_tokens = model.generate(
                    **inputs,
                    forced_bos_token_id=forced_bos_token_id,
                    num_beams=4,
                    max_length=512,
                    early_stopping=True
                )
            
            translated = tokenizer.decode(generated_tokens[0], skip_special_tokens=True)
            translated_chunks.append(translated)
        
        return {"translated_text": " ".join(translated_chunks)}
        
    except Exception as e:
        logger.error(f"❌ 번역 실패: {e}")
        raise HTTPException(status_code=500, detail=f"번역 실패: {str(e)}")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 서버 실행
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)

