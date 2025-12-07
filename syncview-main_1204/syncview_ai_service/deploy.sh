#!/bin/bash
# SyncView AI Service 배포 스크립트
# Cloud Build를 사용하여 Docker 없이 배포

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 설정
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT_ID="syncview-ai-8476"
REGION="asia-northeast3"
SERVICE_NAME="syncview-ai-service"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 SyncView AI Service 배포 시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 프로젝트 설정
echo "📋 프로젝트 설정: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# 2. Cloud Build로 이미지 빌드 & 배포 (한 번에!)
echo "🔨 Cloud Build로 빌드 & Cloud Run 배포 중..."
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --memory 4Gi \
    --cpu 2 \
    --allow-unauthenticated \
    --max-instances 10 \
    --min-instances 1 \
    --timeout 300 \
    --set-env-vars="PORT=8080" \
    --quiet

# 3. 배포된 URL 확인
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 배포 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo "🌐 AI Service URL: $SERVICE_URL"
echo ""
echo "📝 다음 단계:"
echo "1. Render 환경 변수에 AI_SERVICE_URL=$SERVICE_URL 추가"
echo "2. Render 서버 재배포"
echo ""
echo "🧪 테스트:"
echo "curl $SERVICE_URL/health"

