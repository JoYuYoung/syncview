# routes/translate.py - Cloud Run AI 서비스로 프록시
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

class TranslateReq(BaseModel):
    text: str
    source_lang: str = "en"  # 소스 언어 (기본값: 영어)
    target_lang: str = "ko"  # 타깃 언어 (기본값: 한국어)

def call_ai_service(path: str, payload: dict, timeout: int = 60) -> dict:
    """
    Cloud Run AI 서비스로 HTTP 요청 전달
    (news.py와 동일한 함수 - 중복이지만 독립성을 위해 유지)
    """
    AI_SERVICE_URL = os.getenv("AI_SERVICE_URL")
    
    if not AI_SERVICE_URL:
        logger.error("❌ AI_SERVICE_URL 환경 변수가 설정되지 않았습니다")
        raise HTTPException(
            status_code=500,
            detail="AI 서비스가 구성되지 않았습니다. 관리자에게 문의하세요."
        )
    
    full_url = f"{AI_SERVICE_URL.rstrip('/')}{path}"
    
    try:
        logger.info(f"🔄 Cloud Run AI 서비스 호출: {path}")
        
        response = requests.post(
            full_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout
        )
        
        if response.status_code != 200:
            error_detail = f"AI 서비스 오류 (HTTP {response.status_code})"
            try:
                error_body = response.json()
                error_detail = error_body.get("detail", error_detail)
            except:
                error_detail = response.text or error_detail
            
            logger.error(f"❌ Cloud Run AI 서비스 오류: {error_detail}")
            raise HTTPException(
                status_code=response.status_code,
                detail=error_detail
            )
        
        result = response.json()
        logger.info(f"✅ Cloud Run AI 서비스 응답 완료: {path}")
        return result
        
    except requests.exceptions.Timeout:
        logger.error(f"⏱️ Cloud Run AI 서비스 타임아웃: {path}")
        raise HTTPException(
            status_code=504,
            detail=f"AI 서비스 요청 시간 초과 ({timeout}초)"
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Cloud Run AI 서비스 호출 실패: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"AI 서비스에 연결할 수 없습니다: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 예상치 못한 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AI 서비스 호출 중 오류 발생: {str(e)}"
        )

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
    번역 API (Cloud Run AI 서비스로 프록시)
    
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
        logger.info(f"🔄 번역 요청 (Cloud Run AI): {req.text[:50]}...")
        
        # Cloud Run AI 서비스로 번역 요청
        payload = {
            "text": req.text,
            "source_lang": req.source_lang,
            "target_lang": req.target_lang
        }
        
        result = call_ai_service("/translate", payload, timeout=60)
        
        logger.info(f"✅ 번역 완료 (Cloud Run AI)")
        return {"translated_text": result.get("translated_text", req.text)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 번역 실패: {e}")
        raise HTTPException(status_code=500, detail=f"번역 실패: {str(e)}")
