import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

function Profile({ user, setUser }) {
  const navigate = useNavigate();
  
  // 구독 설정 상태
  const topicOptions = ['정치','경제','사회','국제','IT/과학','스포츠'];
  const sourceOptions = ['BBC','Reuters (로이터)','CNN'];
  
  const [subscription, setSubscription] = React.useState(() => {
    const saved = localStorage.getItem('subscription');
    return saved ? JSON.parse(saved) : { topic: '', source: '' };
  });

  // 로그인 안 했으면 안내 메시지
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-2xl p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">로그인 필요</h2>
          <p className="text-gray-700 mb-6">프로필을 보기 위해 로그인해주세요.</p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  // 로그인 했으면 폼 렌더
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("subscription", JSON.stringify(subscription));
    alert("저장되었습니다!");
    navigate("/newsfeed");
  };
  
  const handleSubscriptionChange = (field, value) => {
    setSubscription(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("subscription");
    setUser(null);
    alert("로그아웃 되었습니다.");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
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
          {!localStorage.getItem('subscription') && <Link to="/subscription" className="hover:text-blue-600 transition-colors">구독</Link>}
          <Link to="/bookmark" className="hover:text-blue-600 transition-colors">북마크</Link>
        </nav>
        <div className="flex justify-end items-center gap-3">
          <Link to="/profile">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 cursor-pointer flex items-center justify-center text-sm font-semibold text-white ring-2 ring-blue-400 hover:scale-105 transition-all shadow-lg"
              title="프로필 보기"
            >
              {user?.username ? user.username[0].toUpperCase() : "U"}
            </div>
          </Link>
        </div>
      </header>

      {/* 메인 */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* 헤더 섹션 */}
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg mb-4">
              내 정보
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              프로필 설정
            </h2>
            <p className="text-gray-700 text-lg">
              회원 정보를 관리하고 설정을 변경하세요
            </p>
          </div>

          {/* 프로필 카드 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-2xl p-8 mb-6">
            {/* 프로필 이미지 */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                {user.username ? user.username[0].toUpperCase() : "U"}
              </div>
            </div>

            {/* 이메일 정보 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">이메일</label>
              <div className="w-full px-4 py-3 bg-gray-100 rounded-xl text-gray-600 border-2 border-gray-200">
                {user.email}
              </div>
              <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다</p>
            </div>

            {/* 사용자 이름 */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">사용자 이름</label>
              <input
                type="text"
                name="username"
                value={user.username || ""}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="사용자 이름을 입력하세요"
              />
            </div>

            {/* 구독 설정 */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">구독 설정</h3>
              
              {/* 주제 선택 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">주제</label>
                <select
                  value={subscription.topic}
                  onChange={(e) => handleSubscriptionChange('topic', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">선택하세요</option>
                  {topicOptions.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
              
              {/* 매체 선택 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">매체</label>
                <select
                  value={subscription.source}
                  onChange={(e) => handleSubscriptionChange('source', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">선택하세요</option>
                  {sourceOptions.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 버튼 그룹 */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-200"
              >
                변경사항 저장
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-4 bg-white text-gray-700 rounded-xl font-bold ring-2 ring-gray-200 hover:bg-red-50 hover:ring-red-400 hover:text-red-600 transition-all duration-200"
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* 추가 정보 카드 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">계정 정보</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">가입일</span>
                <span className="font-semibold text-gray-900">2025년 11월</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">계정 상태</span>
                <span className="font-semibold text-green-600">활성</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">회원 등급</span>
                <span className="font-semibold text-blue-600">일반 회원</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="relative z-10 text-xs text-gray-600 mt-16 px-10 py-8 bg-white/50 backdrop-blur-sm border-t border-white/50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-semibold mb-2">SyncView - AI 기반 글로벌 뉴스 플랫폼</p>
          <p className="text-gray-500">
            Copyright © 2025 SyncView. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Profile;

