# SyncView 시스템 아키텍처

## 전체 시스템 구성도

```mermaid
flowchart TB
    %% 사용자
    User["👤 사용자<br/>(브라우저)"]
    
    %% 프론트엔드 레이어
    subgraph Presentation["🎨 Presentation Layer (프론트엔드)"]
        direction TB
        Frontend["React 18.3 + Vite<br/>TailwindCSS + Recharts<br/><br/>www.syncview.kr"]
    end
    
    %% 백엔드 레이어
    subgraph Backend["⚙️ Business Logic Layer (백엔드 API)"]
        direction TB
        API["FastAPI + uvicorn<br/><br/>syncview.onrender.com"]
        
        subgraph Routes["📂 Routes"]
            Auth["🔐 auth.py<br/>- 회원가입/로그인<br/>- Google OAuth"]
            News["📰 news.py<br/>- 뉴스 크롤링<br/>- 추천 시스템<br/>- 감성 분석"]
            Translate["🌐 translate.py<br/>- 번역"]
            Bookmark["🔖 bookmark.py<br/>- 북마크 관리"]
            Subscription["⚙️ subscription.py<br/>- 구독 설정"]
            Analytics["📊 analytics.py<br/>- 분석 대시보드"]
        end
    end
    
    %% 외부 데이터 소스
    subgraph DataSources["📡 External Data Sources"]
        BBC["BBC RSS<br/>feeds.bbci.co.uk"]
        Reuters["Reuters RSS<br/>Google News API"]
        CNN["CNN RSS<br/>rss.cnn.com"]
        GoogleOAuth["Google OAuth 2.0<br/>accounts.google.com"]
    end
    
    %% AI 서비스
    subgraph AIService["🤖 AI Service (Cloud Run)"]
        direction TB
        AIServer["FastAPI + Transformers<br/><br/>asia-northeast3"]
        
        subgraph AIModels["AI 모델"]
            BART["DistilBART<br/>(요약)<br/>sshleifer/distilbart-cnn-12-6"]
            NLLB["NLLB<br/>(번역)<br/>facebook/nllb-200-distilled-600M"]
        end
        
        LocalAI["DistilBERT<br/>(감성 분석)<br/>distilbert-base-uncased"]
        TFIDF["TF-IDF<br/>(유사도 분석)<br/>scikit-learn"]
    end
    
    %% 데이터베이스
    subgraph Database["💾 Database"]
        direction TB
        DB[(PostgreSQL<br/>+ SQLAlchemy)]
        
        subgraph Tables["테이블"]
            Users["users<br/>사용자 정보"]
            Subscriptions["subscriptions<br/>구독 설정"]
            Bookmarks["bookmarks<br/>북마크"]
            ReadArticles["read_articles<br/>읽기 기록"]
        end
    end
    
    %% 연결 관계
    User -->|"HTTPS<br/>브라우저 접속"| Frontend
    Frontend -->|"REST API<br/>JSON"| API
    
    API --> Auth
    API --> News
    API --> Translate
    API --> Bookmark
    API --> Subscription
    API --> Analytics
    
    %% OAuth 흐름
    Auth -->|"OAuth 인증 요청"| GoogleOAuth
    GoogleOAuth -->|"Access Token"| Auth
    Auth -->|"사용자 정보 저장"| DB
    
    %% 뉴스 크롤링
    News -->|"RSS 파싱"| BBC
    News -->|"RSS 파싱"| Reuters
    News -->|"RSS 파싱"| CNN
    
    %% AI 분석
    News -->|"요약 요청"| AIServer
    Translate -->|"번역 요청"| AIServer
    AIServer --> BART
    AIServer --> NLLB
    
    News -->|"로컬 AI"| LocalAI
    News -->|"TF-IDF"| TFIDF
    
    %% 데이터베이스 연결
    Bookmark --> DB
    Subscription --> DB
    Analytics --> DB
    DB --> Users
    DB --> Subscriptions
    DB --> Bookmarks
    DB --> ReadArticles
    
    %% 스타일
    classDef userStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
    classDef frontendStyle fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
    classDef backendStyle fill:#FF6B6B,stroke:#C92A2A,stroke-width:2px,color:#fff
    classDef dataStyle fill:#FFD93D,stroke:#C9A700,stroke-width:2px,color:#333
    classDef aiStyle fill:#A78BFA,stroke:#6D28D9,stroke-width:2px,color:#fff
    classDef dbStyle fill:#60A5FA,stroke:#1E40AF,stroke-width:2px,color:#fff
    
    class User userStyle
    class Frontend frontendStyle
    class API,Auth,News,Translate,Bookmark,Subscription,Analytics backendStyle
    class BBC,Reuters,CNN,GoogleOAuth dataStyle
    class AIServer,BART,NLLB,LocalAI,TFIDF aiStyle
    class DB,Users,Subscriptions,Bookmarks,ReadArticles dbStyle
```

---

## 상세 데이터 흐름

### 1. 뉴스 크롤링 및 표시 흐름

```mermaid
sequenceDiagram
    actor User as 👤 사용자
    participant FE as 🎨 프론트엔드
    participant BE as ⚙️ 백엔드 API
    participant RSS as 📡 RSS Feeds
    participant AI as 🤖 AI Service
    
    User->>FE: NewsFeed 페이지 접속
    FE->>BE: GET /news/news?source=BBC
    BE->>RSS: RSS Feed 요청
    RSS-->>BE: XML 데이터
    BE->>BE: feedparser로 파싱<br/>HTML 태그 제거
    BE-->>FE: TOP 10 뉴스 (JSON)
    
    loop 각 뉴스
        FE->>BE: POST /news/sentiment
        BE->>AI: 감성 분석 요청 (로컬)
        AI-->>BE: positive/negative/neutral
        BE-->>FE: 감성 분석 결과
    end
    
    FE->>User: 뉴스 카드 표시<br/>(제목, 요약, 감성 배지)
```

---

### 2. AI 요약 및 번역 흐름

```mermaid
sequenceDiagram
    actor User as 👤 사용자
    participant FE as 🎨 프론트엔드
    participant BE as ⚙️ 백엔드 API
    participant CloudRun as ☁️ Cloud Run AI
    participant Model as 🤖 AI 모델
    
    rect rgb(200, 230, 255)
        Note over User,Model: 요약 요청
        User->>FE: "요약 보기" 클릭
        FE->>BE: GET /news/summary?text=...
        BE->>CloudRun: POST /summarize
        
        alt Cold Start (첫 요청)
            CloudRun->>CloudRun: 컨테이너 시작 (5-10초)
            CloudRun->>Model: DistilBART 로딩 (30-40초)
        else Warm Start
            Note over CloudRun,Model: 이미 로딩됨
        end
        
        CloudRun->>Model: 요약 생성
        Model-->>CloudRun: 요약 텍스트
        CloudRun-->>BE: JSON 응답
        BE-->>FE: 요약 텍스트
        FE->>User: 요약 표시
    end
    
    rect rgb(255, 230, 200)
        Note over User,Model: 번역 요청
        User->>FE: "번역" 버튼 클릭
        FE->>BE: POST /translate/translate
        BE->>CloudRun: POST /translate
        CloudRun->>Model: NLLB 번역
        Model-->>CloudRun: 번역 텍스트
        CloudRun-->>BE: JSON 응답
        BE-->>FE: 번역 텍스트
        FE->>User: 번역 표시
    end
```

---

### 3. 추천 뉴스 알고리즘 흐름

```mermaid
flowchart TD
    Start([추천 뉴스 요청]) --> GetUserData[사용자 정보 조회<br/>user_id, topic]
    GetUserData --> GetTopArticles[TOP 10 뉴스 가져오기<br/>RSS Feed]
    
    GetTopArticles --> InterestBased[관심사 기반 추천 2개]
    GetTopArticles --> PopularBased[인기 뉴스 3개]
    
    subgraph Interest["관심사 기반 (2개)"]
        InterestBased --> KeywordMatch[주제 키워드 매칭<br/>정치/경제/기술/스포츠/문화]
        KeywordMatch --> CalcInterest[매칭 점수 계산<br/>matched / total keywords]
        CalcInterest --> SortInterest[점수 높은 순 정렬]
        SortInterest --> Top2Interest[상위 2개 선택]
    end
    
    subgraph Popular["인기 뉴스 (3개)"]
        PopularBased --> CalcScore[Score 계산]
        CalcScore --> Recency[최신성 점수<br/>24h: 10점<br/>48h: 5점<br/>72h: 2점]
        CalcScore --> Sentiment[감성 점수<br/>positive: 5점<br/>neutral: 2점]
        Recency --> TotalScore[Total Score<br/>= 최신성 + 감성]
        Sentiment --> TotalScore
        TotalScore --> SortPopular[Score 높은 순 정렬]
        SortPopular --> Top3Popular[상위 3개 선택]
    end
    
    Top2Interest --> Merge[중복 제거<br/>URL 기준]
    Top3Popular --> Merge
    
    Merge --> Final[총 5개 추천 뉴스]
    Final --> End([사용자에게 반환])
    
    style Start fill:#4A90E2,color:#fff
    style End fill:#50C878,color:#fff
    style InterestBased fill:#FFD93D,color:#333
    style PopularBased fill:#FF6B6B,color:#fff
    style Final fill:#A78BFA,color:#fff
```

---

### 4. Google OAuth 인증 흐름

```mermaid
sequenceDiagram
    actor User as 👤 사용자
    participant FE as 🎨 프론트엔드
    participant BE as ⚙️ 백엔드 API
    participant Google as 🔐 Google OAuth
    participant DB as 💾 Database
    
    User->>FE: "Google로 로그인" 클릭
    FE->>BE: GET /auth/google
    BE->>Google: OAuth 인증 요청<br/>(CLIENT_ID, REDIRECT_URI)
    Google->>User: Google 로그인 화면
    User->>Google: 계정 선택 및 권한 허용
    
    Google->>BE: GET /auth/google/callback<br/>(authorization_code)
    BE->>Google: Access Token 요청<br/>(code, CLIENT_SECRET)
    Google-->>BE: Access Token + 사용자 정보
    
    BE->>DB: 사용자 조회 또는 생성
    alt 신규 사용자
        DB-->>BE: 새 사용자 생성
    else 기존 사용자
        DB-->>BE: 사용자 정보 반환
    end
    
    BE->>FE: 리디렉트<br/>/?google_auth=success&user_id=1&email=...
    FE->>FE: URL 파라미터 파싱<br/>localStorage 저장
    FE->>User: NewsFeed 페이지로 이동<br/>(로그인 완료)
```

---

### 5. 북마크 및 읽기 기록 흐름

```mermaid
flowchart LR
    subgraph User["👤 사용자 액션"]
        A1[뉴스 읽기]
        A2[북마크 추가]
    end
    
    subgraph Frontend["🎨 프론트엔드"]
        F1[요약 보기 클릭]
        F2[북마크 아이콘 클릭]
    end
    
    subgraph Backend["⚙️ 백엔드 API"]
        B1[POST /analytics/read]
        B2[POST /bookmarks]
    end
    
    subgraph Database["💾 PostgreSQL"]
        D1[(read_articles<br/>테이블)]
        D2[(bookmarks<br/>테이블)]
    end
    
    A1 --> F1
    F1 --> B1
    B1 --> D1
    
    A2 --> F2
    F2 --> B2
    B2 --> D2
    
    D1 -.->|분석 데이터| Analytics[📊 Analytics<br/>Dashboard]
    D2 -.->|북마크 목록| BookmarkPage[🔖 Bookmark<br/>Page]
    
    style A1 fill:#4A90E2,color:#fff
    style A2 fill:#4A90E2,color:#fff
    style D1 fill:#60A5FA,color:#fff
    style D2 fill:#60A5FA,color:#fff
```

---

## 배포 인프라 아키텍처

```mermaid
flowchart TB
    subgraph Internet["🌐 인터넷"]
        Domain["www.syncview.kr<br/>syncview.kr"]
    end
    
    subgraph DNS["🔧 DNS (Whois)"]
        ARecord["A Record<br/>@ → 76.76.21.21<br/>www → 76.76.21.21"]
        TXTRecord["TXT Record<br/>_vercel → vc-domain-verify..."]
    end
    
    subgraph Vercel["▲ Vercel"]
        FrontendDeploy["프론트엔드<br/>React + Vite<br/><br/>자동 배포:<br/>GitHub main 브랜치"]
        FrontendEnv["환경 변수<br/>VITE_API_URL"]
    end
    
    subgraph Render["🟦 Render (2GB RAM)"]
        BackendDeploy["백엔드 API<br/>FastAPI + uvicorn<br/><br/>자동 배포:<br/>GitHub main 브랜치"]
        PostgreSQL[(PostgreSQL<br/>Database)]
        BackendEnv["환경 변수<br/>DATABASE_URL<br/>GOOGLE_CLIENT_ID<br/>AI_SERVICE_URL"]
    end
    
    subgraph GoogleCloud["☁️ Google Cloud"]
        CloudRun["Cloud Run (8GB RAM)<br/>AI Service<br/>FastAPI + Transformers<br/><br/>배포:<br/>Docker + gcloud CLI"]
        CloudBuild["Cloud Build<br/>Docker 이미지 빌드"]
    end
    
    subgraph GitHub["📦 GitHub"]
        Repo["JoYuYoung/syncview<br/>main 브랜치"]
    end
    
    Domain --> ARecord
    Domain --> TXTRecord
    ARecord --> Vercel
    
    Vercel --> FrontendDeploy
    FrontendDeploy --> FrontendEnv
    FrontendEnv -->|"REST API"| BackendDeploy
    
    BackendDeploy --> BackendEnv
    BackendDeploy --> PostgreSQL
    BackendEnv -->|"AI 요청"| CloudRun
    
    CloudBuild --> CloudRun
    
    Repo -->|"Git Push"| Vercel
    Repo -->|"Git Push"| Render
    Repo -->|"Manual Build"| CloudBuild
    
    style Domain fill:#4A90E2,color:#fff
    style FrontendDeploy fill:#50C878,color:#fff
    style BackendDeploy fill:#FF6B6B,color:#fff
    style CloudRun fill:#A78BFA,color:#fff
    style PostgreSQL fill:#60A5FA,color:#fff
```

---

## 기술 스택 상세

### 프론트엔드
- **프레임워크**: React 18.3
- **빌드 도구**: Vite
- **스타일링**: TailwindCSS
- **차트**: Recharts
- **라우팅**: React Router DOM
- **상태 관리**: useState, useEffect, localStorage
- **배포**: Vercel

### 백엔드
- **프레임워크**: FastAPI
- **서버**: uvicorn
- **ORM**: SQLAlchemy
- **인증**: bcrypt, Google OAuth 2.0 (Authlib)
- **RSS 파싱**: feedparser
- **HTML 파싱**: BeautifulSoup4
- **배포**: Render (2GB RAM)

### AI/ML
- **감성 분석**: distilbert-base-uncased-finetuned-sst-2-english
- **요약**: sshleifer/distilbart-cnn-12-6
- **번역**: facebook/nllb-200-distilled-600M
- **유사도 분석**: TF-IDF (scikit-learn)
- **프레임워크**: Transformers (Hugging Face)
- **배포**: Google Cloud Run (8GB RAM)

### 데이터베이스
- **DBMS**: PostgreSQL 16
- **ORM**: SQLAlchemy
- **호스팅**: Render

### 인프라
- **프론트엔드**: Vercel
- **백엔드**: Render (Web Service)
- **AI 서비스**: Google Cloud Run
- **데이터베이스**: Render PostgreSQL
- **도메인**: syncview.kr (Whois)
- **CI/CD**: GitHub Auto-Deploy

---

## 성능 지표

### 응답 시간
- **뉴스 크롤링**: ~2초
- **감성 분석**: ~1-3초 (로컬 AI)
- **요약 생성**:
  - Cold Start: ~50-90초
  - Warm Start: ~5-10초
- **번역**:
  - Cold Start: ~50-90초
  - Warm Start: ~5-10초

### 타임아웃 설정
- **백엔드 → AI Service**: 120초
- **Cloud Run 실행**: 600초 (10분)
- **브라우저 타임아웃**: 없음 (fetch API)

### 메모리 사용량
- **Render 백엔드**: 2GB (Standard Plan)
- **Cloud Run AI**: 8GB (Professional)
- **PostgreSQL**: Render 관리형

---

## 보안

### 인증 및 권한
- **비밀번호**: bcrypt 암호화 (cost factor: 12)
- **OAuth**: Google OAuth 2.0, CSRF 보호
- **세션**: SessionMiddleware, HTTPS 전용

### CORS 정책
- **허용 Origin**:
  - https://www.syncview.kr
  - https://syncview.kr
  - https://syncview-blond.vercel.app
  - http://localhost:5173 (개발)

### 환경 변수
- **민감 정보 보호**: .env, Render 환경 변수
- **Git 제외**: .gitignore

### HTTPS
- **모든 통신 암호화**: Vercel, Render, Cloud Run 자동 SSL

---

## 확장 가능성

### 단기 (1-3개월)
- 뉴스 소스 확장 (AP, NYT, Guardian)
- 다국어 지원 (일본어, 중국어)
- AI 모델 개선 (GPT 기반 요약)

### 중기 (3-6개월)
- 실시간 알림 (Push Notification)
- 소셜 기능 (뉴스 공유, 댓글)
- 프리미엄 기능

### 장기 (6개월+)
- 모바일 앱 (React Native)
- 기업용 솔루션
- AI Chatbot

---

## 모니터링 및 로깅

### 로그 수집
- **Render**: 서버 로그 (uvicorn, FastAPI)
- **Cloud Run**: AI 서비스 로그
- **Vercel**: 배포 로그

### 에러 추적
- **HTTP 상태 코드**: 400, 401, 404, 500, 502, 503, 504
- **예외 처리**: try-except, HTTPException
- **로깅 레벨**: INFO, WARNING, ERROR

---

## 라이선스

Copyright © 2025 SyncView. All rights reserved.

