import React, { useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Welcome({ user, setUser }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Google OAuth 콜백 처리
  useEffect(() => {
    const googleAuth = searchParams.get("google_auth");
    const userId = searchParams.get("user_id");
    const email = searchParams.get("email");
    const username = searchParams.get("username");
    
    if (googleAuth === "success" && userId && email) {
      // Google 로그인 성공 → localStorage 저장 및 로그인 처리
      const userData = {
        id: parseInt(userId),
        email: email,
        username: username || email.split("@")[0]
      };
      
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      
      console.log("✅ Google 로그인 성공:", userData);
      
      // URL 파라미터 제거하고 Welcome 페이지 유지 (깔끔한 URL)
      navigate("/", { replace: true });
    }
  }, [searchParams, setUser, navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      <Navbar user={user} setUser={setUser} logoVariant="default" />
      <main className="max-w-6xl mx-auto px-6 relative z-10">
        <Hero />
        <Stats />
        <Features />
        <CTA user={user} />
      </main>
    </div>
  );
}

/* ----------------- 컴포넌트 정의 ----------------- */

// 기존 내장 Navbar 제거되었습니다 (전역 Navbar 사용)

function Hero() {
  return (
    <section className="relative bg-white/95 backdrop-blur-lg rounded-3xl p-12 md:p-16 mt-8 ring-2 ring-white/50 shadow-2xl shadow-blue-200/50 overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-sky-400 to-blue-400 rounded-full blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg">
          AI 기반 뉴스 플랫폼
        </div>
        
        <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 animate-gradient">
          글로벌 뉴스를<br />한눈에
        </h2>
        
        <p className="text-gray-700 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          SyncView는 전 세계 주요 매체의 뉴스를 한곳에 모아 <span className="font-semibold text-blue-600">AI로 요약·번역·분석</span>합니다.
          더 빠르고 간결하게 핵심만 읽어보세요.
        </p>
        
        <div className="flex flex-wrap justify-center gap-8 pt-6">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm font-medium">실시간 업데이트</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm font-medium">2개 언어 지원</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm font-medium">AI 요약 & 분석</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { number: "3", label: "언론사" },
    { number: "2", label: "지원 언어" },
    { number: "85%", label: "요약 정확도" },
    { number: "24/7", label: "실시간 업데이트" },
  ];

  return (
    <section className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center ring-1 ring-white/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            {stat.number}
          </div>
          <div className="text-gray-600 text-sm font-medium">{stat.label}</div>
        </div>
      ))}
    </section>
  );
}

function Features() {
  const items = [
    { 
      title: "자동 뉴스 수집", 
      desc: "실시간 뉴스 업데이트", 
      gradient: "from-blue-500 to-cyan-500"
    },
    { 
      title: "AI 요약", 
      desc: "기사를 핵심만 요약", 
      gradient: "from-purple-500 to-pink-500"
    },
    { 
      title: "반응 분석", 
      desc: "뉴스 분위기 분석", 
      gradient: "from-orange-500 to-red-500"
    },
    { 
      title: "중복 뉴스 제거", 
      desc: "유사 뉴스 자동 정리", 
      gradient: "from-green-500 to-emerald-500"
    },
    { 
      title: "분석 대시보드", 
      desc: "트렌드 차트 시각화", 
      gradient: "from-indigo-500 to-purple-500"
    },
  ];

  return (
    <section className="mt-20">
      <div className="text-center mb-12">
        <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          SyncView의 핵심 기능
        </h3>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          AI 기술로 뉴스 소비의 새로운 경험을 제공합니다.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-stretch">
        {items.map((item, i) => (
          <div
            key={i}
            className="group relative bg-white/90 backdrop-blur-sm rounded-2xl p-8 ring-1 ring-white/50 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col"
          >
            {/* 그라데이션 배경 효과 */}
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
            
            {/* 텍스트 */}
            <div className="relative flex-1 flex flex-col">
              <h4 className="text-lg font-bold mb-2 text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-600 transition-all min-h-[3.5rem]">
                {item.title}
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </div>

            {/* 하단 장식선 */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient} rounded-b-2xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA({ user }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (user) {
      // 구독 설정 확인
      const hasSubscription = localStorage.getItem('subscription');
      if (hasSubscription) {
        console.log("✅ 로그인 상태 + 구독 설정 있음, NewsFeed로 이동");
        navigate("/newsfeed");
      } else {
        console.log("✅ 로그인 상태 + 구독 설정 없음, Subscription으로 이동");
        navigate("/subscription");
      }
    } else {
      console.log("❌ 비로그인 상태, Login으로 이동");
      navigate("/login");
    }
  };

  return (
    <section className="relative rounded-3xl p-12 md:p-16 mt-20 mb-16 text-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-2xl">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-grid-white opacity-10"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      
      <div className="relative z-10">
        <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-full mb-6">
          지금 시작하세요.
        </div>
        <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white drop-shadow-lg">
          당신의 뉴스 소비 방식을<br />혁신하세요
        </h3>
        <p className="text-white/90 text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
          SyncView와 함께라면 핵심만 빠르게, 필요한 것만 정확하게.<br />
          AI가 전 세계 뉴스를 당신을 위해 정리합니다.
        </p>
        <button
          onClick={handleClick}
          className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-blue-600 bg-white rounded-full shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all duration-300"
        >
          <span className="relative z-10">지금 바로 시작하기</span>
          <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
        
        <div className="mt-10 flex justify-center text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>무료로 시작</span>
          </div>
        </div>
      </div>
    </section>
  );
}



