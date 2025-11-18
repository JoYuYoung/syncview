# translator_hf.py - NLLB 다국어 번역 모델 (en -> ko)
import os
import re
import torch
from functools import lru_cache
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import warnings

# ─────────────────────────────────────────────────────────────
# 1️⃣ 모델 경로 (영문 절대경로만 사용)
# NLLB-200 distilled 모델 (600MB, 200개 언어 지원)
# ─────────────────────────────────────────────────────────────
# 작은 모델로 변경 (1.2GB -> 600MB)
LOCAL_MODEL_DIR = Path(r"C:\sync_models\nllb-200-distilled-600M")
# 대안: 더 작은 모델
# LOCAL_MODEL_DIR = Path(r"C:\sync_models\opus-mt-en-ko")  # 약 300MB
print(f"[Translator] MODEL_DIR = {LOCAL_MODEL_DIR}")

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
_device = None
_initialized = False


def _get_device():
    global _device
    if _device is None:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return _device


def _load_model_local_only():
    global _tokenizer, _model, _initialized
    if _initialized:
        return

    if not LOCAL_MODEL_DIR.exists():
        raise RuntimeError(
            f"❌ Model folder not found: {LOCAL_MODEL_DIR}\n"
            f"→ Put model files here (hf download or copy)."
        )

    try:
        _tokenizer = AutoTokenizer.from_pretrained(str(LOCAL_MODEL_DIR), local_files_only=True, src_lang="eng_Latn", tgt_lang="kor_Hang")
        _model = AutoModelForSeq2SeqLM.from_pretrained(str(LOCAL_MODEL_DIR), local_files_only=True)
        _model.to(_get_device())
        _initialized = True
        print(f"✅ 번역 모델 로딩 완료 (NLLB): {LOCAL_MODEL_DIR}")
    except Exception as e:
        raise RuntimeError(
            f"❌ 로컬 번역 모델 로딩 실패.\n경로: {LOCAL_MODEL_DIR}\n오류: {e}"
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
    """영어 → 한국어 번역 (NLLB 모델 사용)"""
    if not text or not text.strip():
        return ""

    _load_model_local_only()

    outs = []
    for chunk in _chunk_text(text):
        # NLLB는 소스/타깃 언어를 토크나이저에 지정
        # eng_Latn (영어) -> kor_Hang (한국어)
        _tokenizer.src_lang = "eng_Latn"
        
        inputs = _tokenizer(
            chunk,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        ).to(_get_device())

        with torch.no_grad():
            # NLLB는 forced_bos_token_id로 타깃 언어 지정
            # kor_Hang 토큰을 ID로 변환
            forced_bos_token_id = _tokenizer.convert_tokens_to_ids("kor_Hang")
            generated_tokens = _model.generate(
                **inputs,
                forced_bos_token_id=forced_bos_token_id,
                num_beams=4,
                max_length=512,
                early_stopping=True,
            )

        translated = _tokenizer.decode(generated_tokens[0], skip_special_tokens=True)
        outs.append(_clean_out(translated))

    return " ".join(outs)


# 불필요 경고 숨김
warnings.filterwarnings("ignore", category=UserWarning)
