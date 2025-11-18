import React from "react";

// 유사/관련 뉴스 섹션 컴포넌트
export default function RelatedNews({ articles = [], onSelectArticle }) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="border-t pt-4 mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
        <div className="w-4 h-4 mr-2 bg-blue-500 rounded-sm"></div>
        이 기사와 유사한 뉴스 ({articles.length})
      </h4>
      <div className="space-y-2">
        {articles.map((article, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectArticle && onSelectArticle(article)}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition group"
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 font-mono mt-0.5">
                {(article.similarity * 100).toFixed(0)}%
              </span>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-blue-700">
                  {article.title}
                </h5>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                  {article.summary || article.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


