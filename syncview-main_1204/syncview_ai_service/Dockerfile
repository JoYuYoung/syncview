# SyncView AI Service - Dockerfile
# Cloud Run 배포용 (모델 사전 다운로드)

FROM python:3.10-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY main.py .

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔥 핵심: 모델 사전 다운로드 (빌드 시 1회만 실행)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RUN python -c "\
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM; \
print('📥 모델 다운로드 시작...'); \
print('1️⃣ 감성 분석 모델...'); \
pipeline('sentiment-analysis', model='distilbert-base-uncased-finetuned-sst-2-english'); \
print('2️⃣ 요약 모델...'); \
pipeline('summarization', model='sshleifer/distilbart-cnn-12-6'); \
print('3️⃣ 번역 모델...'); \
AutoTokenizer.from_pretrained('facebook/nllb-200-distilled-600M'); \
AutoModelForSeq2SeqLM.from_pretrained('facebook/nllb-200-distilled-600M'); \
print('✅ 모든 모델 다운로드 완료!'); \
"

# 환경 변수 설정
ENV TRANSFORMERS_CACHE=/app/.cache
ENV PORT=8080

# 포트 노출
EXPOSE 8080

# 서버 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

