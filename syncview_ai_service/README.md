# SyncView AI Service

Cloud Run에서 실행되는 AI 전용 마이크로서비스

## 🎯 제공 API

- `POST /sentiment` - 감성 분석
- `POST /summarize` - 텍스트 요약  
- `POST /translate` - 영어 → 한국어 번역
- `GET /health` - 헬스체크

## 🚀 Cloud Run 배포 방법

### 1. Google Cloud 프로젝트 설정

```bash
# Google Cloud CLI 설치 (https://cloud.google.com/sdk/docs/install)

# 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID
```

### 2. Docker 이미지 빌드 & 푸시

```bash
# Artifact Registry 저장소 생성 (최초 1회)
gcloud artifacts repositories create syncview-ai \
    --repository-format=docker \
    --location=asia-northeast3 \
    --description="SyncView AI Service"

# Docker 이미지 빌드
cd syncview_ai_service
docker build -t asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/syncview-ai/ai-service:v1 .

# Docker 이미지 푸시
docker push asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/syncview-ai/ai-service:v1
```

### 3. Cloud Run 배포

```bash
gcloud run deploy syncview-ai-service \
    --image asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/syncview-ai/ai-service:v1 \
    --platform managed \
    --region asia-northeast3 \
    --memory 4Gi \
    --cpu 2 \
    --allow-unauthenticated \
    --max-instances 10 \
    --min-instances 1 \
    --timeout 60
```

### 4. 배포된 URL 확인

배포 완료 후 출력되는 URL을 복사하세요:
```
https://syncview-ai-service-xxxxx-an.a.run.app
```

## 💰 예상 비용

- **메모리**: 4GB
- **CPU**: 2 vCPU
- **최소 인스턴스**: 1개 (항상 실행)
- **예상 월 비용**: $10-15 (사용량에 따라 변동)

## 📝 API 사용 예시

### 감성 분석
```bash
curl -X POST https://YOUR-SERVICE-URL/sentiment \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a great news!"}'
```

### 요약
```bash
curl -X POST https://YOUR-SERVICE-URL/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Long article text here..."}'
```

### 번역
```bash
curl -X POST https://YOUR-SERVICE-URL/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}'
```

## 🔧 로컬 테스트

```bash
# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python main.py

# 테스트
curl http://localhost:8080/health
```

## ⚙️ 환경 변수

- `PORT`: 서버 포트 (기본값: 8080)
- `TRANSFORMERS_CACHE`: Hugging Face 모델 캐시 경로

## 🎓 아키텍처

```
┌─────────────────┐
│ Render (API)    │ → 로그인, 뉴스, 북마크
└────────┬────────┘
         │
         │ HTTP 요청
         ↓
┌─────────────────┐
│ Cloud Run (AI)  │ → 감성분석, 요약, 번역
└─────────────────┘
```

