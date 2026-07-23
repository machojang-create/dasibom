import React from 'react';

/* 물고기 먹이 알갱이(2026-07-23 Macho: "조그만 덩어리라 퀄리티 떨어짐") — 먹이 상점 이미지에 맞춰 종류별로.
   밥=구수한 빵부스러기, 프리미엄=바삭 플레이크, 새우=주황 새우, 크릴=반짝 금빛 크릴.
   seed로 살짝 회전·형태를 흩어 자연스럽게. React.memo로 매 프레임 재생성 없음(위치는 부모 transform이 담당). */
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0; return Math.abs(h); }

function FoodBitBase({ type, seed }: { type: string; seed: string }) {
  const h = hash(seed);
  const rot = (h % 360);

  if (type === 'shrimp') {
    // 통통한 주황 새우 — 살짝 굽은 몸통
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))' }}>
        <path d="M6 15 C4 11 6 6 11 5 C16 4 20 7 19 11 C18.5 13 17 14 15 14 L15 16 C15 17 13 17 13 16 L13 14 C11 14.4 8 15.5 6 15 Z"
          fill="#fb923c" stroke="#c2410c" strokeWidth="1" />
        <circle cx="16" cy="8.5" r="1.1" fill="#7c2d12" />
        <path d="M8 13 L10 11 M10 13.5 L12 11.5 M12 13.8 L14 12" stroke="#ea580c" strokeWidth="0.9" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'krill') {
    // 반짝이는 금빛 크릴 — 광채 링
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 0 4px rgba(250,204,21,.9))' }}>
        <ellipse cx="12" cy="12" rx="8" ry="4.5" fill="url(#krG)" stroke="#b45309" strokeWidth="1" />
        <path d="M6 12 L10 9.5 M6.5 13.5 L10.5 11.5 M15 9.5 L18.5 11 M15 12.5 L18.5 13" stroke="#fde68a" strokeWidth="0.9" strokeLinecap="round" />
        <circle cx="9" cy="10.5" r="0.9" fill="#fffbeb" />
        <defs>
          <radialGradient id="krG" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="55%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>
        </defs>
      </svg>
    );
  }
  if (type === 'premium') {
    // 고급 플레이크 — 분홍빛 얇은 조각들
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 0 5px rgba(236,72,153,.7))' }}>
        <path d="M12 3 L18 9 L15 17 L7 16 L4 8 Z" fill="url(#pmG)" stroke="#be185d" strokeWidth="1" strokeLinejoin="round" />
        <path d="M12 3 L11 16 M4 8 L15 17" stroke="#fbcfe8" strokeWidth="0.7" opacity=".7" />
        <defs>
          <linearGradient id="pmG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="60%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
  // 기본 밥 — 구수한 빵부스러기(불규칙 원 + 결)
  const wobble = 3 + (h % 3);
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.3))' }}>
      <path d={`M12 4 C${16 + wobble} 4 20 ${8 - wobble} 20 12 C20 ${16 + wobble} ${16} 20 12 20 C${8 - wobble} 20 4 16 4 12 C4 ${8 + wobble} ${8} 4 12 4 Z`}
        fill="url(#bdG)" stroke="#78350f" strokeWidth="1" />
      <path d="M9 10 L13 11 M11 14 L15 13 M10 12.5 L12 13" stroke="#92400e" strokeWidth="0.8" strokeLinecap="round" opacity=".6" />
      <defs>
        <radialGradient id="bdG" cx="38%" cy="34%">
          <stop offset="0%" stopColor="#fcd9a8" />
          <stop offset="60%" stopColor="#d9a066" />
          <stop offset="100%" stopColor="#a16207" />
        </radialGradient>
      </defs>
    </svg>
  );
}

const FoodBit = React.memo(FoodBitBase);
export default FoodBit;
