// src/pages/NewsFeed.jsx
import React, { useEffect, useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import {
  getNews,
  translateText,
  getFullArticle,
  getUserSubscription,
  recordReadArticle,
} from "../services/api";
import NewsPopup from "../components/NewsPopup";

const MAX_ARTICLES = 15; // 한 화면에서 보여줄 기사 수
const RECOMMEND_LIMIT = 10; // 추천 탭에 보여줄 기사 수

// 주제별 키워드
const TOPIC_KEYWORDS = {
  정치: [
    "election",
    "vote",
    "voting",
    "parliament",
    "congress",
    "senate",
    "government",
    "white house",
    "president",
    "prime minister",
    "minister",
    "cabinet",
    "party",
    "democrat",
    "republican",
    "policy",
    "law",
    "bill",
    "campaign",
    "referendum",
  ],
  경제: [
    "economy",
    "economic",
    "market",
    "markets",
    "stock",
    "stocks",
    "share",
    "shares",
    "bond",
    "bonds",
    "currency",
    "currencies",
    "inflation",
    "gdp",
    "trade",
    "tariff",
    "business",
    "company",
    "companies",
    "profit",
    "earnings",
    "revenue",
    "oil",
    "gas",
    "bank",
    "banks",
    "interest rate",
    "rates",
    "jobs",
    "unemployment",
    "growth",
    "recession",
  ],
  사회: [
    "society",
    "social",
    "school",
    "schools",
    "education",
    "teacher",
    "students",
    "crime",
    "criminal",
    "police",
    "court",
    "trial",
    "lawsuit",
    "rights",
    "civil rights",
    "abortion",
    "gender",
    "women",
    "family",
    "families",
    "community",
    "communities",
    "migration",
    "immigration",
    "refugee",
    "refugees",
    "protest",
    "protests",
    "protesters",
    "demonstration",
    "violence",
    "shooting",
    "killing",
    "racism",
    "discrimination",
    "housing",
    "homeless",
  ],
  국제: [
    "world",
    "global",
    "international",
    "foreign",
    "overseas",
    "diplomatic",
    "diplomacy",
    "summit",
    "talks",
    "negotiation",
    "united nations",
    "un",
    "nato",
    "eu",
    "european union",
    "alliance",
    "sanctions",
    "tensions",
    "border",
    "conflict",
    "war",
  ],
  "IT/과학": [
    "technology",
    "tech",
    "ai",
    "artificial intelligence",
    "machine learning",
    "chip",
    "chips",
    "semiconductor",
    "software",
    "hardware",
    "phone",
    "smartphone",
    "device",
    "gadget",
    "internet",
    "online",
    "platform",
    "app",
    "apps",
    "cyber",
    "hacker",
    "data",
    "cloud",
    "robot",
    "robotics",
    "space",
    "nasa",
    "rocket",
    "satellite",
    "science",
    "scientist",
    "research",
    "lab",
    "study",
    "climate",
    "climate change",
  ],
  스포츠: [
    "sport",
    "sports",
    "game",
    "match",
    "tournament",
    "cup",
    "league",
    "championship",
    "world cup",
    "olympic",
    "olympics",
    "football",
    "soccer",
    "baseball",
    "basketball",
    "nba",
    "mlb",
    "goal",
    "score",
    "win",
    "victory",
    "defeat",
    "coach",
    "player",
    "team",
    "fans",
  ],
};

const SOURCES = [
  { id: "BBC", label: "BBC" },
  { id: "Reuters", label: "Reuters" },
  { id: "CNN", label: "CNN" },
];

function scoreArticleByTopic(article, topic) {
  const keywords = TOPIC_KEYWORDS[topic];
  if (!keywords || !article) return 0;

  const text = `${article.title || ""} ${
    article.description || ""
  } ${article.summary || ""}`.toLowerCase();

  let matched = 0;
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) matched += 1;
  }
  if (keywords.length === 0) return 0;
  return matched / keywords.length;
}

export default function NewsFeed({ user }) {
  const [subscription, setSubscription] = useState(null);
  const [selectedSource, setSelectedSource] = useState("BBC");

  const [articles, setArticles] = useState([]);
  const [recommendedArticles, setRecommendedArticles] = useState([]);

  const [activeTab, setActiveTab] = useState("top"); // "top" | "recommend"

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleLoading, setArticleLoading] = useState(false);

  const [titleTranslationEnabled, setTitleTranslationEnabled] = useState(false);
  const [titleTranslationLoading, setTitleTranslationLoading] = useState(false);
  const [translatedTitles, setTranslatedTitles] = useState({});

  // ───────────────── 1) 구독 정보 불러오기 ─────────────────
  useEffect(() => {
    async function loadSubscription() {
      if (!user || !user.id) return;

      let finalSub = null;

      try {
        const sub = await getUserSubscription(user.id);
        if (sub) finalSub = sub;
      } catch (err) {
        console.warn("구독 정보 로드 실패 (서버):", err);
      }

      if (!finalSub) {
        const saved = localStorage.getItem("subscription");
        if (saved) finalSub = JSON.parse(saved);
      }

      if (finalSub) setSubscription(finalSub);
    }

    loadSubscription();
  }, [user]);

  // ───────────────── 2) 뉴스 목록 로딩 ─────────────────
  useEffect(() => {
    async function loadNews() {
      try {
        const sourceToUse = selectedSource || "BBC";
        const data = await getNews(sourceToUse);
        const list = Array.isArray(data) ? data : data.articles || [];
        const sliced = list.slice(0, MAX_ARTICLES);

        setArticles(sliced);

        // 추천 뉴스 계산 (관심사 기반)
        if (subscription?.topic) {
          const scored = sliced.map((article) => ({
            article,
            score: scoreArticleByTopic(article, subscription.topic),
          }));

          const positive = scored.filter((item) => item.score > 0);
          const baseList = positive.length > 0 ? positive : scored;

          const chosen = baseList
            .sort((a, b) => b.score - a.score)
            .slice(0, RECOMMEND_LIMIT)
            .map((item) => item.article);

          setRecommendedArticles(chosen);
        } else {
          setRecommendedArticles([]);
        }
      } catch (err) {
        console.error("뉴스 로드 실패:", err);
        alert("뉴스를 불러오는 중 오류가 발생했습니다.");
      }
    }

    loadNews();
  }, [selectedSource, subscription]);

  // ───────────────── 3) 기사 클릭 → 팝업 + 읽기 기록 ─────────────────
  const handleSelectArticle = async (article) => {
    const url = article.link || article.url;
    if (!url) return;

    setSelectedArticle({
      ...article,
      source: selectedSource,
    });
    setArticleLoading(true);

    try {
      const full = await getFullArticle(url);

      setSelectedArticle((prev) => ({
        ...(prev || article),
        ...full,
        source: selectedSource,
      }));

      if (user && user.id) {
        recordReadArticle({
          user_id: user.id,
          url,
          title: article.title,
          source: selectedSource,
          topic: subscription?.topic || null,
        }).catch((err) => {
          console.warn("읽기 기록 실패(무시):", err);
        });
      }
    } catch (err) {
      console.error("기사 상세 불러오기 실패:", err);
      alert("기사를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setArticleLoading(false);
    }
  };

  // ───────────────── 4) 제목 자동 번역 (병렬 처리) ─────────────────
  const handleToggleTitleTranslation = async () => {
    if (!titleTranslationEnabled) {
      setTitleTranslationLoading(true);
      try {
        const list =
          activeTab === "top"
            ? articles
            : recommendedArticles.length
            ? recommendedArticles
            : articles;

        // 모든 번역 작업을 병렬로 실행
        const translationPromises = list.map(async (article) => {
          const key = article.link || article.url;
          if (!key) return null;

          try {
            const translated = await translateText(article.title, "ko");
            return { key, translated };
          } catch (err) {
            console.error(`제목 번역 실패 (${article.title}):`, err);
            return { key, translated: article.title };
          }
        });

        // 모든 번역이 완료될 때까지 대기
        const results = await Promise.all(translationPromises);

        // 결과를 객체로 변환
        const translations = {};
        results.forEach((result) => {
          if (result && result.key) {
            translations[result.key] = result.translated;
          }
        });

        setTranslatedTitles(translations);
        setTitleTranslationEnabled(true);
      } catch (err) {
        console.error("제목 번역 전체 오류:", err);
        alert("제목 번역 중 오류가 발생했습니다.");
      } finally {
        setTitleTranslationLoading(false);
      }
    } else {
      setTitleTranslationEnabled(false);
    }
  };

  const currentList = useMemo(
    () => (activeTab === "top" ? articles : recommendedArticles),
    [activeTab, articles, recommendedArticles]
  );

  const sourceLabel = selectedSource || "BBC";

  return (
    <>
      <Navbar user={user} />

      {/* 여백 줄이고 폭 넓힌 레이아웃 */}
      <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-sky-50 to-indigo-50 px-4 sm:px-6 lg:px-10 py-4 sm:py-6">
        <section className="w-full max-w-6xl mx-auto bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_18px_45px_rgba(15,23,42,0.12)] border border-indigo-100 px-5 sm:px-7 lg:px-8 py-5 sm:py-6">
          {/* 헤더 */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {sourceLabel} 최신 뉴스
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                관심사 및 읽기 기록을 기반으로 뉴스를 추천해 드립니다.
              </p>
            </div>

            {/* 매체 선택 버튼 */}
            <div className="inline-flex bg-slate-100 rounded-full p-1">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSource(s.id);
                    setActiveTab("top");
                  }}
                  className={`px-4 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                    selectedSource === s.id
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 탭 + 제목 번역 버튼 */}
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="inline-flex bg-slate-100 rounded-full p-1">
              <button
                type="button"
                onClick={() => setActiveTab("top")}
                className={`px-7 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  activeTab === "top"
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500"
                }`}
              >
                TOP 15
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recommend")}
                className={`px-7 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  activeTab === "recommend"
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500"
                }`}
              >
                추천 뉴스
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleTitleTranslation}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50 ml-auto"
            >
              <span className="font-semibold">Aa</span>
              {titleTranslationLoading
                ? "제목 번역 중…"
                : titleTranslationEnabled
                ? "원문 제목"
                : "한글 제목"}
            </button>
          </div>

          {/* 리스트 헤더 */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500">
              {activeTab === "top"
                ? "실시간 TOP 15 뉴스"
                : "맞춤 추천 뉴스"}
            </span>
            {activeTab === "recommend" && (
              <span className="text-[11px] text-slate-400">
                관심사: {subscription?.topic || "미설정"}
              </span>
            )}
          </div>

          {/* 기사 리스트: 세로 여백/높이 줄이고 더 많이 채움 */}
          <div className="max-h-[72vh] overflow-y-auto pr-1 space-y-2.5">
            {currentList.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                {activeTab === "recommend"
                  ? "추천할 기사가 아직 없습니다. 관심사에 맞는 기사가 더 쌓이면 자동으로 추천됩니다."
                  : "표시할 기사가 없습니다."}
              </div>
            ) : (
              currentList.map((article, idx) => {
                const key = article.link || article.url || idx;
                const translatedTitle =
                  titleTranslationEnabled && translatedTitles[key]
                    ? translatedTitles[key]
                    : article.title;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectArticle(article)}
                    className="w-full text-left bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 flex flex-col gap-1.5 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {translatedTitle}
                      </h3>
                    </div>
                    {article.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {article.description}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* 우측 슬라이드 모달 */}
      {selectedArticle && (
        <NewsPopup
          user={user}
          article={selectedArticle}
          loading={articleLoading}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </>
  );
}
