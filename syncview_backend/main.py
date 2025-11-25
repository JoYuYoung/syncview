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

# ✅ 서버 시작 이벤트 (Cloud Run AI 서비스 연동 모드)
@app.on_event("startup")
async def startup_event():
    """서버 시작 (로컬 AI vs Cloud Run AI 분기 처리)"""
    import logging
    import os
    logger = logging.getLogger(__name__)
    
    # 환경 변수: USE_LOCAL_AI (기본값: false)
    # "true"로 설정하면 로컬에서 AI 모델 로딩 (개발/테스트용)
    # 설정하지 않으면 Cloud Run AI 서비스 사용 (프로덕션)
    USE_LOCAL_AI = os.getenv("USE_LOCAL_AI", "false").lower() == "true"
    
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("🚀 SyncView 백엔드 서버 시작")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    if USE_LOCAL_AI:
        # ✅ 로컬 AI 모델 사용 (개발/테스트 환경)
        logger.info("🏠 AI 모드: 로컬 모델 (USE_LOCAL_AI=true)")
        logger.info("💡 감성 분석 모델을 로컬에서 로딩합니다...")
        
        try:
            import psutil
            process = psutil.Process(os.getpid())
            mem_before = process.memory_info().rss / 1024 / 1024
            
            logger.info("🔄 감성 분석 모델 로딩 중... (~268MB)")
            from routes.news import _get_sentiment_analyzer
            _get_sentiment_analyzer()
            
            mem_after = process.memory_info().rss / 1024 / 1024
            logger.info(f"✅ 감성 분석 모델 로딩 완료 (+{mem_after - mem_before:.1f} MB)")
            logger.info(f"📊 현재 메모리: {mem_after:.1f} MB")
        except Exception as e:
            logger.error(f"❌ 로컬 AI 모델 로딩 실패: {e}")
            logger.warning("⚠️  감성 분석 기능이 작동하지 않을 수 있습니다")
    else:
        # ☁️ Cloud Run AI 서비스 사용 (프로덕션 환경)
        logger.info("☁️  AI 모드: Cloud Run 마이크로서비스 (USE_LOCAL_AI=false)")
        logger.info("💡 AI 기능 전략:")
        logger.info("   - 감성 분석: Cloud Run AI 서비스 → 메모리 0MB")
        logger.info("   - 요약: Hugging Face Inference API → 메모리 0MB")
        logger.info("   - 번역: Hugging Face Inference API → 메모리 0MB")
        logger.info("   - 💾 Render 메모리 사용량: ~100MB (AI 모델 없음)")
        logger.info("   - 🎯 안정적인 2GB RAM 운영")
    
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("✅ 서버 준비 완료!")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

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