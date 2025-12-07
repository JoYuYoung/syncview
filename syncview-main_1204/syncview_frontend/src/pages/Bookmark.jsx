import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { getUserBookmarks, deleteBookmark } from "../services/api";

export default function Bookmark({ user }) {
  const hasSubscription = localStorage.getItem('subscription');
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ 북마크 목록 가져오기
  useEffect(() => {
    if (user && user.id) {
      setLoading(true);
      getUserBookmarks(user.id)
        .then((data) => {
          setBookmarks(data);
          setError(null);
        })
        .catch((err) => {
          console.error("북마크 불러오기 실패:", err);
          setError(err.message);
          setBookmarks([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user]);

  // ✅ 북마크 삭제
  const handleDelete = async (bookmarkId) => {
    if (!user || !user.id) return;

    if (!confirm("이 북마크를 삭제하시겠습니까?")) return;

    try {
      await deleteBookmark(bookmarkId, user.id);
      
      // 북마크 목록 다시 가져오기
      const updatedBookmarks = await getUserBookmarks(user.id);
      setBookmarks(updatedBookmarks);
      
      alert("북마크가 삭제되었습니다!");
    } catch (err) {
      console.error("북마크 삭제 실패:", err);
      alert("북마크 삭제 중 오류가 발생했습니다.");
    }
  };

  // ✅ 북마크 소스별 색상
  const getSourceColor = (source) => {
    const colors = {
      "BBC": { bg: "from-blue-400 to-purple-500", badge: "bg-blue-100 text-blue-600" },
      "CNN": { bg: "from-green-400 to-teal-500", badge: "bg-green-100 text-green-600" },
      "Reuters": { bg: "from-orange-400 to-red-500", badge: "bg-orange-100 text-orange-600" },
      "Reuters (로이터)": { bg: "from-orange-400 to-red-500", badge: "bg-orange-100 text-orange-600" },
    };
    return colors[source] || { bg: "from-gray-400 to-gray-500", badge: "bg-gray-100 text-gray-600" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative overflow-hidden">
      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-200/30 rounded-full blur-3xl -top-20 -left-20 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-purple-200/30 rounded-full blur-3xl top-1/2 right-0 animate-pulse delay-1000"></div>
        <div className="absolute w-96 h-96 bg-pink-200/30 rounded-full blur-3xl bottom-0 left-1/3 animate-pulse delay-2000"></div>
      </div>

      {/* 헤더 */}
      <header className="relative z-10 grid grid-cols-3 items-center px-8 py-4 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="flex justify-start">
          <Link to="/" aria-label="홈으로">
            <Logo size={36} variant="default" />
          </Link>
        </div>
        <nav className="flex justify-center gap-6 text-gray-700">
          <Link to="/newsfeed" className="hover:text-blue-600 transition-colors">홈</Link>
          <Link to="/analytics" className="hover:text-blue-600 transition-colors">분석</Link>
          {!hasSubscription && <Link to="/subscription" className="hover:text-blue-600 transition-colors">구독</Link>}
          <Link to="/bookmark" className="text-blue-600 font-semibold">북마크</Link>
        </nav>
        <div className="flex justify-end">
          <Link to="/profile">
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 cursor-pointer flex items-center justify-center text-sm font-bold text-white hover:ring-4 hover:ring-blue-300 transition shadow-lg"
              title="프로필 보기"
            >
              {user?.username ? user.username[0].toUpperCase() : "U"}
            </div>
          </Link>
        </div>
      </header>

      {/* 메인 */}
      <main className="relative z-10 px-10 py-12 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-3">저장된 뉴스</h2>
          <p className="text-gray-600">나중에 다시 읽고 싶은 뉴스를 모아보세요</p>
        </div>

        {/* 로딩 상태 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg font-semibold">북마크 불러오는 중...</span>
            </div>
          </div>
        ) : !user ? (
          <div className="text-center py-20">
            <div className="mb-4 text-6xl">🔒</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">로그인이 필요합니다</h3>
            <p className="text-gray-600 mb-6">북마크 기능을 사용하려면 로그인해주세요.</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="mb-4 text-6xl">⚠️</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">오류가 발생했습니다</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-20">
            <div className="mb-4 text-6xl">📚</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">저장된 북마크가 없습니다</h3>
            <p className="text-gray-600 mb-6">뉴스를 읽다가 나중에 다시 보고 싶은 기사를 북마크하세요!</p>
            <Link
              to="/newsfeed"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              뉴스 보러 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* 소스별로 그룹화 */}
            {["BBC", "Reuters (로이터)", "CNN"].map((source) => {
              const sourceBookmarks = bookmarks.filter((b) => b.source === source);
              if (sourceBookmarks.length === 0) return null;

              const colors = getSourceColor(source);

              return (
                <div key={source} className="space-y-6">
                  {/* 소스 헤더 */}
                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 ${colors.badge} rounded-full font-bold text-sm`}>
                      {source}
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
                    <span className="text-sm text-gray-500 font-semibold">
                      {sourceBookmarks.length}개의 북마크
                    </span>
                  </div>

                  {/* 해당 소스의 북마크들 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sourceBookmarks.map((bookmark) => {
                      const date = new Date(bookmark.saved_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      });

                      return (
                        <div
                          key={bookmark.id}
                          className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                        >
                          <div className={`h-32 bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
                            <span className="text-white text-4xl font-bold opacity-20">
                              {bookmark.source}
                            </span>
                          </div>
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-gray-500 font-medium">{date}</span>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-4 line-clamp-2 text-base leading-tight hover:text-blue-600 transition">
                              {bookmark.title}
                            </h3>
                            <div className="flex gap-2">
                              <Link
                                to={`/newsfeed?url=${encodeURIComponent(bookmark.url)}&source=${encodeURIComponent(bookmark.source)}`}
                                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-semibold shadow-sm hover:shadow-md"
                              >
                                다시 읽기
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(bookmark.id)}
                                className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-semibold"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="relative z-10 text-xs text-gray-600 mt-16 px-10 py-8 bg-white/60 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center">
          <p className="mb-2 font-semibold">SyncView - AI 기반 글로벌 뉴스 플랫폼</p>
          <p className="text-gray-500">
            Copyright © 2025 SyncView. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
