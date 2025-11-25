// src/services/api.js
export const API_URL = import.meta.env.VITE_API_URL || "https://syncview.onrender.com"; // FastAPI 서버 주소

// ==================== 인증 관련 API ====================

// 회원가입 API
export async function registerUser(userData) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "회원가입 실패");
  }
  return res.json();
}

// 로그인 API
export async function loginUser(credentials) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "로그인 실패");
  }
  return res.json();
}

// ==================== 뉴스 관련 API ====================

// BBC 뉴스 목록 가져오기
export async function getBBCNews() {
  const res = await fetch(`${API_URL}/news/bbc`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.articles || [];
}

// 매체별 뉴스 목록 가져오기 (통합)
export async function getNews(source = "BBC") {
  const res = await fetch(`${API_URL}/news/news?source=${encodeURIComponent(source)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.articles || [];
}

// 뉴스 상세 내용 가져오기
export async function getNewsDetail(url) {
  const res = await fetch(`${API_URL}/news/detail?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// 뉴스 요약 가져오기
export async function getNewsSummary(url) {
  const res = await fetch(`${API_URL}/news/summary?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.summary || "요약을 불러오지 못했습니다.";
}

// ==================== 번역 관련 API ====================

// 번역 서비스 상태 확인
export async function checkTranslationHealth() {
  const res = await fetch(`${API_URL}/api/translate/health`);
  if (!res.ok) {
    throw new Error("번역 서비스 상태 확인 실패");
  }
  return res.json();
}

// 영어 -> 한국어 번역
export async function translateText(text, targetLang = "ko") {
  const res = await fetch(`${API_URL}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target_lang: targetLang }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "번역 실패");
  }
  const data = await res.json();
  return data.translated_text || "번역 결과를 불러오지 못했습니다.";
}

// ==================== AI 분석 관련 API ====================

// 감성 분석
export async function analyzeSentiment(text) {
  const res = await fetch(`${API_URL}/news/sentiment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "감성 분석 실패");
  }
  return res.json();
}

// 유사 기사 분석
export async function findSimilarArticles(targetArticle, articles) {
  const res = await fetch(`${API_URL}/news/similarity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_article: targetArticle, articles }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "유사 기사 분석 실패");
  }
  return res.json();
}

// ==================== 북마크 관련 API ====================

// 북마크 생성
export async function createBookmark(bookmarkData) {
  const res = await fetch(`${API_URL}/bookmarks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bookmarkData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "북마크 생성 실패");
  }
  return res.json();
}

// 사용자 북마크 조회
export async function getUserBookmarks(userId) {
  const res = await fetch(`${API_URL}/bookmarks/${userId}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// 북마크 삭제
export async function deleteBookmark(bookmarkId, userId) {
  const res = await fetch(`${API_URL}/bookmarks/${bookmarkId}?user_id=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "북마크 삭제 실패");
  }
  return res.json();
}

// ==================== 구독 설정 관련 API ====================

// 구독 설정 생성/업데이트
export async function saveSubscription(subscriptionData) {
  const res = await fetch(`${API_URL}/subscriptions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscriptionData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "구독 설정 저장 실패");
  }
  return res.json();
}

// 사용자 구독 설정 조회
export async function getUserSubscription(userId) {
  const res = await fetch(`${API_URL}/subscriptions/${userId}`);
  if (!res.ok) {
    if (res.status === 404) {
      return null; // 구독 설정이 없음
    }
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// 구독 설정 삭제
export async function deleteSubscription(userId) {
  const res = await fetch(`${API_URL}/subscriptions/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "구독 설정 삭제 실패");
  }
  return res.json();
}

// ==================== Analytics 관련 API ====================

// 읽은 기사 기록
export async function recordReadArticle(articleData) {
  const res = await fetch(`${API_URL}/analytics/read-article`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(articleData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "읽은 기사 기록 실패");
  }
  return res.json();
}

// 사용자 통계 데이터 조회
export async function getUserStats(userId) {
  const res = await fetch(`${API_URL}/analytics/stats/${userId}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// 읽은 기사 히스토리 조회
export async function getReadHistory(userId, limit = 50) {
  const res = await fetch(`${API_URL}/analytics/history/${userId}?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// 추천 뉴스 가져오기
export async function getRecommendedNews(userId, topic, articles) {
  const res = await fetch(`${API_URL}/news/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      topic: topic,
      articles: articles
    }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "뉴스 추천 실패");
  }
  return res.json();
}
