import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/api"; // API 호출 함수

export default function Login({ setUser }) {
  console.log("🟢 Login 컴포넌트 렌더링됨"); // 페이지 진입 시 찍혀야 함

  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🔵 로그인 버튼 눌림", form); // 버튼 눌리면 무조건 찍혀야 함

    try {
      const result = await loginUser(form);
      console.log("✅ 서버 응답:", result);
      alert(result.msg);

      // ✅ 로그인 상태 저장 (localStorage + App 전역 상태)
      const userData = { 
        id: result.user_id, 
        email: result.email,
        username: result.username 
      };
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      // ✅ 로그인 성공 시 Welcome(루트 페이지)으로 이동
      navigate("/");
    } catch (err) {
      console.error("❌ 로그인 에러:", err);
      alert("로그인 실패: " + err.message);
    }
  };

  const handleGoogleLogin = () => {
    // 백엔드 Google OAuth URL로 리다이렉트
    window.location.href = "http://localhost:8000/auth/google";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative overflow-hidden flex items-center justify-center py-12 px-4">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg mb-4">
            안전한 로그인
          </div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            로그인
          </h2>
          <p className="text-gray-600">
            SyncView에 오신 것을 환영합니다
          </p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-2xl p-8">
          {/* 로그인 폼 */}
          <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">이메일</label>
              <input
                type="email"
                name="email"
                placeholder="이메일을 입력하세요"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                name="password"
                placeholder="비밀번호를 입력하세요"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            >
              로그인
            </button>
          </form>

          {/* 구분선 */}
          <div className="my-6 flex items-center">
            <hr className="flex-1 border-gray-300" />
            <span className="px-3 text-sm text-gray-400 font-medium">또는</span>
            <hr className="flex-1 border-gray-300" />
          </div>

          {/* 구글 로그인 */}
          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all group"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-semibold text-gray-700 group-hover:text-gray-900">Google로 로그인</span>
          </button>

          {/* 회원가입 이동 */}
          <div className="text-center pt-6">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
              >
                회원가입하기
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
