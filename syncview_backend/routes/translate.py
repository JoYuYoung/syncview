# routes/translate.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path


# 공개 API만 임포트 (private 함수는 임포트하지 않음)
from translator_hf import translate_en_to_ko, LOCAL_MODEL_DIR

router = APIRouter()

class TranslateReq(BaseModel):
    text: str
    target_lang: str = "ko"   # 확장 대비, 현재는 ko만 지원

@router.get("/translate/health")
def health_check():
    """
    1) 필수 파일 존재 확인 (빠름)
    2) 초경량 로드 테스트: translate_en_to_ko("ping") (모델 lazy-load 검증)
    """
    model_dir: Path = LOCAL_MODEL_DIR
    if not model_dir.exists():
        return {"status": "unhealthy", "service": "translation",
                "error": f"Model folder not found: {model_dir}"}

    # 필수 파일 점검
    required = [
        model_dir / "config.json",
        model_dir / "tokenizer_config.json",
    ]
    alt_tokenizers = [model_dir / "tokenizer.json", model_dir / "source.spm"]
    alt_weights    = [model_dir / "pytorch_model.bin", model_dir / "model.safetensors"]

    missing = [str(p) for p in required if not p.exists()]
    if not any(p.exists() for p in alt_tokenizers):
        missing.append("tokenizer.json OR source.spm (둘 중 하나 필요)")
    if not any(p.exists() for p in alt_weights):
        missing.append("pytorch_model.bin OR model.safetensors (둘 중 하나 필요)")

    if missing:
        return {"status": "unhealthy", "service": "translation",
                "error": "필수 모델 파일 누락", "missing": missing}

    # 초경량 로드 테스트 (실제 로딩이 안 되면 여기서 예외)
    try:
        _ = translate_en_to_ko("ping")
        return {"status": "ok", "model": model_dir.name}
    except Exception as e:
        return {"status": "unhealthy", "service": "translation", "error": str(e)}

@router.post("/translate")
def translate(req: TranslateReq):
    if req.target_lang != "ko":
        raise HTTPException(status_code=400, detail="현재는 ko(한국어)만 지원합니다.")
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is empty")

    try:
        result = translate_en_to_ko(req.text)
        return {"translated_text": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"translation failed: {e}")
