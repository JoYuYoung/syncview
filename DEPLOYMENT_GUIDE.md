# SyncView 배포 가이드

## 도메인: https://www.syncview.kr

---

## 📋 배포 개요

### 추천 배포 방식
- **프론트엔드**: Vercel (무료, 자동 배포, CDN)
- **백엔드**: Render 또는 Railway (무료 티어 제공)
- **데이터베이스**: Render PostgreSQL 또는 Supabase (무료)

---

## 🚀 1단계: 백엔드 배포 (Render)

### 1.1 Render 회원가입
1. https://render.com 접속
2. GitHub 계정으로 로그인
3. New → Web Service 선택

### 1.2 백엔드 배포 설정

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Environment Variables 설정:**
```
DATABASE_URL=postgresql://user:password@host:5432/syncview
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=https://www.syncview.kr
SECRET_KEY=your-super-secret-key-change-this
```

### 1.3 PostgreSQL 데이터베이스 생성
1. Render Dashboard → New → PostgreSQL
2. 데이터베이스 이름: `syncview-db`
3. 생성 후 `Internal Database URL` 복사
4. 백엔드 서비스의 `DATABASE_URL`에 붙여넣기

### 1.4 배포 URL 확인
- 배포 완료 후 URL: `https://syncview-backend.onrender.com` (예시)
- 이 URL을 복사해두세요!

---

## 🌐 2단계: 프론트엔드 배포 (Vercel)

### 2.1 Vercel 회원가입
1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. Import Project 선택

### 2.2 프로젝트 설정

**Framework Preset:** Vite

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
dist
```

**Environment Variables 설정:**
```
VITE_API_URL=https://syncview-backend.onrender.com
```
(↑ 1.4에서 확인한 백엔드 URL을 입력하세요)

### 2.3 배포
1. Deploy 버튼 클릭
2. 배포 완료 대기 (약 1-2분)
3. 배포 URL 확인: `https://your-project.vercel.app`

---

## 🔗 3단계: 도메인 연결

### 3.1 Vercel에 커스텀 도메인 추가

1. Vercel 프로젝트 → Settings → Domains
2. `www.syncview.kr` 입력 후 Add
3. `syncview.kr` 입력 후 Add

### 3.2 후이즈도메인에서 DNS 설정

**A 레코드 설정:**
```
Type: A
Name: @
Value: 76.76.21.21 (Vercel IP)
TTL: 자동
```

**CNAME 레코드 설정:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 자동
```

### 3.3 DNS 전파 대기
- 보통 10분~1시간 소요
- https://dnschecker.org 에서 전파 상태 확인

---

## ✅ 4단계: 최종 확인

### 4.1 백엔드 헬스 체크
```bash
curl https://syncview-backend.onrender.com/health
```

**응답 예시:**
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "translation": "healthy"
  }
}
```

### 4.2 프론트엔드 접속
1. https://www.syncview.kr 접속
2. 회원가입/로그인 테스트
3. 뉴스 불러오기 테스트
4. 요약/번역 테스트

---

## 🛠️ 배포 파일 준비

### 프론트엔드 로컬 환경 변수 파일 생성

`syncview_frontend/.env` 파일 생성:
```
VITE_API_URL=http://127.0.0.1:8000
```

`syncview_frontend/.env.production` 파일 생성:
```
VITE_API_URL=https://syncview-backend.onrender.com
```

### 백엔드 환경 변수 파일 생성

`syncview_backend/.env` 파일 생성:
```
DATABASE_URL=postgresql://user:password@localhost:5432/syncview
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:5173
SECRET_KEY=your-super-secret-key-change-this
```

---

## 📝 배포 체크리스트

### 백엔드
- [ ] requirements.txt 최신화
- [ ] 환경 변수 설정 완료
- [ ] PostgreSQL 데이터베이스 연결
- [ ] CORS 설정에 프론트엔드 도메인 추가
- [ ] /health 엔드포인트 정상 작동

### 프론트엔드
- [ ] API URL 환경 변수로 변경
- [ ] 빌드 테스트 (npm run build)
- [ ] Vercel 배포 완료
- [ ] 커스텀 도메인 연결

### 도메인
- [ ] DNS A 레코드 추가
- [ ] DNS CNAME 레코드 추가
- [ ] SSL 인증서 자동 발급 확인 (Vercel 자동)
- [ ] https://www.syncview.kr 접속 확인

---

## 🔄 자동 배포 설정 (선택)

### GitHub Actions (CI/CD)

`.github/workflows/deploy.yml` 생성:
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      # 프론트엔드 배포는 Vercel이 자동으로 처리
      
      # 백엔드 배포는 Render가 자동으로 처리
```

---

## 💡 추가 권장 사항

### 1. 환경 분리
- 개발(dev), 스테이징(staging), 프로덕션(production) 환경 분리
- 각 환경별 별도 데이터베이스 사용

### 2. 모니터링
- Sentry: 에러 추적
- Google Analytics: 사용자 분석
- Render 로그: 백엔드 로그 확인

### 3. 성능 최적화
- 프론트엔드: Code Splitting, Lazy Loading
- 백엔드: Redis 캐싱, DB 인덱싱
- CDN: Vercel이 자동 제공

### 4. 보안
- SECRET_KEY 강력하게 변경
- HTTPS 강제 사용
- API Rate Limiting 추가

---

## 🆘 문제 해결

### "CORS 에러" 발생
→ 백엔드 `main.py`의 `origins`에 프론트엔드 도메인 추가 확인

### "API 연결 실패"
→ `VITE_API_URL` 환경 변수 확인, 백엔드 서버 상태 확인

### "데이터베이스 연결 실패"
→ `DATABASE_URL` 확인, PostgreSQL 서비스 상태 확인

### "도메인 접속 안 됨"
→ DNS 전파 대기 (최대 24시간), DNS 레코드 재확인

---

## 📞 지원

- Vercel 문서: https://vercel.com/docs
- Render 문서: https://render.com/docs
- FastAPI 배포: https://fastapi.tiangolo.com/deployment/

---

**배포 성공을 기원합니다! 🚀**

