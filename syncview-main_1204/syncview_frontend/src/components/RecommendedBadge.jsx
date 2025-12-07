import React from "react";

// 추천 뉴스 배지 컴포넌트
export default function RecommendedBadge({ reason = "맞춤 추천", size = "sm" }) {
  // reason: "interest" (관심사 기반), "history" (읽은 기사 기반), "trending" (인기)
  
  const reasonConfig = {
    interest: {
      label: "관심사 기반",
      color: "bg-purple-50 text-purple-700 border-purple-200"
    },
    history: {
      label: "읽은 기사 기반",
      color: "bg-blue-50 text-blue-700 border-blue-200"
    },
    both: {
      label: "관심사 + 읽기 패턴",
      color: "bg-green-50 text-green-700 border-green-200"
    },
    trending: {
      label: "인기 급상승",
      color: "bg-orange-50 text-orange-700 border-orange-200"
    },
    default: {
      label: "맞춤 추천",
      color: "bg-yellow-50 text-yellow-700 border-yellow-200"
    }
  };

  const config = reasonConfig[reason] || reasonConfig.default;

  if (size === "xs") {
    return (
      <span className="inline-flex items-center">
        <div className="w-3 h-3 rounded-full bg-current opacity-20"></div>
      </span>
    );
  }

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} border`}>
        {config.label}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${config.color} border`}>
      {config.label}
    </div>
  );
}





