import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

export default function Navbar({ user, setUser, logoVariant = "default" }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    if (setUser) setUser(null);
    navigate("/");
  };

  return (
    <nav className="relative z-50 flex justify-between items-center px-8 py-4 bg-white/90 backdrop-blur-lg dark:bg-slate-900/90 shadow-lg">
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="focus:outline-none hover:scale-105 transition-transform"
          aria-label="SyncView 홈으로 이동"
        >
          <Logo size={36} variant={logoVariant} />
        </button>
        
        {/* 메뉴 링크 */}
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={() => navigate("/about")}
            className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
          >
            SyncView 소개
          </button>
        </div>
      </div>

      {user ? (
        <div className="flex items-center space-x-4">
          <span className="text-gray-700 dark:text-gray-200 text-sm font-medium">{user.email}</span>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            로그아웃
          </button>
        </div>
      ) : (
        <div className="space-x-3">
          <button
            onClick={() => navigate("/login")}
            className="px-5 py-2.5 border-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all"
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
    </nav>
  );
}


