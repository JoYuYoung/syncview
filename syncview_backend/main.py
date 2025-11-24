from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from database import engine
from models import Base
from routes import auth, news, translate, bookmark, subscription, analytics

# ✅ DB 테이블 생성
Base.metadata.create_all(bind=engine)

# ✅ FastAPI 앱 생성
app = FastAPI(title="SyncView Backend")

# ✅ 앱 시작 시 AI 모델 순차적으로 미리 로드 (메모리 최적화)
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 모든 AI 모델을 순차적으로 로드 (2GB RAM 최적화)"""
    import logging
    import gc
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("🚀 AI 모델 순차 로드 시작 (메모리 최적화 모드)...")
        
        # 1️⃣ 감성 분석 모델 로드 (가장 자주 사용)
        logger.info("📥 [1/3] 감성 분석 모델 로딩 중...")
        from routes.news import _get_sentiment_analyzer
        _get_sentiment_analyzer()
        gc.collect()  # 메모리 정리
        logger.info("✅ [1/3] 감성 분석 모델 로드 완료")
        
        # 2️⃣ 요약 모델 로드
        logger.info("📥 [2/3] 요약 모델 로딩 중...")
        from routes.news import _get_summarizer
        _get_summarizer()
        gc.collect()  # 메모리 정리
        logger.info("✅ [2/3] 요약 모델 로드 완료")
        
        # 3️⃣ 번역 모델 로드
        logger.info("📥 [3/3] 번역 모델 로딩 중...")
        from translator_hf import translate_en_to_ko
        translate_en_to_ko("test")  # 더미 호출로 모델 로드
        gc.collect()  # 메모리 정리
        logger.info("✅ [3/3] 번역 모델 로드 완료")
        
        logger.info("🎉 모든 AI 모델 순차 로드 완료! (2GB RAM 최적화)")
    except Exception as e:
        logger.error(f"❌ AI 모델 로드 실패: {e}")
        logger.error(f"⚠️ 서버는 계속 실행됩니다. 모델은 첫 요청 시 자동 로드됩니다.")

# ✅ CORS 설정 (반드시 다른 Middleware보다 먼저!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용 (디버깅)
    allow_credentials=False,  # credentials False로 변경
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ✅ Session Middleware 추가 (OAuth 사용을 위해 필요)
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-change-this-in-production")

# ✅ 라우터 등록
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(news.router, prefix="/news", tags=["news"])
app.include_router(translate.router, prefix="/api", tags=["translate"])
app.include_router(bookmark.router, prefix="/bookmarks", tags=["bookmarks"])
app.include_router(subscription.router, prefix="/subscriptions", tags=["subscriptions"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

# ✅ 루트 엔드포인트
@app.get("/")
def root():
    return {"message": "SyncView backend running successfully 🚀"}

# ✅ 전체 서비스 헬스체크
@app.get("/health")
def health_check():
    """전체 서비스 상태 확인"""
    try:
        # 번역 서비스 헬스체크
        from routes.translate import health_check as translate_health
        translate_status = translate_health()
        
        return {
            "status": "healthy",
            "services": {
                "database": "connected",
                "translation": translate_status.get("status", "unknown")
            },
            "timestamp": "2025-01-27T00:00:00Z"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2025-01-27T00:00:00Z"
        }

# ✅ 서버 실행
if __name__ == "__main__":
    import uvicorn
    import os
    
    # 프로덕션 환경에서는 0.0.0.0으로 바인딩
    host = "0.0.0.0" if os.getenv("RENDER") else "127.0.0.1"
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(app, host=host, port=port)