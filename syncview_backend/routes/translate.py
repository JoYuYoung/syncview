# routes/translate.py - Hugging Face Inference API 사용
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import logging
import os
import time  # API 재시도 대기용

router = APIRouter()
logger = logging.getLogger(__name__)

# 🌐 Hugging Face Inference API 설정
HF_API_URL_TRANSLATE = "https://api-inference.huggingface.co/models/facebook/nllb-200-distilled-600M"
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")  # 환경 변수에서 토큰 읽기 (선택사항)

class TranslateReq(BaseModel):
    text: str
    target_lang: str = "ko"   # 확장 대비, 현재는 ko만 지원

def _call_translation_api(text: str, retry_count: int = 3) -> str:
    """Hugging Face Inference API로 번역 호출 (NLLB 모델 사용)"""
    headers = {"Content-Type": "application/json"}
    if HF_API_TOKEN:
        headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
    
    # NLLB 모델은 source_lang와 target_lang 필요
    payload = {
        "inputs": text,
        "parameters": {
            "src_lang": "eng_Latn",  # 영어
            "tgt_lang": "kor_Hang"   # 한국어
        }
    }
    
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
                try:
                    result = response.json()
                    if "estimated_time" in result:
                        wait_time = min(result["estimated_time"], 20)  # 최대 20초
                        logger.info(f"⏳ 번역 모델 로딩 중... {wait_time}초 대기 (시도 {attempt + 1}/{retry_count})")
                        time.sleep(wait_time)
                        continue
                except:
                    # JSON 파싱 실패 시 기본 대기
                    if attempt < retry_count - 1:
                        logger.info(f"⏳ 재시도 중... (시도 {attempt + 1}/{retry_count})")
                        time.sleep(5)
                        continue
            
            response.raise_for_status()
            result = response.json()
            
            # API 응답 처리
            if isinstance(result, list) and len(result) > 0:
                return result[0].get("translation_text", text)
            elif isinstance(result, dict) and "generated_text" in result:
                return result["generated_text"]
            else:
                logger.warning(f"예상치 못한 응답 형식: {result}")
                return text  # 번역 실패 시 원문 반환
            
        except requests.exceptions.Timeout:
            logger.warning(f"⏱️ 번역 API 타임아웃 (시도 {attempt + 1}/{retry_count})")
            if attempt == retry_count - 1:
                raise HTTPException(status_code=504, detail="번역 API 요청 시간 초과")
            time.sleep(2)  # 재시도 전 대기
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 번역 API 호출 실패 (시도 {attempt + 1}/{retry_count}): {e}")
            if attempt == retry_count - 1:
                raise HTTPException(status_code=503, detail=f"번역 API 호출 실패: {str(e)}")
            time.sleep(2)  # 재시도 전 대기
    
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
            "model": "facebook/nllb-200-distilled-600M",
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
