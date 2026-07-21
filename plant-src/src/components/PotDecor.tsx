/* 화분 13종 문양·패턴 레이어(2026-07-22 Macho: "컬러 베리에이션만으론 성의 없다") —
   화분 본체(PlantView)와 상점 미리보기(PotShopView)가 같은 문양을 공유한다.
   viewBox 0 0 100 120, 표정(얼굴)을 가리지 않게 가장자리·하단 위주 저채도 배치. */

export default function PotPattern({ potId }: { potId: string }) {
  const P: Record<string, JSX.Element> = {

    /* 기본 토분 — 가로 띠 두 줄의 소박한 질그릇 */
    pot1: (<g>
      <rect x="0" y="14" width="100" height="5" fill="#8a5a30" opacity="0.35" />
      <rect x="0" y="22" width="100" height="2.5" fill="#8a5a30" opacity="0.25" />
      <path d="M 8 100 Q 50 108 92 100" stroke="#7a4a24" strokeWidth="2" fill="none" opacity="0.2" />
    </g>),

    /* 황금 — 마름모 격자 + 반짝임 */
    pot2: (<g opacity="0.5">
      {[0, 1, 2, 3, 4].map(i => (
        <path key={i} d={`M ${i * 25 - 12} 120 L ${i * 25 + 13} 95 L ${i * 25 + 38} 120`} stroke="#b8860b" strokeWidth="1.6" fill="none" />
      ))}
      <path d="M 14 26 l 2.2 4.4 4.8 .7 -3.5 3.4 .8 4.8 -4.3 -2.3 -4.3 2.3 .8 -4.8 -3.5 -3.4 4.8 -.7 Z" fill="#fff8dc" opacity="0.9" />
      <circle cx="82" cy="40" r="1.8" fill="#fffbe8" /><circle cx="70" cy="22" r="1.2" fill="#fffbe8" />
    </g>),

    /* 무늬 — 전통 단청풍 삼각 띠 + 물결 */
    pot3: (<g>
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <path key={i} d={`M ${i * 15 + 2} 14 L ${i * 15 + 9} 24 L ${i * 15 + 16} 14`} fill={i % 2 ? '#b8563a' : '#3a7a5a'} opacity="0.55" />
      ))}
      <path d="M 0 100 Q 12 94 25 100 T 50 100 T 75 100 T 100 100" stroke="#b8563a" strokeWidth="2.4" fill="none" opacity="0.45" />
    </g>),

    /* 백자 — 청화 매화 가지 */
    pot4: (<g opacity="0.65">
      <path d="M 12 112 Q 26 92 22 74 M 20 96 Q 30 90 36 92" stroke="#3b5f9e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {([[22, 74], [34, 90], [16, 100]] as [number, number][]).map(([x, y], i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map(a => (
            <ellipse key={a} cx={x} cy={y - 3.2} rx="1.7" ry="2.8" fill="#4a6fae" transform={`rotate(${a} ${x} ${y})`} />
          ))}
          <circle cx={x} cy={y} r="1.1" fill="#2c4a80" />
        </g>
      ))}
    </g>),

    /* 청자 — 상감 구름 문양 */
    pot5: (<g stroke="#2e6650" strokeWidth="1.7" fill="none" opacity="0.55" strokeLinecap="round">
      <path d="M 12 30 q 5 -7 11 -2 q 7 -6 12 0 q 6 -4 8 2" />
      <path d="M 62 20 q 5 -7 11 -2 q 7 -6 12 0" />
      <path d="M 30 104 q 5 -7 11 -2 q 7 -6 12 0 q 6 -4 8 2" />
      <circle cx="80" cy="96" r="4.5" strokeDasharray="2.5 2" />
    </g>),

    /* 나무 — 세로 나뭇결 + 옹이 */
    pot6: (<g stroke="#5a3a1c" strokeWidth="1.5" fill="none" opacity="0.5">
      <path d="M 18 6 Q 15 60 19 118" /><path d="M 34 4 Q 38 62 33 118" />
      <path d="M 64 4 Q 60 58 66 118" /><path d="M 84 6 Q 88 64 83 116" />
      <ellipse cx="49" cy="88" rx="6" ry="9" /><ellipse cx="49" cy="88" rx="2.6" ry="4.4" fill="#5a3a1c" opacity="0.5" />
    </g>),

    /* 유리 — 사선 광택 + 기포 */
    pot7: (<g>
      <path d="M 8 118 L 46 6" stroke="#ffffff" strokeWidth="7" opacity="0.35" strokeLinecap="round" />
      <path d="M 24 118 L 58 16" stroke="#ffffff" strokeWidth="3" opacity="0.3" strokeLinecap="round" />
      {([[70, 96, 2.6], [80, 78, 1.7], [64, 108, 1.9], [86, 102, 1.3]] as [number, number, number][]).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.55" />
      ))}
    </g>),

    /* 대리석 — 결 */
    pot8: (<g stroke="#9aa2ad" strokeWidth="1.3" fill="none" opacity="0.6" strokeLinecap="round">
      <path d="M 4 26 Q 30 40 44 22 T 96 30" />
      <path d="M 10 74 Q 34 60 58 76 T 98 68" opacity="0.45" />
      <path d="M 2 102 Q 28 112 52 100 T 94 106" opacity="0.4" />
      <path d="M 60 8 Q 66 30 58 48" opacity="0.35" />
    </g>),

    /* 돌 — 알갱이 + 실금 */
    pot9: (<g fill="#5d5d5d" opacity="0.55">
      {([[16, 30], [40, 20], [72, 34], [26, 62], [58, 56], [84, 66], [20, 96], [48, 104], [76, 98], [64, 82]] as [number, number][]).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4} />
      ))}
      <path d="M 66 6 L 58 34 L 66 52" stroke="#4a4a4a" strokeWidth="1.2" fill="none" opacity="0.7" />
    </g>),

    /* 테라코타 — 지그재그 민속 띠 */
    pot10: (<g>
      <path d="M 0 22 L 10 12 L 20 22 L 30 12 L 40 22 L 50 12 L 60 22 L 70 12 L 80 22 L 90 12 L 100 22" stroke="#7a2e1e" strokeWidth="2.6" fill="none" opacity="0.55" />
      <rect x="0" y="28" width="100" height="2.2" fill="#7a2e1e" opacity="0.4" />
      {[14, 38, 62, 86].map(x => <circle key={x} cx={x} cy={102} r="2.4" fill="#7a2e1e" opacity="0.4" />)}
    </g>),

    /* 크리스탈 — 프리즘 면 분할 */
    pot11: (<g stroke="#ffffff" strokeWidth="1.4" fill="none" opacity="0.6">
      <path d="M 30 2 L 14 60 L 34 118" /><path d="M 70 2 L 88 62 L 66 118" />
      <path d="M 30 2 L 52 44 L 70 2" opacity="0.45" /><path d="M 14 60 L 52 44 L 88 62" opacity="0.45" />
      <path d="M 34 118 L 52 44 L 66 118" opacity="0.35" />
      <path d="M 20 20 l 3 3 M 78 26 l 3 3" stroke="#fff" strokeWidth="2" opacity="0.9" />
    </g>),

    /* 깡통 — 리벳 + 이음새 + 라벨 */
    pot12: (<g>
      {[10, 30, 50, 70, 90].map(x => <circle key={x} cx={x} cy={10} r="1.9" fill="#5d5d5d" opacity="0.8" />)}
      <line x1="24" y1="16" x2="24" y2="118" stroke="#6d6d6d" strokeWidth="1.4" opacity="0.6" />
      <line x1="76" y1="16" x2="76" y2="118" stroke="#6d6d6d" strokeWidth="1.4" opacity="0.6" />
      <rect x="32" y="88" width="36" height="20" rx="3" fill="#e8e2d2" opacity="0.85" />
      <path d="M 38 96 h 24 M 38 101 h 16" stroke="#8a8474" strokeWidth="1.6" strokeLinecap="round" />
    </g>),

    /* 은빛 — 헤어라인 + 별빛 글린트 */
    pot13: (<g>
      {[20, 34, 48, 62, 76, 90, 104].map(y => (
        <line key={y} x1="4" y1={y} x2="96" y2={y} stroke="#aab4c2" strokeWidth="0.9" opacity="0.5" />
      ))}
      <path d="M 76 24 l 1.6 4.6 4.6 1.6 -4.6 1.6 -1.6 4.6 -1.6 -4.6 -4.6 -1.6 4.6 -1.6 Z" fill="#ffffff" opacity="0.95" />
    </g>),
  };

  const body = P[potId];
  if (!body) return null;
  return (
    <svg viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none">
      {body}
    </svg>
  );
}
