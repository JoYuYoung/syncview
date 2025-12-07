from database import engine, Base
from models import User, Bookmark, Subscription, ReadArticle

print("기존 테이블 삭제 중...")
Base.metadata.drop_all(bind=engine)
print("테이블 삭제 완료")

print("새로운 테이블 생성 중...")
Base.metadata.create_all(bind=engine)
print("테이블 생성 완료")
print("\n데이터베이스가 초기화되었습니다!")

