# SyncView 번역 기능 설정 가이드

## 개요
SyncView 백엔드의 영어→한국어 번역 기능을 위한 설정 및 사용법입니다.

## 기능
- **로컬 우선**: 로컬 모델이 있으면 온라인 접근 없이 사용
- **온라인 폴백**: 로컬 모델이 없으면 자동 다운로드
- **환경변수 무시**: HF 토큰/엔드포인트 설정에 영향받지 않음
- **배치 번역**: 여러 텍스트 동시 처리
- **헬스체크**: 서비스 상태 모니터링

## 설치 및 설정

### 1. 의존성 설치
```bash
cd syncview_backend
pip install -r requirements.txt
```

### 2. 번역 기능 테스트
```bash
# 기본 번역 테스트
python test_translation.py

# API 서버 실행 후 API 테스트
uvicorn main:app --reload
python test_translation.py --api
```

### 3. 수동 모델 다운로드 (선택사항)
```bash
# Git LFS 사용
git lfs install
git clone https://huggingface.co/Helsinki-NLP/opus-mt-en-ko models/opus-mt-en-ko

# 또는 Python으로 다운로드
python -c "
from huggingface_hub import snapshot_download
snapshot_download('Helsinki-NLP/opus-mt-en-ko', local_dir='models/opus-mt-en-ko')
"
```

## API 사용법

### 1. 기본 번역
```bash
curl -X POST "http://127.0.0.1:8000/api/translate" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!"}'
```

### 2. 배치 번역
```bash
curl -X POST "http://127.0.0.1:8000/api/translate/batch" \
  -H "Content-Type: application/json" \
  -d '["Hello", "World", "Test"]'
```

### 3. 헬스체크
```bash
curl "http://127.0.0.1:8000/health"
curl "http://127.0.0.1:8000/api/translate/health"
```

## 프론트엔드 연동

### NewsFeed에서 번역 탭 사용
```javascript
// 번역 요청
const translateText = async (text) => {
  const response = await fetch('http://127.0.0.1:8000/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  const data = await response.json();
  return data.translated_text;
};
```

## 문제 해결

### 1. 모델 로딩 실패
```
❌ 번역 모델을 로딩할 수 없습니다.
```
**해결방법:**
- 네트워크 연결 확인
- 방화벽 설정 확인
- 수동 다운로드 시도

### 2. 메모리 부족
```
CUDA out of memory
```
**해결방법:**
- CPU 모드 사용 (자동 감지)
- 배치 크기 줄이기
- 더 작은 모델 사용

### 3. 권한 오류 (Windows)
```
Permission denied
```
**해결방법:**
- 관리자 권한으로 실행
- 폴더 권한 확인
- 한글 경로 문제 시 영문 경로 사용

## 성능 최적화

### 1. 캐싱
- `@lru_cache(maxsize=512)` 사용
- 동일 텍스트 재번역 시 즉시 반환

### 2. 청크 처리
- 긴 텍스트는 700자씩 분할
- 메모리 사용량 최적화

### 3. GPU 가속
- CUDA 사용 가능 시 자동 GPU 사용
- CPU 폴백 자동 처리

## 모니터링

### 로그 확인
```bash
# 서버 실행 시 로그 확인
uvicorn main:app --reload --log-level debug
```

### 헬스체크 모니터링
```bash
# 정기적 헬스체크
curl -s "http://127.0.0.1:8000/health" | jq '.services.translation'
```

## 확장 가능성

### 다른 언어 추가
1. `translator_hf.py`에 새 모델 추가
2. `routes/translate.py`에 언어 지원 확장
3. 프론트엔드 UI 업데이트

### 모델 교체
1. `MODEL_NAME` 변경
2. `LOCAL_MODEL_DIR` 경로 수정
3. 테스트 실행

## 지원

문제가 지속되면 다음을 확인하세요:
1. Python 버전 (3.8+ 권장)
2. 의존성 버전 충돌
3. 네트워크 연결 상태
4. 디스크 공간 (모델 다운로드용)






