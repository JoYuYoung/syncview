// src/services/api.js
import cacheManager, { CACHE_TTL } from "./cache";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000"; // 필요 시 변경

// ==================== 인증 ====================

// 회원가입
export async function registerUser(userData) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "회원가입 실패");
  }

  return res.json();
}

// 로그인
export async function loginUser(credentials) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "로그인 실패");
  }

  return res.json();
}

// ==================== 뉴스 ====================

// BBC / 기타 뉴스 목록 가져오기 (캐싱 적용)
export async function getNews(source = "BBC") {
  const cacheKey = `news_${source}`;

  // 캐시 확인
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    console.log(`[Cache Hit] 뉴스 목록: ${source}`);
    return cached;
  }

  console.log(`[Cache Miss] 뉴스 목록 요청: ${source}`);
  const res = await fetch(
    `${API_URL}/news/news?source=${encodeURIComponent(source)}`
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const articles = data.articles || [];

  // 캐시 저장 (5분)
  cacheManager.set(cacheKey, articles, CACHE_TTL.NEWS_LIST);

  return articles;
}

// 뉴스 상세 (캐싱 적용)
export async function getNewsDetail(url) {
  const cacheKey = `detail_${url}`;

  // 캐시 확인
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    console.log(`[Cache Hit] 기사 상세: ${url.substring(0, 50)}...`);
    return cached;
  }

  console.log(`[Cache Miss] 기사 상세 요청: ${url.substring(0, 50)}...`);
  const res = await fetch(
    `${API_URL}/news/detail?url=${encodeURIComponent(url)}`
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const detail = await res.json();

  // 캐시 저장 (30분)
  cacheManager.set(cacheKey, detail, CACHE_TTL.ARTICLE_DETAIL);

  return detail;
}

// 요약 불러오기 (캐싱 적용)
export async function getNewsSummary(url) {
  const cacheKey = `summary_${url}`;

  // 캐시 확인
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    console.log(`[Cache Hit] 요약: ${url.substring(0, 50)}...`);
    return cached;
  }

  console.log(`[Cache Miss] 요약 요청: ${url.substring(0, 50)}...`);
  const res = await fetch(
    `${API_URL}/news/summary?url=${encodeURIComponent(url)}`
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const summary = data.summary || "";

  // 캐시 저장 (30분)
  cacheManager.set(cacheKey, summary, CACHE_TTL.SUMMARY);

  return summary;
}

// ==================== 번역 ====================

export async function translateText(text, targetLang = "ko") {
  // 빈 문자열 체크
  if (!text || text.trim() === "") {
    return "";
  }

  // 캐시 키 생성 (텍스트 해시 대신 간단한 키 사용)
  const cacheKey = `translate_${targetLang}_${text.substring(0, 100)}`;

  // 캐시 확인
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    console.log(`[Cache Hit] 번역: ${text.substring(0, 30)}...`);
    return cached;
  }

  console.log(`[Cache Miss] 번역 요청: ${text.substring(0, 30)}...`);
  const res = await fetch(`${API_URL}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target_lang: targetLang }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "번역 실패");
  }

  const data = await res.json();
  const translatedText = data.translated_text;

  // 캐시 저장 (1시간)
  cacheManager.set(cacheKey, translatedText, CACHE_TTL.TRANSLATION);

  return translatedText;
}

// ==================== 감성 분석 ====================

export async function analyzeSentiment(text) {
  // 빈 문자열 체크
  if (!text || text.trim() === "") {
    return null;
  }

  // 캐시 키 생성
  const cacheKey = `sentiment_${text.substring(0, 100)}`;

  // 캐시 확인
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    console.log(`[Cache Hit] 감성 분석: ${text.substring(0, 30)}...`);
    return cached;
  }

  console.log(`[Cache Miss] 감성 분석 요청: ${text.substring(0, 30)}...`);
  const res = await fetch(`${API_URL}/news/sentiment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "감성 분석 실패");
  }

  const sentiment = await res.json();

  // 캐시 저장 (30분)
  cacheManager.set(cacheKey, sentiment, CACHE_TTL.SENTIMENT);

  return sentiment;
}

// ==================== 유사 기사 ====================

export async function findSimilarArticles(targetArticle, articles) {
  const res = await fetch(`${API_URL}/news/similarity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_article: targetArticle,
      articles,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "유사 기사 분석 실패");
  }

  return res.json();
}

// ==================== 북마크 ====================

export async function createBookmark(data) {
  const res = await fetch(`${API_URL}/bookmarks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "북마크 생성 실패");
  }

  return res.json();
}

export async function getUserBookmarks(userId) {
  const res = await fetch(`${API_URL}/bookmarks/${userId}`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export async function deleteBookmark(bookmarkId, userId) {
  const res = await fetch(
    `${API_URL}/bookmarks/${bookmarkId}?user_id=${userId}`,
    {
      method: "DELETE",
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "북마크 삭제 실패");
  }

  return res.json();
}

// ==================== 구독 설정 ====================

export async function saveSubscription(data) {
  const res = await fetch(`${API_URL}/subscriptions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "구독 저장 실패");
  }

  return res.json();
}

export async function getUserSubscription(userId) {
  const res = await fetch(`${API_URL}/subscriptions/${userId}`);

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export async function deleteSubscription(userId) {
  const res = await fetch(`${API_URL}/subscriptions/${userId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "구독 삭제 실패");
  }

  return res.json();
}

// ==================== 사용자 히스토리 ====================

export async function recordReadArticle(data) {
  const res = await fetch(`${API_URL}/analytics/read-article`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "읽기 기록 실패");
  }

  return res.json();
}

export async function getUserStats(userId) {
  const res = await fetch(`${API_URL}/analytics/stats/${userId}`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export async function getReadHistory(userId, limit = 50) {
  const res = await fetch(
    `${API_URL}/analytics/history/${userId}?limit=${limit}`
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export async function getRecommendedNews(userId, topic, articles) {
  const res = await fetch(`${API_URL}/news/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      topic,
      articles,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "추천 실패");
  }

  return res.json();
}

// ==================== 통합: 전체 기사 + 요약 + 번역 + 감성 ====================

export async function getFullArticle(url) {
  // 1. 기사 상세 + 요약을 병렬로 가져오기
  const [detail, summaryRes] = await Promise.all([
    getNewsDetail(url),
    getNewsSummary(url),
  ]);

  const summaryText =
    typeof summaryRes === "string" ? summaryRes : summaryRes?.summary || "";

  // 2. 감성 분석용 텍스트 (요약 > 본문 > 설명 > 제목)
  const targetText =
    summaryText ||
    detail?.content ||
    detail?.description ||
    detail?.title ||
    "";

  // 3. 모든 비동기 작업을 병렬로 실행 (감성 분석 + 번역들)
  const [sentimentResult, summaryKoResult, contentKoResult] = await Promise.allSettled([
    targetText ? analyzeSentiment(targetText) : Promise.resolve(null),
    summaryText ? translateText(summaryText, "ko") : Promise.resolve(""),
    detail?.content ? translateText(detail.content, "ko") : Promise.resolve(""),
  ]);

  // 4. 결과 추출 (실패한 경우 기본값 사용)
  const sentiment = sentimentResult.status === "fulfilled" ? sentimentResult.value : null;
  const summaryKo = summaryKoResult.status === "fulfilled" ? summaryKoResult.value : "";
  const contentKo = contentKoResult.status === "fulfilled" ? contentKoResult.value : "";

  // 에러 로깅
  if (sentimentResult.status === "rejected") {
    console.error("감성 분석 실패:", sentimentResult.reason);
  }
  if (summaryKoResult.status === "rejected") {
    console.error("요약 번역 실패:", summaryKoResult.reason);
  }
  if (contentKoResult.status === "rejected") {
    console.error("본문 번역 실패:", contentKoResult.reason);
  }

  return {
    ...detail, // title, content, source, published_at, image_url 등
    url,
    summary: summaryText,
    summary_ko: summaryKo,
    content_ko: contentKo,
    sentiment, // { sentiment, label, score }
  };
}
export async function toggleBookmark({ userId, url, title, source }) {
  const res = await fetch(`${API_URL}/bookmarks/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      url,
      title,
      source,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "북마크 처리 실패");
  }

  return res.json();
}