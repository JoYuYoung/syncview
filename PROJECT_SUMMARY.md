# 🌐 SyncView 프로젝트 완전 가이드

안녕하세요! 우리 프로젝트 **SyncView**에 대해 처음부터 끝까지 설명드리겠습니다.

---

## 📌 프로젝트 개요

**SyncView**는 AI 기반 뉴스 분석 웹 애플리케이션입니다. 
BBC 뉴스를 실시간으로 수집하고, AI를 활용해 요약/번역/감성 분석을 제공하며, 
사용자 맞춤형 뉴스 추천과 데이터 시각화 대시보드를 제공합니다.

---

## 🎯 핵심 기능

### 1. **회원 관리 시스템**
- 회원가입 / 로그인 (이메일 기반)
- 비밀번호 암호화 (bcrypt)
- 관심 분야 선택 (경제, 정치, 연예)
- 프로필 관리

### 2. **실시간 뉴스 피드**
- BBC RSS 피드 실시간 크롤링
- 뉴스 목록 표시 (제목, 요약, 썸네일, 발행 시간)
- 추천 뉴스 필터링
- 중복/유사 기사 표시

### 3. **AI 뉴스 분석**
- **자동 요약**: Hugging Face BART 모델 (facebook/bart-large-cnn)
- **번역**: Helsinki-NLP Marian 모델 (영어→한국어)
- **감성 분석**: 긍정/부정/중립 자동 분류
- 유사 기사 추천

### 4. **📊 데이터 시각화 대시보드** (신규 추가!)
- **감성 분석 통계**: 도넛 차트로 긍정/부정/중립 비율 표시
- **시간대별 트렌드**: 라인 차트로 감성 추이 분석
- **읽기 활동 통계**: 바 차트로 일별 읽은 기사 수 표시
- **카테고리별 분포**: 주제별 기사 수 비교
- **AI 인사이트**: 데이터 기반 자동 인사이트 생성
- **통계 카드**: 총 읽은 기사, 긍정 비율, 인기 카테고리, 읽기 속도

### 5. **사용자 기능**
- 북마크 저장
- 뉴스 구독 설정
- 알림 시스템
- 맞춤형 뉴스 큐레이션

---

## 🛠️ 기술 스택

### **백엔드 (Python)**

#### 프레임워크 & 서버
- **FastAPI**: 고성능 웹 프레임워크
- **Uvicorn**: ASGI 서버
- **SQLAlchemy**: ORM (데이터베이스 관리)
- **Pydantic**: 데이터 검증

#### 데이터베이스
- **PostgreSQL** (psycopg2-binary)

#### 보안
- **Passlib + bcrypt**: 비밀번호 해싱
- **CORS Middleware**: 크로스 오리진 처리

#### AI/ML 라이브러리
- **PyTorch**: 딥러닝 프레임워크
- **Transformers (Hugging Face)**: 사전 학습된 NLP 모델
  - BART (요약)
  - Marian (번역)
- **SentencePiece**: 토크나이저
- **SafeTensors**: 모델 가중치 저장

#### 웹 스크래핑
- **BeautifulSoup4**: HTML 파싱
- **Feedparser**: RSS 피드 파싱
- **Requests**: HTTP 요청

---

### **프론트엔드 (JavaScript/React)**

#### 프레임워크 & 라이브러리
- **React 18.3.1**: UI 라이브러리
- **React Router DOM 6.30.1**: 클라이언트 라우팅
- **Vite**: 빌드 도구 (초고속)

#### UI/UX
- **TailwindCSS 3.4.17**: 유틸리티 CSS 프레임워크
- **PostCSS + Autoprefixer**: CSS 후처리
- **글래스모피즘 디자인**: 반투명 효과
- **그라데이션 배경**: 다채로운 색상 조합
- **애니메이션**: 호버 효과, 블롭 애니메이션

#### 데이터 시각화
- **Recharts 3.3.0**: React 전용 차트 라이브러리
  - PieChart (도넛 차트)
  - LineChart (라인 차트)
  - BarChart (바 차트)
  - 인터랙티브 툴팁
  - 반응형 디자인

---

## 📂 프로젝트 구조

```
project/
├── syncview_backend/          # 백엔드 (FastAPI)
│   ├── main.py               # FastAPI 앱 진입점
│   ├── database.py           # DB 연결 설정
│   ├── requirements.txt      # Python 의존성
│   ├── models/              # DB 모델
│   │   ├── user.py          # 사용자 모델
│   │   └── news.py          # 뉴스 모델
│   ├── routes/              # API 라우터
│   │   ├── auth.py          # 회원가입/로그인
│   │   ├── news.py          # 뉴스 크롤링/요약
│   │   └── translate.py     # 번역 API
│   └── translator_hf.py     # Hugging Face 번역기
│
└── syncview_frontend/        # 프론트엔드 (React)
    ├── src/
    │   ├── App.jsx          # 라우팅 설정
    │   ├── main.jsx         # React 진입점
    │   ├── index.css        # 전역 스타일
    │   ├── pages/           # 페이지 컴포넌트
    │   │   ├── Welcome.jsx      # 랜딩 페이지
    │   │   ├── Login.jsx        # 로그인
    │   │   ├── Register.jsx     # 회원가입
    │   │   ├── NewsFeed.jsx     # 뉴스 피드 (메인)
    │   │   ├── Analytics.jsx    # 📊 분석 대시보드 (신규!)
    │   │   ├── Bookmark.jsx     # 북마크
    │   │   ├── Subscription.jsx # 구독 설정
    │   │   ├── Notification.jsx # 알림
    │   │   └── Profile.jsx      # 프로필
    │   ├── components/      # 재사용 컴포넌트
    │   │   ├── Logo.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── NewsCard.jsx
    │   │   ├── SentimentBadge.jsx    # 감성 표시
    │   │   ├── RecommendedBadge.jsx  # 추천 배지
    │   │   ├── DuplicateIndicator.jsx # 중복 표시
    │   │   └── RelatedNews.jsx       # 유사 기사
    │   └── services/
    │       └── api.js       # API 호출 함수
    ├── package.json         # Node.js 의존성
    ├── vite.config.js       # Vite 설정
    └── tailwind.config.js   # Tailwind 설정
```

---

## 🔄 데이터 흐름 (아키텍처)

### 1. **뉴스 수집 플로우**
```
BBC RSS Feed → FastAPI (feedparser) → React (NewsFeed.jsx)
```

### 2. **AI 요약 플로우**
```
사용자 클릭 → API 요청 → BeautifulSoup (본문 추출) 
→ BART 모델 (요약) → React (요약 표시)
```

### 3. **번역 플로우**
```
요약 텍스트 → API 요청 → Marian 모델 (영→한) 
→ React (번역 표시)
```

### 4. **감성 분석 플로우**
```
요약 텍스트 → 키워드 분석 → 긍정/부정/중립 분류 
→ 대시보드 (통계 시각화)
```

---

## 🎨 UI/UX 디자인 특징

### 스타일링
- **Tailwind CSS**: 유틸리티 클래스 기반
- **그라데이션 배경**: `bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100`
- **글래스모피즘**: `backdrop-blur-lg bg-white/80`
- **블롭 애니메이션**: 부드러운 배경 움직임
- **호버 효과**: `hover:scale-105 transition-all duration-200`

### 색상 시스템
- **메인 컬러**: 블루(#3B82F6), 인디고(#6366F1)
- **감성 컬러**:
  - 긍정: 그린(#10B981)
  - 중립: 그레이(#6B7280)
  - 부정: 레드(#EF4444)
- **Analytics 페이지**: 퍼플-핑크 그라데이션

---

## 🚀 실행 방법

### 백엔드 실행
```bash
cd syncview_backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### 프론트엔드 실행
```bash
cd syncview_frontend
npm install
npm run dev
```

### 접속
- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:8000
- API 문서: http://localhost:8000/docs

---

## 📊 Analytics 대시보드 상세 (신규 기능!)

### 구성 요소

#### 1. **통계 카드 (4개)**
- 총 읽은 기사, 긍정 비율, 인기 카테고리, 읽기 속도
- 아이콘 + 숫자 + 설명
- 호버 시 3D 효과 (`hover:scale-105`)

#### 2. **감성 분석 통계 (도넛 차트)**
- Recharts PieChart 사용
- innerRadius로 도넛 모양 구현
- 긍정/중립/부정 비율 표시
- 커스텀 색상: 그린/그레이/레드
- 인터랙티브 툴팁

#### 3. **읽기 활동 통계 (바 차트)**
- 요일별 읽은 기사 수
- 퍼플 색상 (`#8B5CF6`)
- 라운드 모서리 (`radius={[8, 8, 0, 0]}`)

#### 4. **시간대별 감성 트렌드 (라인 차트)**
- 3개 라인 (긍정/중립/부정)
- 각 라인마다 다른 색상
- 순차적 애니메이션 (800ms, 1000ms, 1200ms)
- CartesianGrid로 그리드 표시

#### 5. **카테고리별 분포 (가로 바 차트)**
- 주제별 기사 수 비교
- 핑크 색상 (`#EC4899`)
- 가로 방향 (`layout="vertical"`)

#### 6. **AI 인사이트 카드 (3개)**
- 긍정 뉴스 증가
- 읽기 목표 달성
- 인기 시간대
- 각 카드마다 다른 색상 테마

---

## 🔐 보안 기능

1. **비밀번호 암호화**: bcrypt 해싱
2. **CORS 설정**: 허용된 오리진만 접근
3. **이메일 검증**: Pydantic EmailStr
4. **SQL Injection 방지**: SQLAlchemy ORM

---

## 🌟 주요 특징

1. **반응형 디자인**: 모바일/태블릿/데스크톱 최적화
2. **실시간 업데이트**: RSS 피드 자동 갱신
3. **AI 기반**: 최신 NLP 모델 활용
4. **사용자 중심**: 직관적인 UI/UX
5. **고성능**: Vite + FastAPI로 빠른 응답
6. **확장성**: 모듈화된 구조
7. **데이터 시각화**: 인터랙티브 차트

---

## 📈 향후 확장 가능성

1. **실시간 감성 분석**: 댓글/리뷰 분석
2. **다국어 지원**: 더 많은 언어 번역
3. **소셜 기능**: 기사 공유/댓글
4. **알림 시스템**: Push 알림
5. **개인화 추천**: 머신러닝 기반
6. **모바일 앱**: React Native 포팅
7. **더 많은 뉴스 소스**: CNN, NYTimes 등

---

## 🎯 프로젝트 목표 달성

✅ 뉴스 자동 수집 및 분석
✅ AI 기반 요약/번역
✅ 사용자 맞춤형 추천
✅ 감성 분석 및 시각화
✅ 직관적인 UI/UX
✅ 확장 가능한 아키텍처

---

## 💡 기술적 하이라이트

### 백엔드
- FastAPI의 비동기 처리로 고성능 구현
- Transformers 지연 로딩으로 메모리 효율화
- SQLAlchemy로 DB 추상화

### 프론트엔드
- React Hooks로 상태 관리
- Vite로 빠른 개발 환경
- TailwindCSS로 일관된 디자인
- Recharts로 전문적인 데이터 시각화

### AI/ML
- BART: 최신 요약 모델
- Marian: 경량 번역 모델
- 지연 로딩: 필요할 때만 모델 로드

---

이것이 우리 **SyncView** 프로젝트의 완전한 설명입니다! 🚀

질문이나 추가 설명이 필요하면 언제든 물어보세요.



