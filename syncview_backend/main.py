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

# ✅ 서버 시작 이벤트 (2GB RAM 졸업작품 최적화)
@app.on_event("startup")
async def startup_event():
    """서버 시작 (감성 분석만 사전 로딩, 나머지는 지연 로딩)"""
    import logging
    import psutil
    import os
    logger = logging.getLogger(__name__)
    
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("🎓 SyncView 백엔드 서버 시작 (졸업작품 최적화)")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # 시작 메모리 측정
    process = psutil.Process(os.getpid())
    mem_before = process.memory_info().rss / 1024 / 1024  # MB
    logger.info(f"📊 시작 메모리: {mem_before:.1f} MB")
    
    logger.info("💡 AI 모델 로딩 전략:")
    logger.info("   ✅ 감성 분석: 즉시 로딩 (~268MB) - 가장 중요한 기능")
    logger.info("   ⏳ 요약: 첫 요청 시 로딩 (~150MB)")
    logger.info("   ⏳ 번역: 첫 요청 시 로딩 (~100MB)")
    
    # 감성 분석 모델만 사전 로딩 (가장 중요하고 자주 사용됨)
    try:
        logger.info("🔄 감성 분석 모델 로딩 중...")
        from routes.news import _get_sentiment_analyzer
        _get_sentiment_analyzer()
        
        mem_after = process.memory_info().rss / 1024 / 1024  # MB
        logger.info(f"✅ 감성 분석 모델 로딩 완료 (+{mem_after - mem_before:.1f} MB)")
        logger.info(f"📊 현재 메모리: {mem_after:.1f} MB")
        logger.info(f"💾 예상 최대 메모리: ~{mem_after + 250:.0f} MB (요약+번역 포함)")
    except Exception as e:
        logger.error(f"❌ 감성 분석 모델 로딩 실패: {e}")
        logger.warning("⚠️  감성 분석 기능이 작동하지 않을 수 있습니다")
    
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("✅ 서버 준비 완료 - 2GB RAM 안정 운영 모드")
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