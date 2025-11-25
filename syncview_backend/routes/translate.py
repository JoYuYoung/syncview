# routes/translate.py - Hugging Face Inference API 사용
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# 🌐 Hugging Face Inference API 설정
HF_API_URL_TRANSLATE = "https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-ko"
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")  # 환경 변수에서 토큰 읽기 (선택사항)

class TranslateReq(BaseModel):
    text: str
    target_lang: str = "ko"   # 확장 대비, 현재는 ko만 지원

def _call_translation_api(text: str, retry_count: int = 3) -> str:
    """Hugging Face Inference API로 번역 호출"""
    headers = {"Content-Type": "application/json"}
    if HF_API_TOKEN:
        headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
    
    payload = {"inputs": text}
    
    for attempt in range(retry_count):
        try:
            response = requests.post(
                HF_API_URL_TRANSLATE, 
                headers=headers, 
                json=payload, 
                timeout=30
            )
            
            # 모델 로딩 중인 경우 (503)
            if response.status_code == 503:
                result = response.json()
                if "estimated_time" in result:
                    wait_time = min(result["estimated_time"], 20)  # 최대 20초
                    logger.info(f"⏳ 번역 모델 로딩 중... {wait_time}초 대기 (시도 {attempt + 1}/{retry_count})")
                    import time
                    time.sleep(wait_time)
                    continue
            
            response.raise_for_status()
            result = response.json()
            
            # API 응답 처리
            if isinstance(result, list) and len(result) > 0:
                return result[0].get("translation_text", text)
            else:
                return text  # 번역 실패 시 원문 반환
            
        except requests.exceptions.Timeout:
            logger.warning(f"⏱️ 번역 API 타임아웃 (시도 {attempt + 1}/{retry_count})")
            if attempt == retry_count - 1:
                raise HTTPException(status_code=504, detail="번역 API 요청 시간 초과")
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 번역 API 호출 실패 (시도 {attempt + 1}/{retry_count}): {e}")
            if attempt == retry_count - 1:
                raise HTTPException(status_code=503, detail=f"번역 API 호출 실패: {str(e)}")
    
    raise HTTPException(status_code=503, detail="번역 API 호출 최대 재시도 초과")

@router.get("/translate/health")
def health_check():
    """
    번역 서비스 상태 확인 (Hugging Face Inference API)
    """
    try:
        # 간단한 번역 테스트
        _ = _call_translation_api("test", retry_count=1)
        return {
            "status": "ok", 
            "mode": "external_api", 
            "model": "Helsinki-NLP/opus-mt-en-ko",
            "provider": "Hugging Face Inference API"
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "service": "translation", 
            "error": str(e)
        }

@router.post("/translate")
def translate(req: TranslateReq):
    """번역 API (영어 → 한국어)"""
    if req.target_lang != "ko":
        raise HTTPException(status_code=400, detail="현재는 ko(한국어)만 지원합니다.")
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is empty")

    try:
        logger.info(f"🔄 번역 요청 (외부 API): {req.text[:50]}...")
        result = _call_translation_api(req.text)
        logger.info(f"✅ 번역 완료 (외부 API)")
        return {"translated_text": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 번역 실패: {e}")
        raise HTTPException(status_code=500, detail=f"번역 실패: {str(e)}")
