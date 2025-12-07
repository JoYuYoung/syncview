import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback({ setUser }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // URL 파라미터에서 사용자 정보 추출
    const user_id = searchParams.get("user_id");
    const email = searchParams.get("email");
    const username = searchParams.get("username");

    if (user_id && email && username) {
      // 로그인 상태 저장
      const userData = {
        id: parseInt(user_id),
        email: email,
        username: username
      };
      
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      // 홈으로 이동
      navigate("/");
    } else {
      // 실패 시 로그인 페이지로 이동
      alert("Google 로그인에 실패했습니다.");
      navigate("/login");
    }
  }, [searchParams, setUser, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-lg font-semibold text-gray-700">Google 로그인 중...</p>
      </div>
    </div>
  );
}

