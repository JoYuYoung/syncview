"""
공통 유틸리티 함수 모듈
"""
import os
import logging
import requests
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def call_ai_service(path: str, payload: dict, timeout: int = 120) -> dict:
    """
    Cloud Run AI 서비스로 HTTP 요청 전달 (공통 프록시 함수)

    Args:
        path: AI 서비스 엔드포인트 경로 (예: "/sentiment", "/summarize", "/translate")
        payload: 요청 데이터
        timeout: 타임아웃 시간 (초)

    Returns:
        AI 서비스 응답 (JSON)

    Raises:
        HTTPException: AI 서비스 호출 실패 시
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
        logger.debug(f"   URL: {full_url}")
        logger.debug(f"   Payload: {payload}")

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
