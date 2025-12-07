import React from "react";
import Navbar from "../components/Navbar";

export default function About({ user, setUser }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      
      <Navbar user={user} setUser={setUser} logoVariant="default" />
      
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* 헤더 섹션 */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg mb-6">
            About SyncView
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            뉴스 읽기, 이제 더 쉽고 빠르게
          </h1>
          <p className="text-gray-700 text-lg max-w-3xl mx-auto leading-relaxed">
            매일 쏟아지는 뉴스, 다 읽기 힘드셨죠?<br />
            SyncView가 AI로 핵심만 정리해드립니다.
          </p>
        </div>

        {/* SyncView란? */}
        <section className="bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-lg p-8 md:p-12 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-white/40 rounded-full"></div>
            </div>
            SyncView란?
          </h2>
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p className="text-lg">
              <strong className="text-blue-600">SyncView</strong>는 바쁜 일상 속에서도 세계 뉴스를 놓치지 않도록 도와주는 스마트 뉴스 플랫폼입니다.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <p className="text-base mb-4">
                "긴 영어 기사를 읽을 시간이 없어요", "중요한 뉴스만 빠르게 보고 싶어요"
              </p>
              <p className="text-sm text-gray-600">
                이런 고민을 하셨다면 SyncView가 정답입니다!
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 rounded-lg p-5 border border-blue-200 hover:shadow-md transition-shadow text-center">
                <p className="font-semibold text-blue-900 mb-2">시간 절약</p>
                <p className="text-sm text-blue-700">긴 기사를 3줄로 요약</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-5 border border-blue-200 hover:shadow-md transition-shadow text-center">
                <p className="font-semibold text-blue-900 mb-2">언어 장벽 해소</p>
                <p className="text-sm text-blue-700">영어 뉴스를 한국어로</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-5 border border-blue-200 hover:shadow-md transition-shadow text-center">
                <p className="font-semibold text-blue-900 mb-2">트렌드 파악</p>
                <p className="text-sm text-blue-700">차트로 한눈에 확인</p>
              </div>
            </div>
          </div>
        </section>

        {/* 이용 방법 */}
        <section className="bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-lg p-8 md:p-12 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-white/40 rounded-sm"></div>
            </div>
            이렇게 사용하세요
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">회원가입</h3>
              <p className="text-sm text-gray-600">
                간단한 회원가입으로<br />서비스를 시작하세요
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">2</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">관심사 선택</h3>
              <p className="text-sm text-gray-600">
                경제, 정치, 연예 등<br />관심 분야를 선택하세요
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">뉴스 확인</h3>
              <p className="text-sm text-gray-600">
                AI가 요약한 뉴스를<br />빠르게 확인하세요
              </p>
            </div>
          </div>
          
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <p className="text-center text-gray-700">
              <strong className="text-blue-600">단 5분</strong>이면 세계 뉴스의 핵심을 파악할 수 있습니다!
            </p>
          </div>
        </section>

        {/* 주요 기능 */}
        <section className="bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-lg p-8 md:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-white/40 rounded-sm"></div>
            </div>
            이런 점이 좋아요!
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-5 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                하루 종일 최신 뉴스
              </h4>
              <p className="text-sm text-gray-600 ml-7">24시간 실시간으로 뉴스를 업데이트해드려요</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-5 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                3줄 요약
              </h4>
              <p className="text-sm text-gray-600 ml-7">긴 기사도 AI가 핵심만 뽑아 3줄로 정리해요</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-5 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                뉴스 분위기 알림
              </h4>
              <p className="text-sm text-gray-600 ml-7">긍정/부정 뉴스를 한눈에 파악할 수 있어요</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-5 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                중복 뉴스 제거
              </h4>
              <p className="text-sm text-gray-600 ml-7">같은 내용은 하나로 정리해서 보여드려요</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-5 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                트렌드 차트
              </h4>
              <p className="text-sm text-gray-600 ml-7">어떤 뉴스가 인기인지 차트로 확인하세요</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-5 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                맞춤 추천
              </h4>
              <p className="text-sm text-gray-600 ml-7">내 관심사에 맞는 뉴스를 먼저 보여드려요</p>
            </div>
          </div>
          
          <div className="mt-8 text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <p className="text-lg font-semibold text-gray-800 mb-2">
              지금 바로 시작하세요!
            </p>
            <p className="text-sm text-gray-600">
              무료로 회원가입하고 스마트한 뉴스 읽기를 경험해보세요
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

