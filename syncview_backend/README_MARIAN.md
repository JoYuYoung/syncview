# NLLB 번역 모델 설정 가이드

## 📚 NLLB란?

NLLB (No Language Left Behind)는 Meta에서 개발한 다국어 신경망 기계 번역 모델입니다.
- 200개 언어 지원 (한국어 포함)
- 고품질 번역 성능
- 약 600MB (distilled 버전)
- 영어->한국어 번역 최적화

## 🚀 설치 방법

### 1️⃣ 모델 다운로드

PowerShell에서 다음 명령어를 실행하세요:

```powershell
cd syncview_backend
venv\Scripts\activate
python download_marian_model.py
```

또는 Python에서 직접:

```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "facebook/nllb-200-distilled-600M"
save_dir = r"C:\sync_models\nllb-200-distilled-600M"

# 다운로드 및 저장
tokenizer = AutoTokenizer.from_pretrained(model_name, src_lang="eng_Latn")
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

tokenizer.save_pretrained(save_dir)
model.save_pretrained(save_dir)
```

### 2️⃣ 서버 재시작

모델 다운로드 후 FastAPI 서버를 재시작하세요:

```powershell
cd syncview_backend
venv\Scripts\activate
python -m uvicorn main:app --reload
```

## 🧪 테스트

### API 엔드포인트

1. **번역 헬스체크**: http://127.0.0.1:8000/api/translate/health
2. **번역 API**: http://127.0.0.1:8000/api/translate

### 테스트 예제

PowerShell에서:

```powershell
# 헬스체크
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/translate/health" -Method Get

# 번역 테스트
$body = @{
    text = "Hello, how are you?"
    target_lang = "ko"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/translate" -Method Post -Body $body -ContentType "application/json"
```

또는 Swagger UI에서: http://127.0.0.1:8000/docs

## 📂 파일 구조

```
C:\sync_models\nllb-200-distilled-600M\
├── config.json                  # 모델 설정
├── pytorch_model.bin (2.46GB)   # 모델 가중치
├── model.safetensors (2.46GB)   # 모델 가중치 (safetensors 형식)
├── sentencepiece.bpe.model      # SentencePiece 토크나이저
├── tokenizer.json               # 토크나이저
├── tokenizer_config.json        # 토크나이저 설정
├── generation_config.json       # 생성 설정
└── special_tokens_map.json      # 특수 토큰 매핑
```

## 🔧 트러블슈팅

### 모델을 찾을 수 없음
```
❌ Model folder not found: C:\sync_models\nllb-200-distilled-600M
```
→ `download_marian_model.py`를 실행하여 모델을 다운로드하세요.

### 인터넷 연결 오류
모델 다운로드 시 인터넷 연결이 필요합니다.
- VPN 사용 시 끄고 시도
- 방화벽 확인
- Hugging Face Hub 접근 가능 여부 확인

### GPU 메모리 부족
`translator_hf.py`의 `num_beams`를 줄이세요:
```python
num_beams=2  # 기본값: 4
```

## 🎯 번역 품질 개선

### 1. Beam Search 조정
더 나은 번역을 위해 beam 수를 늘리기:
```python
num_beams=6  # 품질 향상, 속도 감소
```

### 2. 길이 제한 조정
긴 텍스트 처리:
```python
max_length=1024  # 기본값: 512
```

### 3. 캐싱 활용
`@lru_cache` 데코레이터로 동일한 텍스트 재번역 방지 (자동 적용됨)

## 📊 성능

- **모델 크기**: ~600MB (2.46GB 가중치)
- **메모리 사용**: ~2-3GB RAM
- **번역 속도**: 문장당 1-3초 (CPU 기준)
- **GPU 지원**: 자동 감지 및 사용
- **지원 언어**: 200개 언어

## 🌐 뉴스 번역 워크플로우

1. BBC RSS에서 뉴스 가져오기
   - `GET /news/bbc`
   
2. 특정 기사 본문 가져오기
   - `GET /news/detail?url=...`
   
3. 기사 요약하기 (영어)
   - `GET /news/summary?url=...`
   
4. 영어 텍스트를 한국어로 번역
   - `POST /api/translate`
   ```json
   {
     "text": "영어 텍스트",
     "target_lang": "ko"
   }
   ```

## 📝 참고 링크

- [NLLB 논문](https://ai.meta.com/research/no-language-left-behind/)
- [NLLB 모델 카드](https://huggingface.co/facebook/nllb-200-distilled-600M)
- [Hugging Face Transformers 문서](https://huggingface.co/docs/transformers)

