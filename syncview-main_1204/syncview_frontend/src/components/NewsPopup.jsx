// src/components/NewsPopup.jsx
import React, { useEffect, useState } from "react";
import { createBookmark, deleteBookmark } from "../services/api";

export default function NewsPopup({ article, loading, onClose, user }) {
  if (!article) return null;

  // 처음에는 서버에서 내려온 값 있으면 사용 (북마크 페이지에서 열렸을 수도 있으니까)
  const [isBookmarked, setIsBookmarked] = useState(
    !!article?.is_bookmarked
  );
  const [bookmarkId, setBookmarkId] = useState(article?.bookmark_id || null);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    setIsBookmarked(!!article?.is_bookmarked);
    setBookmarkId(article?.bookmark_id || null);
  }, [article]);

  const sentiment = article.sentiment || {};
  const scorePercent = sentiment.score
    ? Math.round(sentiment.score * 100)
    : null;

  const sentimentColor =
    sentiment.sentiment === "positive"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : sentiment.sentiment === "negative"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-slate-50 text-slate-700 border-slate-200";

  const imageSrc =
    article.image_url || article.image || article.urlToImage || null;

  // ───────────────── 북마크 토글 ─────────────────
  const handleToggleBookmark = async () => {
    if (!user || !user.id) {
      alert("북마크를 사용하려면 먼저 로그인해 주세요.");
      return;
    }

    const url = article.link || article.url;
    if (!url) return;

    try {
      setBookmarkLoading(true);

      // 1) 북마크가 안 되어 있으면 → 생성
      if (!isBookmarked) {
        const res = await createBookmark({
          user_id: user.id,
          url,
          title: article.title,
          source: article.source || "Reuters",
        });

        // 백엔드가 어떤 키로 id를 주는지에 따라 둘 다 체크
        const newId = res.id || res.bookmark_id;
        setIsBookmarked(true);
        if (newId) setBookmarkId(newId);
      } else {
        // 2) 이미 북마크 상태 → 삭제
        if (!bookmarkId) {
          console.warn("bookmarkId가 없어 삭제 요청을 보낼 수 없습니다.");
          setIsBookmarked(false); // 프론트 상태만 내리기
          return;
        }

        await deleteBookmark(bookmarkId, user.id);
        setIsBookmarked(false);
        setBookmarkId(null);
      }
    } catch (err) {
      console.error("북마크 토글 실패:", err);
      alert("북마크 처리 중 오류가 발생했습니다.");
    } finally {
      setBookmarkLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40">
      <div className="w-full max-w-3xl h-full bg-white shadow-2xl animate-slide-in-right flex flex-col">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="pr-4">
            <p className="text-[11px] text-slate-400 mb-1">뉴스</p>
            <h2 className="text-lg font-semibold text-slate-900 line-clamp-2">
              {article.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* 북마크 버튼 */}
            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={bookmarkLoading}
              className={`w-9 h-9 flex items-center justify-center rounded-full border text-sm transition-all ${
                isBookmarked
                  ? "border-yellow-400 bg-yellow-400/90 text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
              aria-label="북마크"
            >
              {isBookmarked ? "★" : "☆"}
            </button>

            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 text-lg"
            >
              ×
            </button>
          </div>
        </header>

        {/* 내용 영역 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 이미지 */}
          {imageSrc && (
            <div className="rounded-2xl overflow-hidden bg-slate-100">
              <img
                src={imageSrc}
                alt={article.title}
                className="w-full h-56 object-cover"
              />
            </div>
          )}

          {/* 감성 분석 박스 */}
          {sentiment && sentiment.label && (
            <section
              className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${sentimentColor}`}
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold">감정 분석</span>
                <span className="text-sm">
                  이 뉴스는{" "}
                  <strong>{sentiment.label}</strong>적인 내용을 포함하고 있습니다.
                </span>
              </div>
              {scorePercent !== null && (
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 mb-1">신뢰도</p>
                  <p className="text-xl font-semibold">{scorePercent}%</p>
                </div>
              )}
            </section>
          )}

          {loading && (
            <div className="py-10 text-center text-slate-400 text-sm">
              전체 기사와 번역을 불러오는 중입니다…
            </div>
          )}

          {!loading && (
            <>
              {/* 요약 (한국어) */}
              {article.summary_ko && (
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    요약 (한국어)
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                    {article.summary_ko}
                  </p>
                </section>
              )}

              {/* 요약 (영문) */}
              {article.summary && (
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    요약 (영문)
                  </h3>
                  <p className="text-xs leading-relaxed whitespace-pre-line text-slate-600">
                    {article.summary}
                  </p>
                </section>
              )}

              {/* 전체 기사 (한국어 번역) */}
              {article.content_ko && (
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    전체 기사 (한국어)
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                    {article.content_ko}
                  </p>
                </section>
              )}
            </>
          )}
        </div>

        {/* 푸터 */}
        <footer className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (article.url)
                window.open(article.url, "_blank", "noopener,noreferrer");
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            원문 페이지 이동 →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}
