import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Logo from "../components/Logo";
import { getUserStats } from "../services/api";

export default function Analytics({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 백엔드에서 실제 통계 데이터 가져오기
  useEffect(() => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    getUserStats(user.id)
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) => {
        console.error("통계 데이터 불러오기 실패:", err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  // 감성 분석 통계 데이터 (백엔드 데이터 기반)
  const sentimentData = stats?.sentiment_distribution.map(item => ({
    name: item.label === "positive" ? "긍정" : item.label === "negative" ? "부정" : "중립",
    value: item.count,
    color: item.label === "positive" ? "#10b981" : item.label === "negative" ? "#ef4444" : "#6b7280"
  })) || [];

  // 읽기 활동 통계 (백엔드 데이터 기반)
  const readingData = stats?.daily_read_counts.map(item => ({
    day: new Date(item.date).toLocaleDateString('ko-KR', { weekday: 'short' }),
    articles: item.count
  })).reverse() || [];

  // 카테고리별 기사 수 (백엔드 데이터 기반)
  const categoryData = stats?.category_distribution.map(item => ({
    category: item.category,
    count: item.count
  })) || [];

  // 총 감성 개수 계산
  const totalSentiment = sentimentData.reduce((sum, item) => sum + item.value, 0);
  
  // 긍정 비율 계산
  const positiveRatio = totalSentiment > 0 
    ? Math.round((sentimentData.find(item => item.name === "긍정")?.value || 0) / totalSentiment * 100)
    : 0;

  // 일평균 읽은 기사 수 계산
  const avgDaily = readingData.length > 0
    ? (readingData.reduce((sum, item) => sum + item.articles, 0) / readingData.length).toFixed(1)
    : "0.0";

  // 인기 카테고리 계산
  const topCategory = categoryData.length > 0
    ? categoryData.reduce((max, item) => item.count > max.count ? item : max, categoryData[0])
    : { category: "-", count: 0 };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs text-gray-600">
              <span style={{ color: entry.color }}>●</span> {entry.name}: {entry.value}개
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 통계 카드 컴포넌트
  const StatCard = ({ title, value, subtitle, color }) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/50">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
            <div className="w-6 h-6 bg-white/40 rounded-full"></div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
    </div>
  );

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100">
        <div className="text-center p-8 bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">분석 대시보드를 보려면 로그인해주세요.</p>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100">
        <div className="text-center p-8 bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">통계 데이터 불러오는 중...</h2>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100">
        <div className="text-center p-8 bg-white/90 backdrop-blur-sm rounded-2xl ring-1 ring-white/50 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">데이터를 불러올 수 없습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      {/* 네비게이션 */}
      <header className="relative z-10 grid grid-cols-3 items-center px-8 py-4 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="flex justify-start">
          <Link to="/" aria-label="홈으로">
            <Logo size={36} variant="default" />
          </Link>
        </div>
        <nav className="flex justify-center gap-6 text-gray-700">
          <Link to="/newsfeed" className="hover:text-blue-600 transition-colors">홈</Link>
          <Link to="/analytics" className="text-blue-600 font-semibold">분석</Link>
          {!localStorage.getItem('subscription') && <Link to="/subscription" className="hover:text-blue-600 transition-colors">구독</Link>}
          <Link to="/bookmark" className="hover:text-blue-600 transition-colors">북마크</Link>
        </nav>
        <div className="flex justify-end items-center gap-3">
          <Link to="/profile">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 cursor-pointer flex items-center justify-center text-sm font-semibold text-white hover:ring-2 hover:ring-blue-400 hover:scale-105 transition-all shadow-lg"
              title={user?.email || "프로필 보기"}
            >
              {user?.username ? user.username[0].toUpperCase() : "U"}
            </div>
          </Link>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="relative z-10 px-8 py-8 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            뉴스 분석 대시보드
          </h1>
          <p className="text-gray-600">AI 기반 뉴스 감성 분석 및 트렌드를 한눈에 확인하세요</p>
        </div>

        {/* 통계 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="총 읽은 기사"
            value={stats?.total_read_articles || 0}
            subtitle="누적 기사 수"
            color="bg-blue-100"
          />
          <StatCard
            title="긍정 비율"
            value={`${positiveRatio}%`}
            subtitle="감성 분석 결과"
            color="bg-green-100"
          />
          <StatCard
            title="인기 카테고리"
            value={topCategory.category}
            subtitle={`${topCategory.count}개 기사`}
            color="bg-orange-100"
          />
          <StatCard
            title="일평균 읽기"
            value={avgDaily}
            subtitle="최근 7일 평균"
            color="bg-indigo-100"
          />
        </div>

        {/* 차트 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 감성 분석 통계 - 도넛 차트 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              감성 분석 통계
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="text-sm font-semibold text-gray-800">
                            {payload[0].name}: {payload[0].value}개 ({((payload[0].value / 100) * 100).toFixed(0)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {sentimentData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 읽기 활동 통계 - 바 차트 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              읽기 활동 통계
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={readingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="articles" fill="#8b5cf6" radius={[8, 8, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 카테고리별 분포 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            카테고리별 기사 분포
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis dataKey="category" type="category" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#ec4899" radius={[0, 8, 8, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </main>

      {/* 푸터 */}
      <footer className="relative z-10 text-xs text-gray-600 mt-12 px-10 py-8 bg-white/50 backdrop-blur-sm border-t border-white/50">
        <div className="max-w-6xl mx-auto text-center">
          <p className="font-semibold mb-2">SyncView Analytics Dashboard</p>
          <p className="text-gray-500">AI 기반 뉴스 분석으로 스마트한 정보 소비를 경험하세요</p>
        </div>
      </footer>
    </div>
  );
}


