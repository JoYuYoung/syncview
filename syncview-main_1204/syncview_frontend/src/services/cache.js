// src/services/cache.js
// 메모리 기반 캐싱 시스템

class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  /**
   * 캐시에서 값을 가져옵니다
   * @param {string} key - 캐시 키
   * @returns {any|null} - 캐시된 값 또는 null (만료된 경우)
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 만료 시간 체크
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 캐시에 값을 저장합니다
   * @param {string} key - 캐시 키
   * @param {any} value - 저장할 값
   * @param {number} ttl - Time To Live (밀리초)
   */
  set(key, value, ttl) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  /**
   * 특정 키의 캐시를 삭제합니다
   * @param {string} key - 캐시 키
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 모든 캐시를 삭제합니다
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 만료된 캐시 항목들을 정리합니다
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 캐시 크기를 반환합니다
   */
  size() {
    return this.cache.size;
  }
}

// 싱글톤 인스턴스
const cacheManager = new CacheManager();

// 주기적으로 만료된 캐시 정리 (5분마다)
setInterval(() => {
  cacheManager.cleanup();
}, 5 * 60 * 1000);

// 캐시 만료 시간 상수 (밀리초)
export const CACHE_TTL = {
  NEWS_LIST: 5 * 60 * 1000,      // 5분 - 뉴스 목록
  TRANSLATION: 60 * 60 * 1000,   // 1시간 - 번역 결과
  ARTICLE_DETAIL: 30 * 60 * 1000, // 30분 - 기사 상세
  SUMMARY: 30 * 60 * 1000,       // 30분 - 요약
  SENTIMENT: 30 * 60 * 1000,     // 30분 - 감성 분석
};

export default cacheManager;
