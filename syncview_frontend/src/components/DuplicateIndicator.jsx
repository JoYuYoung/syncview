import React, { useState } from "react";

// 중복/유사 기사 표시 컴포넌트
export default function DuplicateIndicator({ count, similarArticles = [] }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!count || count <= 0) return null;

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        +{count}
      </button>

      {/* 툴팁 */}
      {showTooltip && similarArticles.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-10 w-64 bg-white rounded-lg shadow-lg border p-3 text-xs">
          <p className="font-semibold text-gray-700 mb-2">유사 기사 {count}개</p>
          <ul className="space-y-1">
            {similarArticles.slice(0, 3).map((article, i) => (
              <li key={i} className="text-gray-600 line-clamp-2 pl-2 border-l-2 border-gray-200">
                {article.title || article}
              </li>
            ))}
          </ul>
          {count > 3 && (
            <p className="text-gray-400 mt-2">외 {count - 3}개</p>
          )}
        </div>
      )}
    </div>
  );
}





