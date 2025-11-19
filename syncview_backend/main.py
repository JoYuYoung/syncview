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

# ✅ CORS 설정 (반드시 다른 Middleware보다 먼저!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://www.syncview.kr",
        "https://syncview.kr",
        "https://syncview-blond.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
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