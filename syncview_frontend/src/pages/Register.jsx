import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/api"; // api.js에서 불러오기

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    phone: "",
    birth: "",
    emailLocal: "",
    emailDomain: "naver.com",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 이메일 합치기
    const email = `${form.emailLocal}@${form.emailDomain}`;

    const userData = {
      username: form.username,
      password: form.password,
      email,
    };

    try {
      const result = await registerUser(userData);
      alert(result.msg); // 성공 메시지
      navigate("/login"); // 회원가입 성공 시 로그인 페이지로 이동
    } catch (err) {
      alert("회원가입 실패: " + err.message);
    }
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
            새로운 계정 만들기
          </div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            회원가입
          </h2>
          <p className="text-gray-600">SyncView와 함께 뉴스를 새롭게 경험하세요</p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-2xl p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
          {/* 아이디 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">아이디</label>
            <input
              type="text"
              name="username"
              placeholder="아이디 입력"
              value={form.username}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">비밀번호</label>
            <input
              type="password"
              name="password"
              placeholder="비밀번호 (10자 이내)"
              maxLength={10}
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </div>

          {/* 이름 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">이름</label>
            <input
              type="text"
              name="name"
              placeholder="이름 입력"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* 전화번호 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">전화번호</label>
            <input
              type="tel"
              name="phone"
              placeholder="11자리 입력 ('-' 제외)"
              maxLength={11}
              value={form.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* 생년월일 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">생년월일</label>
            <input
              type="text"
              name="birth"
              placeholder="생년월일 6자리 (예: 990101)"
              maxLength={6}
              value={form.birth}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* 이메일 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">이메일 주소</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                name="emailLocal"
                placeholder="이메일"
                value={form.emailLocal}
                onChange={handleChange}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
              <span className="text-gray-600 font-semibold">@</span>
              <select
                name="emailDomain"
                value={form.emailDomain}
                onChange={handleChange}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white cursor-pointer"
              >
                <option>naver.com</option>
                <option>gmail.com</option>
                <option>daum.net</option>
              </select>
            </div>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            회원가입 완료
          </button>

          {/* 로그인 링크 */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
              >
                로그인하기
              </button>
            </p>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
