import React from "react";

// 감성 분석 배지 컴포넌트
export default function SentimentBadge({ sentiment, score, size = "md" }) {
  // sentiment: "positive", "negative", "neutral"
  // score: 0-1 사이의 신뢰도
  
  const sentimentConfig = {
    positive: {
      label: "긍정적",
      color: "bg-green-50 text-green-700 border-green-200",
      description: "이 뉴스는 긍정적이고 낙관적인 톤으로 작성되었습니다"
    },
    negative: {
      label: "부정적",
      color: "bg-red-50 text-red-700 border-red-200",
      description: "이 뉴스는 부정적이거나 우려스러운 내용을 담고 있습니다"
    },
    neutral: {
      label: "중립적",
      color: "bg-gray-50 text-gray-700 border-gray-200",
      description: "이 뉴스는 중립적이고 객관적인 톤으로 작성되었습니다"
    }
  };

  const config = sentimentConfig[sentiment] || sentimentConfig.neutral;
  const percentage = Math.round((score || 0.5) * 100);

  if (size === "sm") {
    // 작은 사이즈 - 뉴스 목록용
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} border`}>
        {config.label}
      </span>
    );
  }

  // 기본 사이즈 - 상세 페이지용
  return (
    <div className={`rounded-lg border p-4 ${config.color}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          sentiment === "positive" ? "bg-green-500" :
          sentiment === "negative" ? "bg-red-500" : "bg-gray-400"
        }`}>
          <div className="w-5 h-5 bg-white/40 rounded-full"></div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm">
              {config.label}
            </h4>
            <span className="text-xs font-medium">
              신뢰도: {percentage}%
            </span>
          </div>
          <p className="text-xs opacity-80 leading-relaxed">
            {config.description}
          </p>
          {/* 신뢰도 바 */}
          <div className="mt-2 w-full bg-white/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                sentiment === "positive" ? "bg-green-500" :
                sentiment === "negative" ? "bg-red-500" : "bg-gray-400"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}





