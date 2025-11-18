"""
NLLB 다국어 번역 모델 다운로드 스크립트
영어 -> 한국어 번역 (facebook/nllb-200-distilled-600M)
200개 언어 지원, 약 600MB
"""
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from pathlib import Path

# 모델 저장 경로
MODEL_NAME = "facebook/nllb-200-distilled-600M"
SAVE_DIR = Path(r"C:\sync_models\nllb-200-distilled-600M")

def download_model():
    print(f"📥 NLLB 번역 모델 다운로드 시작...")
    print(f"모델: {MODEL_NAME}")
    print(f"저장 경로: {SAVE_DIR}")
    print(f"예상 크기: 약 600MB")
    
    # 디렉토리 생성
    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        # 토크나이저 다운로드
        print("\n1️⃣ 토크나이저 다운로드 중...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, src_lang="eng_Latn")
        tokenizer.save_pretrained(str(SAVE_DIR))
        print("✅ 토크나이저 다운로드 완료")
        
        # 모델 다운로드
        print("\n2️⃣ 모델 다운로드 중... (약 600MB, 시간이 걸릴 수 있습니다)")
        model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
        model.save_pretrained(str(SAVE_DIR))
        print("✅ 모델 다운로드 완료")
        
        # 테스트
        print("\n3️⃣ 번역 테스트 (영어 → 한국어)...")
        test_text = "Hello, how are you?"
        tokenizer.src_lang = "eng_Latn"
        inputs = tokenizer(test_text, return_tensors="pt", padding=True)
        
        # NLLB는 forced_bos_token_id로 타깃 언어 지정
        forced_bos_token_id = tokenizer.convert_tokens_to_ids("kor_Hang")
        outputs = model.generate(**inputs, forced_bos_token_id=forced_bos_token_id)
        translated = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        print(f"원문 (영어): {test_text}")
        print(f"번역 (한국어): {translated}")
        
        print("\n" + "="*50)
        print("🎉 모델 다운로드 및 설정 완료!")
        print(f"📁 저장 위치: {SAVE_DIR}")
        print(f"💡 지원 언어: 200개 (한국어 포함)")
        print("="*50)
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        print("\n해결 방법:")
        print("1. 인터넷 연결 확인")
        print("2. Hugging Face Hub 접근 가능 확인")
        print("3. 디스크 공간 확인 (약 600MB 필요)")
        raise

if __name__ == "__main__":
    download_model()

