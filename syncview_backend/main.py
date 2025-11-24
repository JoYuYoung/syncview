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

# ✅ 앱 시작 시 AI 모델 미리 로드 (Instance Type 변경 후 활성화)
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 모든 AI 모델을 미리 로드"""
    import logging
    logger = logging.getLogger(__name__)
    
    # 임시로 비활성화: Live 상태 만든 후 Instance Type을 Professional로 변경하세요!
    logger.info("⏭️ AI 모델 사전 로드 건너뜀 (Instance Type 변경 필요)")
    logger.info("📝 1단계: 서버 Live 후 Settings → Instance Type → Professional 선택")
    logger.info("📝 2단계: 이 주석을 제거하고 다시 배포")
    return
    
    # 아래 코드는 Professional 플랜 (8GB) 적용 후 활성화
    try:
        logger.info("🚀 AI 모델 사전 로드 시작...")
        
        # 감성 분석 모델 로드
        from routes.news import _get_sentiment_analyzer
        _get_sentiment_analyzer()
        logger.info("✅ 감성 분석 모델 로드 완료")
        
        # 요약 모델 로드
        from routes.news import _get_summarizer
        _get_summarizer()
        logger.info("✅ 요약 모델 로드 완료")
        
        # 번역 모델 로드
        from translator_hf import translate_en_to_ko
        translate_en_to_ko("test")  # 더미 호출로 모델 로드
        logger.info("✅ 번역 모델 로드 완료")
        
        logger.info("🎉 모든 AI 모델 사전 로드 완료!")
    except Exception as e:
        logger.error(f"❌ AI 모델 로드 실패: {e}")

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