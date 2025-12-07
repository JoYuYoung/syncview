import React from "react";

/**
 * Logo: SyncView 워드마크 + 심볼 SVG
 * - variant: 'default' | 'inverted' | 'mono'
 *   - default: 하늘색→파란색 그라디언트(라이트 배경용)
 *   - inverted: 밝은 시안→화이트 그라디언트(다크 배경용)
 *   - mono: 단색(텍스트/심볼 모두 동일색)
 * - size: 로고 높이(px). 가로는 비율에 맞춰 자동
 */
export default function Logo({ variant = "default", size = 28 }) {
  const isMono = variant === "mono";
  const isInverted = variant === "inverted";

  const monoColor = isInverted ? "#FFFFFF" : "#0F172A"; // dark: white, light: slate-900

  // 그라디언트 색상 프리셋
  const gradStart = isInverted ? "#67E8F9" : "#38BDF8"; // cyan-300 or sky-400→sky-500(더 진함)
  const gradEnd = isInverted ? "#FFFFFF" : "#1D4ED8";   // white or blue-700(더 진함)

  // 심볼/텍스트 비율: 높이 = size, 가로 비율 약 8.5배
  const height = size;
  const width = Math.round(size * 8.5);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 850 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SyncView"
    >
      <defs>
        <linearGradient id="sv-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradStart} />
          <stop offset="100%" stopColor={gradEnd} />
        </linearGradient>
      </defs>

      {/* 워드마크만 사용: 더 진한 색감, 더 두껍게, 타이트한 자간 */}
      <g transform="translate(0,78)">
        <defs>
          <style>{`
            .sv-text { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; font-weight: 700; letter-spacing: -0.03em; dominant-baseline: alphabetic; }
          `}</style>
        </defs>
        {isMono ? (
          <text className="sv-text" x="0" y="0" fontSize="68" fill={monoColor}>SyncView</text>
        ) : (
          <text className="sv-text" x="0" y="0" fontSize="68" fill="url(#sv-grad)">SyncView</text>
        )}
      </g>
    </svg>
  );
}


