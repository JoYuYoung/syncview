import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import SentimentBadge from "../components/SentimentBadge";
import RecommendedBadge from "../components/RecommendedBadge";
import DuplicateIndicator from "../components/DuplicateIndicator";
import { getBBCNews, getNews, getNewsSummary, translateText, analyzeSentiment, findSimilarArticles, createBookmark, getUserBookmarks, deleteBookmark, recordReadArticle, getRecommendedNews } from "../services/api";

export default function NewsFeed({ user }) {
  // 구독 설정 확인
  const hasSubscription = localStorage.getItem('subscription');
  
  // URL 파라미터에서 북마크된 기사 URL 읽기
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary"); // 'summary' | 'translation'
  const [translation, setTranslation] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState(null);
  const [sentiment, setSentiment] = useState(null); // 감성 분석 결과
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [filterMode, setFilterMode] = useState("all"); // "all" | "recommended"
  const [relatedArticles, setRelatedArticles] = useState([]); // 유사 기사
  const [selectedSource, setSelectedSource] = useState("BBC"); // 선택된 매체
  const [bookmarks, setBookmarks] = useState([]); // 북마크 목록
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [titleTranslationEnabled, setTitleTranslationEnabled] = useState(false); // 제목 번역 활성화 여부
  const [translatedTitles, setTranslatedTitles] = useState({}); // 번역된 제목 저장 { url: translatedTitle }
  const [titleTranslationLoading, setTitleTranslationLoading] = useState(false); // 제목 번역 로딩 상태
  const [recommendedArticles, setRecommendedArticles] = useState([]); // 추천 뉴스 목록
  const [recommendLoading, setRecommendLoading] = useState(false); // 추천 로딩 상태

  // ✅ 구독 설정에 따라 뉴스 목록 가져오기
  useEffect(() => {
    setArticlesLoading(true);
    setArticlesError(null);
    
    // 구독 설정에서 매체 정보 가져오기
    let source = "BBC"; // 기본값
    if (hasSubscription) {
      try {
        const subscription = JSON.parse(hasSubscription);
        source = subscription.source || "BBC";
      } catch (e) {
        console.error("구독 설정 파싱 실패:", e);
      }
    }
    
    setSelectedSource(source);
    console.log(`선택된 매체: ${source}`);
    
    getNews(source)
      .then(async (articles) => {
        console.log("뉴스 데이터:", articles);
        
        // 각 기사의 제목 + 요약으로 감성 분석 + 유사도 기반 중복 감지
        const enrichedArticles = await Promise.all(
          articles.map(async (article, idx) => {
            try {
              // ✅ 각 기사 제목 + 요약으로 감성 분석 (더 정확한 분석)
              let sentimentData = { sentiment: "neutral", score: 0.5 };
              try {
                const textForAnalysis = article.summary 
                  ? `${article.title} ${article.summary}` 
                  : article.title;
                sentimentData = await analyzeSentiment(textForAnalysis);
              } catch (err) {
                console.error(`감성 분석 실패 (기사 ${idx}):`, err);
              }
              
              // 각 기사에 대해 유사 기사 찾기
              const otherArticles = articles.filter((_, i) => i !== idx);
              const similarArticles = await findSimilarArticles(article, otherArticles);
              
              return {
                ...article,
                sentiment: sentimentData.sentiment,
                sentimentScore: sentimentData.score,
                isRecommended: idx < 3, // 상위 3개는 추천 (TODO: 사용자 관심사 기반 추천)
                recommendReason: idx === 0 ? "interest" : idx === 1 ? "history" : "trending",
                duplicateCount: similarArticles.length,
                similarArticles: similarArticles.map(sim => sim.title)
              };
            } catch (err) {
              console.error(`기사 분석 실패 (기사 ${idx}):`, err);
              return {
          ...article,
                sentiment: "neutral",
                sentimentScore: 0.5,
                isRecommended: idx < 3,
          recommendReason: idx === 0 ? "interest" : idx === 1 ? "history" : "trending",
                duplicateCount: 0,
                similarArticles: []
              };
            }
          })
        );
        
        setArticles(enrichedArticles);
        setArticlesError(null);
        
        // ✅ 번역 상태 리셋
        setTitleTranslationEnabled(false);
        setTranslatedTitles({});
      })
      .catch((err) => {
        console.error("뉴스 불러오기 실패:", err);
        setArticlesError(err.message);
        setArticles([]);
      })
      .finally(() => {
        setArticlesLoading(false);
      });
  }, [hasSubscription]);

  // ✅ 북마크 목록 가져오기
  useEffect(() => {
    if (user && user.id) {
      getUserBookmarks(user.id)
        .then((data) => {
          setBookmarks(data);
        })
        .catch((err) => {
          console.error("북마크 불러오기 실패:", err);
          setBookmarks([]);
        });
    }
  }, [user]);

  // ✅ URL 파라미터로 전달된 기사를 자동으로 불러오기 (북마크에서 "다시 읽기" 클릭 시)
  useEffect(() => {
    const bookmarkUrl = searchParams.get('url');
    const bookmarkSource = searchParams.get('source');
    
    if (bookmarkUrl && bookmarkSource) {
      console.log("북마크에서 기사 자동 로드:", bookmarkUrl, "매체:", bookmarkSource);
      
      // ✅ 북마크의 매체 뉴스 로드
      setArticlesLoading(true);
      setSelectedSource(bookmarkSource);
      
      getNews(bookmarkSource)
        .then(async (articles) => {
          console.log("북마크 매체 뉴스 데이터:", articles);
          
          // 각 기사의 제목 + 요약으로 감성 분석 + 유사도 기반 중복 감지
          const enrichedArticles = await Promise.all(
            articles.map(async (article, idx) => {
              try {
                let sentimentData = { sentiment: "neutral", score: 0.5 };
                try {
                  const textForAnalysis = article.summary 
                    ? `${article.title} ${article.summary}` 
                    : article.title;
                  sentimentData = await analyzeSentiment(textForAnalysis);
                } catch (err) {
                  console.error(`감성 분석 실패 (기사 ${idx}):`, err);
                }
                
                const otherArticles = articles.filter((_, i) => i !== idx);
                const similarArticles = await findSimilarArticles(article, otherArticles);
                
                return {
                  ...article,
                  sentiment: sentimentData.sentiment,
                  sentimentScore: sentimentData.score,
                  isRecommended: idx < 3,
                  recommendReason: idx === 0 ? "interest" : idx === 1 ? "history" : "trending",
                  duplicateCount: similarArticles.length,
                  similarArticles: similarArticles.map(sim => sim.title)
                };
              } catch (err) {
                console.error(`기사 분석 실패 (기사 ${idx}):`, err);
                return {
                  ...article,
                  sentiment: "neutral",
                  sentimentScore: 0.5,
                  isRecommended: idx < 3,
                  recommendReason: idx === 0 ? "interest" : idx === 1 ? "history" : "trending",
                  duplicateCount: 0,
                  similarArticles: []
                };
              }
            })
          );
          
          setArticles(enrichedArticles);
          setArticlesError(null);
          
          // ✅ 번역 상태 리셋
          setTitleTranslationEnabled(false);
          setTranslatedTitles({});
          
          // 기사 요약 로드
          const loadBookmarkedArticle = async () => {
            setLoading(true);
            setSummary("");
            setTranslation("");
            setSentiment(null);
            setRelatedArticles([]);
            setSelectedArticle(bookmarkUrl);
            setActiveTab("summary");

            try {
              const summaryText = await getNewsSummary(bookmarkUrl);
              setSummary(summaryText);
              
              // 감성 분석 수행
              try {
                const result = await analyzeSentiment(summaryText);
                setSentiment({ sentiment: result.sentiment, score: result.score });
              } catch (err) {
                console.error("감성 분석 실패:", err);
                setSentiment({ sentiment: "neutral", score: 0.5 });
              }
            } catch (err) {
              console.error("요약 실패:", err);
              setSummary("요약 중 오류가 발생했습니다.");
            } finally {
              setLoading(false);
            }
          };

          loadBookmarkedArticle();
        })
        .catch((err) => {
          console.error("북마크 매체 뉴스 불러오기 실패:", err);
          setArticlesError(err.message);
          setArticles([]);
        })
        .finally(() => {
          setArticlesLoading(false);
        });

      // URL 파라미터 제거 (깔끔하게)
      setSearchParams({});
    }
  }, [searchParams]);

  // ✅ 북마크 추가
  const handleAddBookmark = async (article) => {
    if (!user || !user.id) {
      alert("로그인이 필요합니다.");
      return;
    }

    setBookmarkLoading(true);
    try {
      const bookmarkData = {
        user_id: user.id,
        title: article.title,
        url: article.link || article.url,
        source: selectedSource,
      };

      await createBookmark(bookmarkData);
      
      // 북마크 목록 다시 가져오기
      const updatedBookmarks = await getUserBookmarks(user.id);
      setBookmarks(updatedBookmarks);
      
      alert("북마크에 저장되었습니다!");
    } catch (err) {
      console.error("북마크 추가 실패:", err);
      alert("북마크 추가 중 오류가 발생했습니다.");
    } finally {
      setBookmarkLoading(false);
    }
  };

  // ✅ 북마크 제거
  const handleRemoveBookmark = async (bookmarkId) => {
    if (!user || !user.id) return;

    setBookmarkLoading(true);
    try {
      await deleteBookmark(bookmarkId, user.id);
      
      // 북마크 목록 다시 가져오기
      const updatedBookmarks = await getUserBookmarks(user.id);
      setBookmarks(updatedBookmarks);
      
      alert("북마크에서 제거되었습니다!");
    } catch (err) {
      console.error("북마크 제거 실패:", err);
      alert("북마크 제거 중 오류가 발생했습니다.");
    } finally {
      setBookmarkLoading(false);
    }
  };

  // ✅ 북마크 여부 확인
  const isBookmarked = (articleUrl) => {
    return bookmarks.some((bookmark) => bookmark.url === articleUrl);
  };

  // ✅ 북마크 ID 찾기
  const findBookmarkId = (articleUrl) => {
    const bookmark = bookmarks.find((bookmark) => bookmark.url === articleUrl);
    return bookmark ? bookmark.id : null;
  };

  // ✅ 추천 뉴스 가져오기
  const fetchRecommendedNews = async () => {
    if (!user || !user.id || articles.length === 0) {
      return;
    }
    
    // 구독 설정에서 관심 주제 가져오기
    let topic = null;
    if (hasSubscription) {
      try {
        const subscription = JSON.parse(hasSubscription);
        topic = subscription.topic;
      } catch (e) {
        console.error("구독 설정 파싱 실패:", e);
      }
    }
    
    if (!topic) {
      console.warn("관심 주제가 설정되지 않았습니다.");
      // 주제가 없어도 읽기 기록 기반으로 추천
    }
    
    setRecommendLoading(true);
    try {
      const response = await getRecommendedNews(user.id, topic, articles);
      const recommended = response.recommended || [];
      
      // 추천 이유 매핑
      const enrichedRecommended = recommended.map(article => ({
        ...article,
        isRecommended: true,
        recommendReason: article.recommendation_reason || "interest"
      }));
      
      setRecommendedArticles(enrichedRecommended);
      console.log(`추천 뉴스 ${enrichedRecommended.length}개 로드 완료`);
    } catch (err) {
      console.error("추천 뉴스 가져오기 실패:", err);
      console.error("상세 에러:", err.message);
      // 실패 시 기본 추천 (관심사 1개 + 인기 급상승 3개)
      const defaultRecommended = articles.slice(0, 4).map((article, idx) => ({
        ...article,
        isRecommended: true,
        recommendReason: idx === 0 ? "interest" : "trending"
      }));
      setRecommendedArticles(defaultRecommended);
    } finally {
      setRecommendLoading(false);
    }
  };
  
  // ✅ 추천 뉴스 탭으로 전환 시 추천 뉴스 로드
  useEffect(() => {
    if (filterMode === "recommended" && articles.length > 0 && !recommendLoading) {
      // 기본 추천 (상위 3개)
      const defaultRecommended = articles.slice(0, 3).map((article, idx) => ({
        ...article,
        isRecommended: true,
        recommendReason: idx === 0 ? "interest" : idx === 1 ? "history" : "trending"
      }));
      setRecommendedArticles(defaultRecommended);
    }
  }, [filterMode, articles.length]);
  
  // ✅ 제목 번역 토글
  const toggleTitleTranslation = async () => {
    if (!titleTranslationEnabled) {
      // 번역 활성화: 모든 제목을 번역
      setTitleTranslationLoading(true);
      try {
        const translations = {};
        for (const article of articles) {
          try {
            // 영어 → 한국어로 번역
            const translatedTitle = await translateText(article.title, "ko");
            translations[article.link] = translatedTitle;
          } catch (err) {
            console.error(`제목 번역 실패 (${article.title}):`, err);
            translations[article.link] = article.title; // 실패 시 원본 유지
          }
        }
        setTranslatedTitles(translations);
        setTitleTranslationEnabled(true);
      } catch (err) {
        console.error("제목 번역 중 오류:", err);
        alert("제목 번역 중 오류가 발생했습니다.");
      } finally {
        setTitleTranslationLoading(false);
      }
    } else {
      // 번역 비활성화: 원본으로 되돌림
      setTitleTranslationEnabled(false);
    }
  };

  // ✅ 특정 기사 요약 가져오기
  const fetchSummary = async (url, article = null) => {
    setLoading(true);
    setSummary("");
    setTranslation("");
    setSentiment(null);
    setRelatedArticles([]);
    setSelectedArticle(url);
    setActiveTab("summary"); // 요약 탭으로 리셋

    try {
      const summaryText = await getNewsSummary(url);
      setSummary(summaryText);
      
      // ✅ TOP 10에서 이미 분석한 감성 결과를 그대로 사용
      if (article && article.sentiment && article.sentimentScore !== undefined) {
        setSentiment({
          sentiment: article.sentiment,
          score: article.sentimentScore
        });
      } else {
        // 감성 정보가 없는 경우에만 새로 분석
      fetchSentiment(summaryText);
      }
      
      // ✅ 읽은 기사 기록 (백엔드에 저장)
      if (user && user.id && article) {
        try {
          await recordReadArticle({
            user_id: user.id,
            url: url,
            title: article.title,
            source: selectedSource,
            sentiment: article.sentiment || "neutral",
            sentiment_score: article.sentimentScore || 0.5,
            category: article.category || null
          });
          console.log("✅ 읽은 기사 기록 완료:", article.title);
        } catch (err) {
          console.error("읽은 기사 기록 실패:", err);
          // 기록 실패는 사용자 경험에 영향을 주지 않으므로 에러를 무시합니다.
        }
      }
      
      // 유사 기사 가져오기
      if (article) {
        fetchRelatedArticles(article);
      }
    } catch (err) {
      console.error("요약 실패:", err);
      setSummary("요약 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 유사 기사 가져오기 (실제 백엔드 API 사용)
  const fetchRelatedArticles = async (currentArticle) => {
    try {
      const otherArticles = articles.filter(a => a.link !== currentArticle.link);
      const similarArticles = await findSimilarArticles(currentArticle, otherArticles);
      
      // 유사도 정보를 포함한 전체 기사 정보 매핑
      const related = similarArticles.map(sim => {
        const fullArticle = otherArticles.find(a => a.link === sim.url);
        return {
          ...fullArticle,
          similarity: sim.similarity
        };
      });
    
    setRelatedArticles(related);
    } catch (err) {
      console.error("유사 기사 분석 실패:", err);
      setRelatedArticles([]);
    }
  };

  // ✅ 감성 분석 API 호출 (실제 백엔드 API 사용)
  const fetchSentiment = async (text) => {
    if (!text || !text.trim()) return;
    
    setSentimentLoading(true);
    try {
      const result = await analyzeSentiment(text);
      setSentiment({ sentiment: result.sentiment, score: result.score });
    } catch (err) {
      console.error("감성 분석 실패:", err);
      // 에러 시 중립으로 기본값 설정
      setSentiment({ sentiment: "neutral", score: 0.5 });
    } finally {
      setSentimentLoading(false);
    }
  };

  // ✅ 번역 API 호출
  const fetchTranslation = async (text) => {
    if (!text || !text.trim()) return;
    
    setTranslationLoading(true);
    try {
      // 모든 뉴스를 한국어로 번역 (BBC, Reuters, CNN 모두 영어)
      const targetLang = "ko";
      const translatedText = await translateText(text.trim(), targetLang);
      setTranslation(translatedText);
    } catch (err) {
      console.error("번역 실패:", err);
      setTranslation("번역 중 오류가 발생했습니다. 번역 모델이 설치되어 있는지 확인해주세요.");
    } finally {
      setTranslationLoading(false);
    }
  };

  // ✅ 탭 변경 시 번역 요청
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "translation" && summary && !translation) {
      fetchTranslation(summary);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative overflow-hidden flex flex-col">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      
      {/* 상단 네비게이션 */}
      <header className="relative z-10 grid grid-cols-3 items-center px-8 py-4 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="flex justify-start">
        <Link to="/" aria-label="홈으로">
          <Logo size={36} variant="default" />
        </Link>
        </div>
        <nav className="flex justify-center gap-6 text-gray-700">
          <Link to="/newsfeed" className="text-blue-600 font-semibold">홈</Link>
          <Link to="/analytics" className="hover:text-blue-600 transition-colors">분석</Link>
          {!hasSubscription && <Link to="/subscription" className="hover:text-blue-600 transition-colors">구독</Link>}
          <Link to="/bookmark" className="hover:text-blue-600 transition-colors">북마크</Link>
        </nav>
        <div className="flex justify-end items-center gap-3">
          <Link to="/profile">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 cursor-pointer flex items-center justify-center text-sm font-semibold text-white hover:ring-2 hover:ring-blue-400 hover:scale-105 transition-all shadow-lg"
              title={user?.email || "프로필 보기"}
            >
              {user?.username ? user.username[0].toUpperCase() : "U"}
            </div>
          </Link>
        </div>
      </header>

      {/* 본문 레이아웃 */}
      <main className="relative z-10 flex flex-1 gap-6 px-6 pb-8 mt-6">
        {/* 좌측 기사 리스트 → 비율 40% */}
        <aside className="w-2/5 bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-lg overflow-hidden flex flex-col">
          <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">
                {selectedSource} 최신 뉴스
              </h2>
            </div>
            {/* 필터 탭 */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterMode === "all"
                    ? "bg-white text-blue-700 shadow-md"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
                onClick={() => setFilterMode("all")}
              >
                TOP 10
              </button>
              <button
                type="button"
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterMode === "recommended"
                    ? "bg-white text-blue-700 shadow-md"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
                onClick={() => setFilterMode("recommended")}
              >
                추천 뉴스
              </button>
            </div>
            
            {/* 제목 번역 버튼 */}
            <button
              type="button"
              onClick={toggleTitleTranslation}
              disabled={titleTranslationLoading || articles.length === 0}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                titleTranslationEnabled
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-white/20 text-white hover:bg-white/30"
              } ${titleTranslationLoading || articles.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {titleTranslationLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  번역 중...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {titleTranslationEnabled ? "영문 제목" : "한글 제목"}
                </>
              )}
            </button>
          </div>
          <div className="overflow-y-auto">
            {articlesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">뉴스를 불러오는 중...</p>
                </div>
              </div>
            ) : articlesError ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-red-600 text-sm mb-2">뉴스를 불러올 수 없습니다</p>
                  <p className="text-xs text-gray-500">{articlesError}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    다시 시도
                  </button>
                </div>
              </div>
            ) : articles.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-500 text-sm">뉴스가 없습니다</p>
              </div>
            ) : recommendLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">추천 뉴스를 분석하는 중...</p>
                </div>
              </div>
            ) : (
              (filterMode === "recommended" ? recommendedArticles : articles)
                .map((article, i) => {
                  const active = selectedArticle === article.link;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => fetchSummary(article.link, article)}
                      className={`w-full text-left px-5 py-4 border-b hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${
                        active ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-600" : "bg-white"
                      }`}
                    >
                      {/* 추천 배지 - 추천 뉴스 탭에서만 표시 */}
                      {article.isRecommended && filterMode === "recommended" && (
                        <div className="mb-1.5">
                          <RecommendedBadge reason={article.recommendReason} size="sm" />
                        </div>
                      )}

                      {/* 썸네일 + 제목 */}
                      <div className="flex items-start gap-3">
                        {article.imageUrl && (
                          <img
                            src={article.imageUrl}
                            alt={article.title}
                            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {titleTranslationEnabled && translatedTitles[article.link]
                              ? translatedTitles[article.link]
                              : article.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {article.summary?.slice(0, 120)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {/* 감성 표시 - 실제 AI 분석 결과 */}
                        {(() => {
                          const sentimentMap = {
                            positive: { label: "긍정", color: "text-green-600 bg-green-50" },
                            negative: { label: "부정", color: "text-red-600 bg-red-50" },
                            neutral: { label: "중립", color: "text-gray-600 bg-gray-50" }
                          };
                          const sentiment = sentimentMap[article.sentiment] || sentimentMap.neutral;
                          const confidencePercent = Math.round((article.sentimentScore || 0.5) * 100);
                          
                          return (
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${sentiment.color} border border-current/20`}>
                              <span className="text-xs font-semibold">{sentiment.label}</span>
                              <span className="text-xs opacity-70">({confidencePercent}%)</span>
                            </div>
                          );
                        })()}
                        
                        {/* 중복/유사 기사 표시 - 추천 뉴스 탭에서만 표시 */}
                        {article.duplicateCount > 0 && filterMode === "recommended" && (
                          <DuplicateIndicator 
                            count={article.duplicateCount}
                            similarArticles={article.similarArticles}
                          />
                        )}
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </aside>

        {/* 우측 요약/번역 패널 → 비율 60% */}
        <section className="w-3/5">
          {selectedArticle ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-lg h-full flex flex-col">
              <div className="px-6 pt-6 flex justify-between items-center">
                <div className="inline-flex rounded-xl p-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-inner">
                  <button
                    type="button"
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === "summary"
                        ? "bg-white text-blue-700 shadow-md"
                        : "text-gray-600 hover:text-blue-600"
                    }`}
                    onClick={() => handleTabChange("summary")}
                  >
                    요약
                  </button>
                  <button
                    type="button"
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === "translation"
                        ? "bg-white text-blue-700 shadow-md"
                        : "text-gray-600 hover:text-blue-600"
                    }`}
                    onClick={() => handleTabChange("translation")}
                  >
                    번역
                  </button>
                </div>
                
                {/* 북마크 버튼 */}
                {(() => {
                  const currentArticle = articles.find(a => a.link === selectedArticle);
                  if (!currentArticle) return null;
                  
                  const bookmarked = isBookmarked(selectedArticle);
                  const bookmarkId = findBookmarkId(selectedArticle);
                  
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (bookmarked && bookmarkId) {
                          handleRemoveBookmark(bookmarkId);
                        } else {
                          handleAddBookmark(currentArticle);
                        }
                      }}
                      disabled={bookmarkLoading}
                      className={`p-2.5 rounded-lg transition-all ${
                        bookmarked
                          ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      } ${bookmarkLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                      title={bookmarked ? "북마크 제거" : "북마크 추가"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill={bookmarked ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                    </button>
                  );
                })()}
              </div>
              <div className="p-6 pt-4 flex-1 space-y-4">
                {/* 감성 분석 결과 */}
                {sentiment && !loading && (
                  <div className="space-y-2">
                    <SentimentBadge 
                      sentiment={sentiment.sentiment} 
                      score={sentiment.score}
                      size="md"
                    />
                    {/* 참고 문구 */}
                    <p className="text-xs text-gray-500 leading-relaxed pl-1">
                      ※ 본 서비스의 반응 분석은 기사 내용의 어조를 기반으로 한 자동 분석 결과이며,<br />
                      특정 인물·단체에 대한 평가를 의미하지 않습니다.
                    </p>
                  </div>
                )}
                
                {/* 요약/번역 콘텐츠 */}
                {loading ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    불러오는 중...
                  </div>
                ) : activeTab === "summary" ? (
                  <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                    {summary}
                  </p>
                ) : (
                  <div>
                    {translationLoading ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        번역 중...
                      </div>
                    ) : (
                      <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                        {translation || "번역 탭을 클릭하면 요약 내용이 번역됩니다."}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 개선된 원문 보기 버튼 */}
              <div className="px-6 pb-6 mt-auto">
                <a
                  href={selectedArticle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <span>원문 보기</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-lg flex flex-col items-center justify-center text-gray-400 p-12">
              <p className="text-xl font-semibold text-gray-600 mb-2">기사를 선택하세요</p>
              <p className="text-sm text-gray-500">왼쪽 목록에서 읽고 싶은 뉴스를 클릭해주세요</p>
            </div>
          )}
        </section>
      </main>

      {/* 푸터 */}
      <footer className="relative z-10 text-xs text-gray-600 mt-auto px-10 py-8 bg-white/50 backdrop-blur-sm border-t border-white/50">
        <div className="max-w-6xl mx-auto text-center">
          <p className="font-semibold mb-2">SyncView - AI 기반 글로벌 뉴스 플랫폼</p>
          <p className="text-gray-500">
            Copyright © 2025 SyncView. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
