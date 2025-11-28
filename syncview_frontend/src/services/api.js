// src/services/api.js

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

// BBC / 기타 뉴스 목록 가져오기
export async function getNews(source = "BBC") {
  const res = await fetch(
    `${API_URL}/news/news?source=${encodeURIComponent(source)}`
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.articles || [];
}

// 뉴스 상세
export async function getNewsDetail(url) {
  const res = await fetch(
    `${API_URL}/news/detail?url=${encodeURIComponent(url)}`
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// 요약 불러오기
export async function getNewsSummary(url) {
  const res = await fetch(
    `${API_URL}/news/summary?url=${encodeURIComponent(url)}`
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.summary || "";
}

// ==================== 번역 ====================

export async function translateText(text, targetLang = "ko") {
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
  return data.translated_text;
}

// ==================== 감성 분석 ====================

export async function analyzeSentiment(text) {
  const res = await fetch(`${API_URL}/news/sentiment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "감성 분석 실패");
  }

  return res.json();
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
  let sentiment = null;
  try {
    const targetText =
      summaryText ||
      detail?.content ||
      detail?.description ||
      detail?.title ||
      "";

    if (targetText) {
      sentiment = await analyzeSentiment(targetText);
    }
  } catch (e) {
    console.error("감성 분석 실패:", e);
  }

  // 3. 번역 (요약 + 전체 본문)
  let summaryKo = "";
  let contentKo = "";

  try {
    if (summaryText) {
      summaryKo = await translateText(summaryText, "ko");
    }
  } catch (e) {
    console.error("요약 번역 실패:", e);
  }

  try {
    if (detail?.content) {
      contentKo = await translateText(detail.content, "ko");
    }
  } catch (e) {
    console.error("본문 번역 실패:", e);
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