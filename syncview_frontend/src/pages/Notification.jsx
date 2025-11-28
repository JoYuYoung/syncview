import React from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";

export default function Notification({ user }) {
  // 알림 예시 데이터
  const notifications = [
    "SyncView에서 구독하신 CNN에서 뉴스가 업데이트 되었습니다.",
    "SyncView에서 구독하신 CNN에서 뉴스가 업데이트 되었습니다.",
    "SyncView에서 구독하신 CNN에서 뉴스가 업데이트 되었습니다.",
    "SyncView에서 구독하신 CNN에서 뉴스가 업데이트 되었습니다.",
    "SyncView에서 구독하신 CNN에서 뉴스가 업데이트 되었습니다.",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="flex justify-between items-center px-8 py-4 border-b bg-white">
        <Link to="/" aria-label="홈으로">
          <Logo size={36} variant="default" />
        </Link>
        <nav className="flex gap-6 text-gray-700">
          <Link to="/newsfeed" className="hover:text-blue-600">홈</Link>
          <Link to="/analytics" className="hover:text-blue-600">분석</Link>
          <Link to="/subscription" className="hover:text-blue-600">구독</Link>
          <Link to="/bookmark" className="hover:text-blue-600">북마크</Link>
          <Link to="/notification" className="text-blue-600 font-semibold">알림</Link>
        </nav>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="저장된 뉴스 검색..."
            className="border rounded-full px-4 py-1 focus:outline-none"
          />
          

        </div>
        <Link to="/profile">
  <div
    className="w-8 h-8 rounded-full bg-gray-300 cursor-pointer flex items-center justify-center text-sm font-semibold text-gray-700 hover:ring-2 hover:ring-blue-400 transition"
    title="프로필 보기"
  >
    {user?.username ? user.username[0].toUpperCase() : "U"}
  </div>
</Link>
      </header>

      {/* 메인 */}
      <main className="px-10 py-12 flex flex-col items-center">
        <h2 className="text-xl font-bold mb-10">
          {notifications.length} 개의 알림이 왔습니다.
        </h2>

        <div className="w-full max-w-5xl bg-white rounded-xl shadow-sm p-6">
          {notifications.map((msg, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center border-b last:border-none py-3 px-2"
            >
              <span className="text-gray-700 text-sm">{msg}</span>
              <button className="px-3 py-1 text-xs border rounded hover:bg-gray-100">
                삭제
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="text-xs text-gray-500 mt-12 px-10 py-6 border-t text-center">
        <p className="font-semibold mb-2">SyncView - AI 기반 글로벌 뉴스 플랫폼</p>
        <p className="text-gray-500">
          Copyright © 2025 SyncView. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
