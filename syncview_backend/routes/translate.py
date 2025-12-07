# routes/translate.py - Cloud Run AI 서비스로 프록시
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
import os
import requests
from utils import call_ai_service

router = APIRouter()
logger = logging.getLogger(__name__)

class TranslateReq(BaseModel):
    text: str
    source_lang: str = "en"  # 소스 언어 (기본값: 영어)
    target_lang: str = "ko"  # 타깃 언어 (기본값: 한국어)

@router.get("/translate/health")
def health_check():
    """
    번역 서비스 상태 확인 (Cloud Run AI 서비스)
    """
    try:
        AI_SERVICE_URL = os.getenv("AI_SERVICE_URL")
        if not AI_SERVICE_URL:
            return {
                "status": "unhealthy",
                "service": "translation",
                "error": "AI_SERVICE_URL not configured"
            }
        
        return {
            "status": "ok",
            "mode": "cloud_run_proxy",
            "service_url": AI_SERVICE_URL,
            "provider": "Cloud Run AI Service"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "translation",
            "error": str(e)
        }

@router.post("/translate")
def translate(req: TranslateReq):
    """
    번역 API (Hugging Face Inference API 사용)

    Args:
        req: TranslateReq (text, source_lang, target_lang)

    Returns:
        {"translated_text": str}
    """
    if req.target_lang != "ko":
        raise HTTPException(status_code=400, detail="현재는 ko(한국어)만 지원합니다.")
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is empty")

    try:
        AI_SERVICE_URL = os.getenv("AI_SERVICE_URL")

        # Cloud Run AI 서비스가 설정되어 있으면 사용
        if AI_SERVICE_URL:
            logger.info(f"🔄 번역 요청 (Cloud Run AI): {req.text[:50]}...")
            payload = {
                "text": req.text,
                "source_lang": req.source_lang,
                "target_lang": req.target_lang
            }
            result = call_ai_service("/translate", payload, timeout=120)
            logger.info(f"✅ 번역 완료 (Cloud Run AI)")
            return {"translated_text": result.get("translated_text", req.text)}

        # 로컬 개발: Google Translate API 사용 (deep-translator)
        else:
            logger.info(f"🔄 번역 요청 (Google Translate): {req.text[:50]}...")

            from deep_translator import GoogleTranslator

            # 긴 텍스트는 청크로 나눔 (5000자씩 - Google Translate 제한)
            chunks = []
            text = req.text
            max_length = 4500  # 안전하게 4500자로 제한

            while text:
                chunk = text[:max_length]
                chunks.append(chunk)
                text = text[max_length:]

            # 각 청크 번역
            translated_chunks = []
            for chunk in chunks:
                try:
                    translator = GoogleTranslator(source=req.source_lang, target=req.target_lang)
                    translated_text = translator.translate(chunk)
                    translated_chunks.append(translated_text)
                except Exception as e:
                    logger.warning(f"Google Translate 오류: {e}")
                    # 번역 실패 시 원문 사용
                    translated_chunks.append(chunk)

            final_translation = " ".join(translated_chunks)
            logger.info(f"✅ 번역 완료 (Google Translate)")
            return {"translated_text": final_translation}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 번역 실패: {e}")
        # 번역 실패 시 원문 반환 (사용자 경험 개선)
        logger.warning("번역 실패 - 원문 반환")
        return {"translated_text": req.text}
