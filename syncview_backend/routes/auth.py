from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from passlib.hash import bcrypt
from database import SessionLocal
from models import User
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import os
from typing import Optional

router = APIRouter()

# OAuth 설정
config = Config(environ=os.environ)
oauth = OAuth(config)

# .env 파일에서 환경 변수 로드
from dotenv import load_dotenv
load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback"
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# 📌 요청 바디 스키마 정의
class RegisterRequest(BaseModel):
  username: str
  password: str
  email: EmailStr   # 이메일 형식 자동 검증
  interest: str | None = None  # 선택사항


class LoginRequest(BaseModel):
  email: EmailStr
  password: str


# 🔥 회원 탈퇴용 스키마
class DeleteUserRequest(BaseModel):
  user_id: int


def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


# 회원가입
@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
  if db.query(User).filter(User.username == req.username).first():
    raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
  if db.query(User).filter(User.email == req.email).first():
    raise HTTPException(status_code=400, detail="이미 존재하는 이메일입니다.")

  hashed_pw = bcrypt.hash(req.password)
  new_user = User(
      username=req.username,
      password=hashed_pw,
      email=req.email,
      interest=req.interest,
  )
  db.add(new_user)
  db.commit()
  db.refresh(new_user)
  return {"msg": "회원가입 성공", "user_id": new_user.id}


# 로그인 (이메일 + 비밀번호)
@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
  user = db.query(User).filter(User.email == req.email).first()
  if not user or not bcrypt.verify(req.password, user.password):
    raise HTTPException(status_code=400, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
  return {
      "msg": "로그인 성공",
      "user_id": user.id,
      "email": user.email,
      "username": user.username,
  }


# 🔥 회원 탈퇴
@router.delete("/delete-account")
def delete_account(req: DeleteUserRequest, db: Session = Depends(get_db)):
  """
  간단한 회원 탈퇴 API (데모용)
  - 요청 바디: { "user_id": 1 }
  """
  user = db.query(User).filter(User.id == req.user_id).first()
  if not user:
    raise HTTPException(status_code=404, detail="존재하지 않는 사용자입니다.")

  # TODO: 북마크, 뉴스 기록 등 User에 FK 걸린 테이블이 있으면
  # ON DELETE CASCADE 또는 여기서 같이 삭제해줘야 함.
  db.delete(user)
  db.commit()

  return {"msg": "회원 탈퇴가 완료되었습니다."}


# Google OAuth 로그인 시작
@router.get("/google")
async def google_login(request: Request):
  """Google OAuth 로그인 페이지로 리다이렉트"""
  redirect_uri = GOOGLE_REDIRECT_URI
  return await oauth.google.authorize_redirect(request, redirect_uri)

# Google OAuth 콜백
@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
  """Google OAuth 콜백 처리"""
  try:
    # Google에서 토큰 받기
    token = await oauth.google.authorize_access_token(request)

    # 사용자 정보 가져오기
    user_info = token.get("userinfo")

    if not user_info:
      raise HTTPException(status_code=400, detail="사용자 정보를 가져올 수 없습니다.")

    email = user_info.get("email")
    name = user_info.get("name")
    google_id = user_info.get("sub")

    # 기존 사용자 확인
    user = db.query(User).filter(User.email == email).first()

    if not user:
      # 새로운 사용자 생성 (Google 로그인은 비밀번호 없음)
      user = User(
          username=name or email.split("@")[0],
          email=email,
          password=bcrypt.hash(google_id),  # Google ID를 해시화하여 저장
          interest=None,  # 선택사항
      )
      db.add(user)
      db.commit()
      db.refresh(user)

    # 세션에 사용자 정보 저장 (민감 정보 노출 방지)
    request.session["user_id"] = user.id
    request.session["email"] = user.email
    request.session["username"] = user.username
    request.session["google_auth"] = "success"

    # 프론트엔드로 리다이렉트 (사용자 정보 없이)
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback")

  except Exception as e:
    print(f"Google OAuth 에러: {str(e)}")
    raise HTTPException(status_code=400, detail=f"Google 로그인 실패: {str(e)}")


# 세션에서 사용자 정보 가져오기
@router.get("/session")
async def get_session(request: Request):
  """세션에서 사용자 정보 조회 (Google OAuth 콜백 후 사용)"""
  user_id = request.session.get("user_id")
  email = request.session.get("email")
  username = request.session.get("username")
  google_auth = request.session.get("google_auth")

  if not user_id:
    raise HTTPException(status_code=401, detail="세션 정보가 없습니다.")

  # 세션 정보 반환 후 세션 클리어 (일회용)
  request.session.clear()

  return {
      "user_id": user_id,
      "email": email,
      "username": username,
      "google_auth": google_auth
  }
