from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# PostgreSQL 연결 정보 (환경 변수에서 읽기, 없으면 로컬 개발 환경 사용)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:2048@localhost:5432/syncview")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """DB 세션 의존성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()