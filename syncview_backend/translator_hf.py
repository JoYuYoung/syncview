# translator_hf.py - Helsinki-NLP opus-mt 번역 모델 (en -> ko)
import os
import re
import torch
import gc  # 메모리 최적화를 위한 가비지 컬렉션
from functools import lru_cache
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import warnings

# ─────────────────────────────────────────────────────────────
# 1️⃣ 모델 경로 설정 (2GB RAM 최적화 - 더 작은 모델 사용)
# ─────────────────────────────────────────────────────────────
# 로컬 개발: Windows 경로 사용
# 프로덕션(Render): Hugging Face에서 자동 다운로드
if os.getenv("RENDER"):  # Render 환경
    MODEL_NAME = "Helsinki-NLP/opus-mt-en-ko"  # 영한 번역 (경량 버전, ~100MB)
    LOCAL_MODEL_DIR = None
    print(f"[Translator] 프로덕션 모드 (2GB RAM 최적화): Hugging Face에서 자동 다운로드")
else:  # 로컬 개발
    LOCAL_MODEL_DIR = Path(r"C:\sync_models\opus-mt-en-ko")
    MODEL_NAME = str(LOCAL_MODEL_DIR) if LOCAL_MODEL_DIR.exists() else "Helsinki-NLP/opus-mt-en-ko"
    print(f"[Translator] 로컬 모드: MODEL_DIR = {LOCAL_MODEL_DIR}")

# ─────────────────────────────────────────────────────────────
# 2️⃣ 환경 변수 정리
# ─────────────────────────────────────────────────────────────
for k in ["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN", "HUGGINGFACE_HUB_ENDPOINT", "HF_ENDPOINT"]:
    os.environ.pop(k, None)

# ─────────────────────────────────────────────────────────────
# 3️⃣ 전역 상태
# ─────────────────────────────────────────────────────────────
_tokenizer = None
_model = None
_initialized = False


def _load_model_local_only():
    global _tokenizer, _model, _initialized
    if _initialized:
        return

    try:
        # Render(프로덕션) 환경: Hugging Face에서 자동 다운로드
        if LOCAL_MODEL_DIR is None or not LOCAL_MODEL_DIR.exists():
            print(f"🔄 번역 모델 로딩 중: {MODEL_NAME} (~100MB)")
            print(f"⏳ 첫 번역 요청이므로 3초 정도 소요됩니다...")
            _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            # ✅ 기본 CPU 로드 (Render는 CPU만 있음, .to() 불필요)
            _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
            # CPU는 기본값이므로 .to() 호출 생략
            gc.collect()  # 메모리 정리
            _initialized = True
            print(f"✅ 번역 모델 로딩 완료 (이후 요청은 즉시 처리): {MODEL_NAME}")
        # 로컬 개발: 로컬 파일에서 로드
        else:
            print(f"📂 로컬 모델 로딩 중: {LOCAL_MODEL_DIR}")
            _tokenizer = AutoTokenizer.from_pretrained(str(LOCAL_MODEL_DIR), local_files_only=True)
            # ✅ 기본 CPU 로드 (.to() 불필요)
            _model = AutoModelForSeq2SeqLM.from_pretrained(str(LOCAL_MODEL_DIR), local_files_only=True)
            # CPU는 기본값이므로 .to() 호출 생략
            gc.collect()  # 메모리 정리
            _initialized = True
            print(f"✅ 번역 모델 로딩 완료 (로컬): {LOCAL_MODEL_DIR}")
    except Exception as e:
        raise RuntimeError(
            f"❌ 번역 모델 로딩 실패.\n모델: {MODEL_NAME if LOCAL_MODEL_DIR is None else LOCAL_MODEL_DIR}\n오류: {e}"
        )


def _chunk_text(text: str, max_chars: int = 700):
    """긴 텍스트를 안전하게 나눔"""
    out, buf, cur = [], [], 0
    for w in text.split():
        if cur + len(w) + 1 > max_chars:
            out.append(" ".join(buf))
            buf, cur = [], 0
        buf.append(w)
        cur += len(w) + 1
    if buf:
        out.append(" ".join(buf))
    return out or [""]


def _clean_out(s: str) -> str:
    """출력 후처리 (특수기호 정리)"""
    s = s.replace("⁇", "?").strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[#]+", "#", s)
    s = s.replace("業有公司", "").strip()
    return s


@lru_cache(maxsize=512)
def translate_en_to_ko(text: str) -> str:
    """영어 → 한국어 번역 (Opus-MT 모델 사용)"""
    if not text or not text.strip():
        return ""

    _load_model_local_only()

    outs = []
    for chunk in _chunk_text(text):
        # ✅ .to() 호출 제거 (CPU는 기본값)
        inputs = _tokenizer(
            chunk,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        )

        with torch.no_grad():
            generated_tokens = _model.generate(
                **inputs,
                num_beams=4,
                max_length=512,
                early_stopping=True,
            )

        translated = _tokenizer.decode(generated_tokens[0], skip_special_tokens=True)
        outs.append(_clean_out(translated))

    return " ".join(outs)


# 불필요 경고 숨김
warnings.filterwarnings("ignore", category=UserWarning)
