// src/components/Navbar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";

export default function Navbar({ user, setUser, logoVariant = "default" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    if (setUser) setUser(null);
    navigate("/");
  };

  const menus = [
    { label: "홈", path: "/newsfeed" },
    { label: "분석", path: "/analytics" },
    { label: "북마크", path: "/bookmark" },
  ];

  const getInitial = () => {
    if (!user) return "A";
    const src = user.name || user.username || user.email || "";
    return src.trim().charAt(0).toUpperCase() || "A";
  };

  const handleLogoClick = () => {
    if (user) {
      navigate("/newsfeed");
    } else {
      navigate("/");
    }
  };

  return (
    <nav className="relative z-50 bg-white/90 backdrop-blur-lg shadow-lg">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-8 py-4">
        {/* 왼쪽: 로고 + 메뉴 */}
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={handleLogoClick}
            className="focus:outline-none hover:scale-105 transition-transform"
            aria-label="SyncView 홈으로 이동"
          >
            <Logo size={36} variant={logoVariant} />
          </button>

          {/* 로그인 O: 홈/분석/북마크 탭 */}
          {user && (
            <div className="hidden md:flex items-center gap-6">
              {menus.map((item) => {
                const active = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                      active
                        ? "text-blue-600 border-blue-600"
                        : "text-gray-700 border-transparent hover:text-blue-600"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 로그인 X: 소개 링크만 */}
          {!user && (
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => navigate("/about")}
                className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
              >
                SyncView 소개
              </button>
            </div>
          )}
        </div>

        {/* 오른쪽: 로그인 상태에 따라 분기 */}
        {user ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/profile")}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center text-white font-semibold shadow-md"
              aria-label="프로필 설정으로 이동"
            >
              {getInitial()}
            </button>
            {/* 필요하면 로그아웃 버튼 다시 노출
            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex px-4 py-2 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              로그아웃
            </button>
            */}
          </div>
        ) : (
          <div className="space-x-3">
            <button
              onClick={() => navigate("/login")}
              className="px-5 py-2.5 border-2 rounded-lg text-sm font-semibold text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              로그인
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              회원가입
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
