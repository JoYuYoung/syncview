# SyncView AI Service 배포 스크립트 (PowerShell)
# Cloud Build를 사용하여 Docker 없이 배포

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 설정
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$PROJECT_ID = "syncview-ai-8476"
$REGION = "asia-northeast3"
$SERVICE_NAME = "syncview-ai-service"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 SyncView AI Service 배포 시작" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# 1. 프로젝트 설정
Write-Host "📋 프로젝트 설정: $PROJECT_ID" -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# 2. syncview_ai_service 디렉토리로 이동
Write-Host "📂 AI 서비스 디렉토리로 이동..." -ForegroundColor Yellow
Set-Location -Path "syncview_ai_service"

# 3. Cloud Build로 이미지 빌드 & 배포 (한 번에!)
Write-Host "🔨 Cloud Build로 빌드 & Cloud Run 배포 중..." -ForegroundColor Yellow
Write-Host "⏳ 약 5-10분 소요됩니다 (모델 다운로드 포함)..." -ForegroundColor Cyan

gcloud run deploy $SERVICE_NAME `
    --source . `
    --platform managed `
    --region $REGION `
    --memory 4Gi `
    --cpu 2 `
    --allow-unauthenticated `
    --max-instances 10 `
    --min-instances 1 `
    --timeout 300 `
    --set-env-vars="PORT=8080" `
    --quiet

if ($LASTEXITCODE -eq 0) {
    # 4. 배포된 URL 확인
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "✅ 배포 완료!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

    $SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
    Write-Host "🌐 AI Service URL: $SERVICE_URL" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 다음 단계:" -ForegroundColor Yellow
    Write-Host "1. Render 환경 변수에 AI_SERVICE_URL=$SERVICE_URL 추가"
    Write-Host "2. Render 서버 재배포"
    Write-Host ""
    Write-Host "🧪 테스트:" -ForegroundColor Yellow
    Write-Host "curl $SERVICE_URL/health"
} else {
    Write-Host "❌ 배포 실패!" -ForegroundColor Red
    Write-Host "빌링이 활성화되어 있는지 확인하세요." -ForegroundColor Yellow
}

# 원래 디렉토리로 복귀
Set-Location -Path ".."

