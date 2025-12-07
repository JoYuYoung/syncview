// src/components/Subscription.jsx (또는 src/pages/Subscription.jsx)

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Subscription({ user }) {
  const navigate = useNavigate();

  // 관심 주제 옵션 (단일 선택)
  const topicOptions = ["정치", "경제", "사회", "국제", "IT/과학", "스포츠"];

  const [selectedTopic, setSelectedTopic] = useState(() => {
    const saved = localStorage.getItem("subscription");
    if (!saved) return "";
    try {
      const parsed = JSON.parse(saved);
      return parsed.topic || "";
    } catch {
      return "";
    }
  });

  const btnClass = (isActive) =>
    isActive
      ? "px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
      : "px-4 py-2 rounded-full bg-white/80 text-gray-700 ring-1 ring-gray-200 hover:bg-white hover:ring-blue-400 hover:text-blue-600 hover:shadow-md transition-all duration-200";

  const handleSave = () => {
    if (!selectedTopic) {
      alert("관심 주제를 하나 선택해주세요.");
      return;
    }

    const subscription = {
      topic: selectedTopic,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem("subscription", JSON.stringify(subscription));
    alert("맞춤 구독 설정이 저장되었습니다!");
    navigate("/newsfeed");
  };

  const selectTopic = (value) => {
    setSelectedTopic(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

      {/* 헤더 */}
      <header className="relative z-10 grid grid-cols-3 items-center px-8 py-4 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="flex justify-start">
          <Link to="/" aria-label="홈으로">
            <Logo size={36} variant="default" />
          </Link>
        </div>

        <nav className="flex justify-center gap-6 text-gray-700">
          <Link to="/newsfeed" className="hover:text-blue-600 transition-colors">
            홈
          </Link>
          <Link to="/analytics" className="hover:text-blue-600 transition-colors">
            분석
          </Link>
          <span className="text-blue-600 font-semibold">구독</span>
          <Link to="/bookmark" className="hover:text-blue-600 transition-colors">
            북마크
          </Link>
        </nav>

        <div className="flex justify-end items-center gap-3">
          <Link to="/profile">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 cursor-pointer flex items-center justify-center text-sm font-semibold text-white hover:ring-2 hover:ring-blue-400 hover:scale-105 transition-all shadow-lg"
              title="프로필 보기"
            >
              {user?.username ? user.username[0].toUpperCase() : "U"}
            </div>
          </Link>
        </div>
      </header>

      {/* 메인 */}
      <main className="relative z-10 px-6 md:px-10 py-12">
        <div className="max-w-5xl mx-auto">
          {/* 타이틀 */}
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg mb-4">
              맞춤 설정
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              맞춤 구독 설정
            </h2>
            <p className="text-gray-700 text-lg max-w-2xl mx-auto">
              관심 주제를 선택하면, 뉴스 피드와 추천 뉴스에서 해당 주제의 기사를 우선적으로
              보여줍니다.
            </p>
          </div>

          {/* 주제 카드 */}
          <div className="group relative bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-lg hover:shadow-2xl transition-all duration-300 p-8">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900">관심 주제</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">* 하나만 선택할 수 있습니다</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {topicOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={selectedTopic === t}
                  className={btnClass(selectedTopic === t)}
                  onClick={() => selectTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-b-2xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          </div>

          {/* 액션 버튼 */}
          <div className="mt-10 flex justify-center gap-4">
            <button
              onClick={handleSave}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 font-semibold"
            >
              <span className="flex items-center gap-2">
                저장하기
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
            </button>
            <Link
              to="/"
              className="px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl ring-1 ring-gray-200 hover:bg-white hover:shadow-lg transition-all duration-300 font-semibold"
            >
              취소
            </Link>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="relative z-10 text-xs text-gray-600 mt-16 px-10 py-8 bg-white/50 backdrop-blur-sm border-t border-white/50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-semibold mb-2">SyncView - AI 기반 글로벌 뉴스 플랫폼</p>
          <p className="text-gray-500">Copyright © 2025 SyncView. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
