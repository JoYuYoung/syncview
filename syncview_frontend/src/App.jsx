// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Welcome from "./pages/Welcome";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import NewsFeed from "./pages/NewsFeed";
import Analytics from "./pages/Analytics";
import Bookmark from "./pages/Bookmark";
import Subscription from "./pages/Subscription";
import Notification from "./pages/Notification";
import Profile from "./pages/Profile";
import Customized from "./pages/Customized";

export default function App() {
  // ✅ 로그인 상태 관리
  const [user, setUser] = useState(null);

  // ✅ 백엔드 서버 깨우기 (슬립 모드 방지)
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

    fetch(`${API_URL}/health`)
      .then(() => console.log("✅ 백엔드 서버 연결됨"))
      .catch((err) =>
        console.warn("⚠️ 백엔드 연결 실패 (슬립 모드일 수 있음):", err)
      );
  }, []);

  // ✅ 새로고침 시에도 로그인 유지
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome user={user} setUser={setUser} />} />
        <Route path="/about" element={<About user={user} setUser={setUser} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register setUser={setUser} />} />
        <Route
          path="/auth/callback"
          element={<AuthCallback setUser={setUser} />}
        />

        {/* ✅ 여기서부터 메인 서비스 페이지들 */}
        <Route
          path="/newsfeed"
          element={<NewsFeed user={user} setUser={setUser} />}
        />
        <Route
          path="/analytics"
          element={<Analytics user={user} setUser={setUser} />}
        />
        <Route
          path="/bookmark"
          element={<Bookmark user={user} setUser={setUser} />}
        />
        <Route
          path="/subscription"
          element={<Subscription user={user} setUser={setUser} />}
        />
        <Route
          path="/notification"
          element={<Notification user={user} />}
        />
        <Route
          path="/profile"
          element={<Profile user={user} setUser={setUser} />}
        />
        <Route
          path="/customized"
          element={<Customized user={user} setUser={setUser} />}
        />

        {/* 로그인이 필요한 페이지 예시 */}
        <Route
          path="/protected"
          element={
            user ? (
              <NewsFeed user={user} setUser={setUser} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
