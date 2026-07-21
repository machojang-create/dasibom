/* 28종 식물 개별 SVG 일러스트 (2026-07-21 Macho 지시 — 비주얼 차별화).
   이모지 대신 종마다 실루엣·잎·꽃이 다른 벡터 아트. bloom(만개)이면 만발 변형.
   좌표계: viewBox 0 0 120 150, 바닥(y=150)이 화분 흙 위. */
import { ReactNode } from 'react';

interface ArtProps { type: string; bloom?: boolean; className?: string; }

/* ── 공용 파츠 ── */
const Radial = ({ cx, cy, petals, rx, ry, color, center, centerR = 5, rot = 0, op = 1 }:
  { cx: number; cy: number; petals: number; rx: number; ry: number; color: string; center?: string; centerR?: number; rot?: number; op?: number }) => (
  <g opacity={op}>
    {Array.from({ length: petals }).map((_, i) => (
      <ellipse key={i} cx={cx} cy={cy - ry} rx={rx} ry={ry} fill={color}
        transform={`rotate(${rot + (i * 360) / petals} ${cx} ${cy})`} />
    ))}
    {center && <circle cx={cx} cy={cy} r={centerR} fill={center} />}
  </g>
);

const Leaf = ({ x, y, len, w, angle, color }:
  { x: number; y: number; len: number; w: number; angle: number; color: string }) => (
  <path d={`M ${x} ${y} Q ${x - w} ${y - len / 2} ${x} ${y - len} Q ${x + w} ${y - len / 2} ${x} ${y} Z`}
    fill={color} transform={`rotate(${angle} ${x} ${y})`} />
);

const Stem = ({ d, w = 4, color = '#4e7a3a' }: { d: string; w?: number; color?: string }) => (
  <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />
);

/* ── 종별 아트 ── */
const ART: Record<string, (bloom: boolean) => ReactNode> = {

  aloe: (bloom) => (<>
    {[-58, -32, -10, 10, 32, 58].map((a, i) => (
      <path key={i} d="M 60 148 Q 52 100 60 62 Q 68 100 60 148 Z" fill={i % 2 ? '#5f9c4a' : '#4c8a3c'}
        transform={`rotate(${a} 60 148) scale(1 ${1 - Math.abs(a) / 160})`} style={{ transformOrigin: '60px 148px' }} />
    ))}
    <path d="M 60 148 Q 53 96 60 52 Q 67 96 60 148 Z" fill="#6cab55" />
    {bloom && <><Stem d="M 60 96 Q 62 62 64 40" w={3} color="#7c9c50" />
      {[0, 1, 2, 3].map(i => <ellipse key={i} cx={64 - i} cy={44 + i * 9} rx={4} ry={6} fill="#f2913d" />)}</>}
  </>),

  cactus: (bloom) => (<>
    <rect x={50} y={62} width={20} height={88} rx={10} fill="#4f9345" />
    <path d="M 50 100 Q 30 96 32 74 Q 33 64 40 64 Q 46 66 44 78 Q 43 90 52 92 Z" fill="#448339" />
    <path d="M 70 112 Q 90 108 88 88 Q 87 78 80 78 Q 74 80 76 90 Q 77 102 68 104 Z" fill="#448339" />
    {Array.from({ length: 14 }).map((_, i) => (
      <circle key={i} cx={54 + (i % 3) * 6} cy={70 + i * 5.5} r={1.1} fill="#dff0d0" />
    ))}
    {bloom && <Radial cx={60} cy={58} petals={7} rx={4.5} ry={8} color="#f27fb2" center="#ffe28a" centerR={4} />}
  </>),

  rose: (bloom) => (<>
    <Stem d="M 60 150 Q 58 110 60 78" color="#3f6d33" />
    <path d="M 57 122 l -5 -4 M 62 104 l 5 -4" stroke="#3f6d33" strokeWidth={2.5} strokeLinecap="round" />
    <Leaf x={56} y={124} len={16} w={9} angle={-55} color="#4e8040" />
    <Leaf x={63} y={106} len={15} w={8} angle={50} color="#588c48" />
    <Radial cx={60} cy={70} petals={8} rx={7} ry={11} color="#c92c4e" rot={10} />
    <Radial cx={60} cy={70} petals={6} rx={5.5} ry={8} color="#e0476a" rot={40} />
    <circle cx={60} cy={70} r={5.5} fill="#a81f3d" />
    {bloom && <>
      <Stem d="M 60 118 Q 40 104 34 84" w={3} color="#3f6d33" />
      <Radial cx={33} cy={80} petals={7} rx={4.5} ry={7} color="#e0476a" center="#a81f3d" centerR={3.5} />
      <Stem d="M 60 122 Q 82 110 88 92" w={3} color="#3f6d33" />
      <Radial cx={89} cy={88} petals={7} rx={4.5} ry={7} color="#c92c4e" center="#a81f3d" centerR={3.5} />
    </>}
  </>),

  tulip: (bloom) => (<>
    <Stem d="M 60 150 L 60 84" color="#4c8a3c" />
    <path d="M 60 148 Q 40 120 46 88 Q 56 108 60 118 Z" fill="#5f9c4a" />
    <path d="M 60 148 Q 80 122 74 92 Q 64 110 60 120 Z" fill="#4c8a3c" />
    <path d="M 48 84 Q 47 62 54 58 Q 59 66 60 74 Q 61 66 66 58 Q 73 62 72 84 Q 66 92 60 92 Q 54 92 48 84 Z" fill="#e85d8a" />
    <path d="M 56 62 Q 60 56 64 62 L 62 78 Q 60 82 58 78 Z" fill="#f27fa5" />
    {bloom && <>
      <Stem d="M 60 130 Q 36 116 32 94" w={3} color="#4c8a3c" />
      <path d="M 24 92 Q 23 76 28 72 Q 31 78 32 84 Q 33 78 36 72 Q 41 76 40 92 Q 36 98 32 98 Q 28 98 24 92 Z" fill="#f0a73c" />
      <Stem d="M 60 132 Q 84 120 88 98" w={3} color="#4c8a3c" />
      <path d="M 80 96 Q 79 80 84 76 Q 87 82 88 88 Q 89 82 92 76 Q 97 80 96 96 Q 92 102 88 102 Q 84 102 80 96 Z" fill="#e85d8a" />
    </>}
  </>),

  sunflower: (bloom) => (<>
    <Stem d="M 60 150 Q 58 106 60 60" w={5} color="#4e7a3a" />
    <Leaf x={58} y={120} len={24} w={13} angle={-58} color="#5f9c4a" />
    <Leaf x={62} y={102} len={22} w={12} angle={55} color="#4c8a3c" />
    <Radial cx={60} cy={48} petals={bloom ? 16 : 12} rx={5.5} ry={13} color="#f6bd2a" rot={8} />
    <circle cx={60} cy={48} r={11} fill="#7a4a1f" />
    <circle cx={60} cy={48} r={11} fill="none" stroke="#5e3716" strokeWidth={2} strokeDasharray="2 2.5" />
    {bloom && <>
      <Stem d="M 60 124 Q 86 112 90 96" w={3.5} color="#4e7a3a" />
      <Radial cx={92} cy={92} petals={10} rx={3.5} ry={8} color="#f6bd2a" center="#7a4a1f" centerR={5.5} />
    </>}
  </>),

  ivy: (bloom) => (<>
    {[[-2, 0], [0, 1], [2, 2]].map(([sway, k]) => (
      <g key={k}>
        <Stem d={`M ${60 + k * 4 - 4} 148 Q ${40 + k * 18 + sway * 4} 120 ${34 + k * 22} ${92 - k * 14}`} w={2.5} color="#3f6d33" />
        {[0.3, 0.55, 0.8, 1].map((t, i) => {
          const x = 60 + k * 4 - 4 + (34 + k * 22 - (60 + k * 4 - 4)) * t;
          const y = 148 + (92 - k * 14 - 148) * t;
          return <path key={i} d={`M ${x} ${y} q -6 -8 0 -12 q 6 4 0 12`} fill={i % 2 ? '#4e8040' : '#5f9c4a'} />;
        })}
      </g>
    ))}
    {bloom && [0, 1, 2, 3, 4].map(i => (
      <circle key={i} cx={36 + i * 12} cy={84 + (i % 2) * 16} r={2.2} fill="#eef7e6" />
    ))}
  </>),

  lily: (bloom) => (<>
    <Stem d="M 60 150 Q 62 108 58 76" color="#4c8a3c" />
    <Leaf x={60} y={126} len={26} w={7} angle={-40} color="#4e8040" />
    <Leaf x={60} y={112} len={24} w={6} angle={44} color="#5f9c4a" />
    <Radial cx={58} cy={66} petals={6} rx={6} ry={13} color="#fdfbf3" rot={12} />
    <Radial cx={58} cy={66} petals={6} rx={2.5} ry={9} color="#f3e8b0" rot={42} />
    {[0, 60, 120, 180, 240, 300].map(a => (
      <circle key={a} cx={58} cy={59} r={1.4} fill="#c88a2e" transform={`rotate(${a} 58 66)`} />
    ))}
    {bloom && <>
      <Stem d="M 60 120 Q 82 106 86 88" w={3} color="#4c8a3c" />
      <Radial cx={88} cy={84} petals={6} rx={4.5} ry={9} color="#fdfbf3" center="#f3e8b0" centerR={3} rot={20} />
    </>}
  </>),

  dandelion: (bloom) => (<>
    <path d="M 60 150 Q 44 138 40 120 L 50 128 Q 46 114 48 102 L 56 116 Q 56 100 60 92 Q 64 100 64 116 L 72 102 Q 74 114 70 128 L 80 120 Q 76 138 60 150 Z" fill="#4e8040" opacity={0.9} />
    <Stem d="M 60 132 Q 59 100 60 74" w={3} color="#6a9c50" />
    {bloom
      ? <g>{/* 만개 = 홀씨 — 민들레만의 흰 솜뭉치 */}
          <circle cx={60} cy={62} r={17} fill="#ffffff" opacity={0.5} />
          {Array.from({ length: 16 }).map((_, i) => (
            <g key={i} transform={`rotate(${i * 22.5} 60 62)`}>
              <line x1={60} y1={62} x2={60} y2={47} stroke="#e8e4d8" strokeWidth={1} />
              <circle cx={60} cy={46} r={2} fill="#f6f3ea" />
            </g>
          ))}
          <circle cx={60} cy={62} r={4} fill="#cfc9b4" />
          <circle cx={92} cy={34} r={2} fill="#f6f3ea" /><line x1={90} y1={36} x2={86} y2={42} stroke="#e8e4d8" strokeWidth={1} />
          <circle cx={102} cy={52} r={2} fill="#f6f3ea" /><line x1={100} y1={54} x2={96} y2={58} stroke="#e8e4d8" strokeWidth={1} />
        </g>
      : <Radial cx={60} cy={64} petals={14} rx={3} ry={9} color="#f6c12a" center="#e0a41f" centerR={5} />}
  </>),

  pine: (bloom) => (<>
    <rect x={55} y={112} width={10} height={38} rx={3} fill="#7a5230" />
    <path d="M 60 24 L 86 66 L 74 64 L 94 102 L 78 99 L 96 132 L 24 132 L 42 99 L 26 102 L 46 64 L 34 66 Z" fill="#2f6b46" />
    <path d="M 60 24 L 78 54 L 60 52 Z" fill="#3d7d54" />
    {bloom && [[46, 120], [72, 118], [60, 92], [38, 96], [82, 94]].map(([x, y], i) => (
      <ellipse key={i} cx={x} cy={y} rx={3.5} ry={5.5} fill="#a8742f" />
    ))}
  </>),

  fern: (bloom) => (<>
    {[-70, -42, -16, 16, 42, 70].map((a, k) => (
      <g key={k} transform={`rotate(${a} 60 148)`}>
        <Stem d="M 60 148 Q 58 106 60 66" w={2.5} color="#3d7a34" />
        {Array.from({ length: 7 }).map((_, i) => (
          <g key={i}>
            <ellipse cx={55 - i * 0.4} cy={136 - i * 10} rx={7 - i * 0.7} ry={2.6} fill={k % 2 ? '#4e8f3f' : '#5da04a'} />
            <ellipse cx={65 + i * 0.4} cy={132 - i * 10} rx={7 - i * 0.7} ry={2.6} fill={k % 2 ? '#5da04a' : '#4e8f3f'} />
          </g>
        ))}
      </g>
    ))}
    {bloom && <path d="M 60 96 Q 60 66 60 56 Q 74 52 72 64 Q 70 72 62 70" stroke="#6db558" strokeWidth={3} fill="none" strokeLinecap="round" />}
  </>),

  orchid: (bloom) => (<>
    <path d="M 60 150 Q 40 132 44 96 Q 54 120 58 132 Z" fill="#4e8040" />
    <path d="M 60 150 Q 80 134 76 100 Q 66 122 62 134 Z" fill="#5f9c4a" />
    <Stem d="M 60 140 Q 58 96 74 64 Q 82 50 90 44" w={3} color="#7c9c50" />
    {[[70, 82], [78, 66], [86, 52], [92, 42]].slice(0, bloom ? 4 : 3).map(([x, y], i) => (
      <g key={i}>
        <Radial cx={x} cy={y} petals={5} rx={4} ry={7} color="#e77fc0" rot={35} />
        <circle cx={x} cy={y} r={3} fill="#8e2d68" />
        <circle cx={x} cy={y + 2.5} r={1.6} fill="#f7d84d" />
      </g>
    ))}
  </>),

  hibiscus: (bloom) => (<>
    <Stem d="M 60 150 Q 62 112 58 82" color="#5a4632" />
    <Leaf x={58} y={124} len={18} w={10} angle={-52} color="#4e8040" />
    <Leaf x={61} y={108} len={17} w={9} angle={48} color="#588c48" />
    <Radial cx={58} cy={70} petals={5} rx={9} ry={12} color="#f3aebd" rot={36} />
    <Radial cx={58} cy={70} petals={5} rx={6} ry={9} color="#fbd6de" rot={0} />
    <circle cx={58} cy={70} r={4.5} fill="#c22a4f" />
    <line x1={58} y1={70} x2={64} y2={58} stroke="#c22a4f" strokeWidth={2} strokeLinecap="round" />
    <circle cx={64.5} cy={57} r={2} fill="#f7d84d" />
    {bloom && <>
      <Stem d="M 60 124 Q 38 112 34 94" w={3} color="#5a4632" />
      <Radial cx={32} cy={90} petals={5} rx={6.5} ry={9} color="#f3aebd" center="#c22a4f" centerR={3.5} rot={20} />
      <Stem d="M 59 116 Q 82 106 86 92" w={3} color="#5a4632" />
      <Radial cx={88} cy={88} petals={5} rx={6.5} ry={9} color="#fbd6de" center="#c22a4f" centerR={3.5} rot={50} />
    </>}
  </>),

  chrysanthemum: (bloom) => (<>
    <Stem d="M 60 150 Q 58 116 60 88" color="#55793f" />
    <Leaf x={57} y={126} len={16} w={10} angle={-58} color="#5d8a48" />
    <Leaf x={62} y={112} len={15} w={9} angle={52} color="#527c40" />
    <Radial cx={60} cy={74} petals={18} rx={2.6} ry={13} color="#e9962e" />
    <Radial cx={60} cy={74} petals={14} rx={2.4} ry={9} color="#f6b23c" rot={10} />
    <circle cx={60} cy={74} r={5} fill="#c97a1c" />
    {bloom && <>
      <Stem d="M 60 126 Q 38 116 34 100" w={3} color="#55793f" />
      <Radial cx={32} cy={96} petals={14} rx={2} ry={8} color="#f6b23c" center="#c97a1c" centerR={3.5} />
      <Stem d="M 60 130 Q 84 120 88 104" w={3} color="#55793f" />
      <Radial cx={90} cy={100} petals={14} rx={2} ry={8} color="#e9962e" center="#c97a1c" centerR={3.5} />
    </>}
  </>),

  plum: (bloom) => (<>
    <path d="M 58 150 Q 54 116 44 92 Q 38 78 30 70 M 56 118 Q 66 100 80 90 M 46 96 Q 40 88 40 78 M 78 92 Q 88 86 92 76"
      stroke="#6b4a2e" strokeWidth={4} fill="none" strokeLinecap="round" />
    {([[30, 68], [40, 76], [80, 88], [92, 74], [56, 104]] as [number, number][])
      .concat(bloom ? [[48, 86], [68, 94], [86, 80], [36, 92], [62, 86]] : []).map(([x, y], i) => (
        <Radial key={i} cx={x} cy={y} petals={5} rx={3.2} ry={4.5} color="#f6c6d4" center="#e2879f" centerR={2} rot={i * 17} />
      ))}
    {bloom && [[44, 70], [74, 82]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2} fill="#f2dbe3" />)}
  </>),

  bamboo: (bloom) => (<>
    {([[46, 150, 58], [62, 150, 34], [76, 150, 70]] as [number, number, number][]).map(([x, y, top], k) => (
      <g key={k}>
        <rect x={x - 4} y={top} width={8} height={y - top} rx={3.5} fill={k === 1 ? '#5f9c4a' : '#54924a'} />
        {Array.from({ length: Math.floor((y - top) / 22) }).map((_, i) => (
          <line key={i} x1={x - 4.5} y1={y - 18 - i * 22} x2={x + 4.5} y2={y - 18 - i * 22} stroke="#3d7434" strokeWidth={2} />
        ))}
      </g>
    ))}
    {([[46, 62, -30], [62, 38, 25], [76, 74, -22], [62, 52, -35], [76, 90, 30]] as [number, number, number][])
      .concat(bloom ? [[46, 80, 28], [62, 66, 30], [46, 100, -25]] : []).map(([x, y, a], i) => (
        <path key={i} d={`M ${x} ${y} q 14 ${a < 0 ? -8 : 8} 26 ${a < 0 ? -4 : 4} q -12 ${a < 0 ? 6 : -6} -26 ${a < 0 ? 4 : -4} Z`}
          fill={i % 2 ? '#4e8f3f' : '#66a854'} transform={`rotate(${a} ${x} ${y})`} />
      ))}
  </>),

  cosmos: (bloom) => (<>
    {([[48, 78, '#f2a0bd'], [72, 66, '#e97fa8']] as [number, number, string][])
      .concat(bloom ? [[86, 88, '#f2b8ce']] : []).map(([x, y, c], i) => (
        <g key={i}>
          <Stem d={`M 60 150 Q ${Number(x) - 6} ${Number(y) + 40} ${x} ${Number(y) + 8}`} w={2} color="#6a9c50" />
          <Radial cx={Number(x)} cy={Number(y)} petals={8} rx={4} ry={9} color={String(c)} center="#f7d84d" centerR={3.5} rot={i * 22} />
        </g>
      ))}
    {[-30, -12, 10, 30].map((a, i) => (
      <path key={i} d="M 60 148 q -2 -22 0 -34" stroke="#5d8a48" strokeWidth={1.5} fill="none"
        transform={`rotate(${a} 60 148)`} strokeLinecap="round" />
    ))}
  </>),

  azalea: (bloom) => (<>
    <path d="M 60 150 Q 56 122 46 106 M 60 150 Q 62 118 74 102 M 60 136 Q 60 116 58 104"
      stroke="#6b4a2e" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    {([[46, 100], [74, 96], [58, 98]] as [number, number][])
      .concat(bloom ? [[36, 110], [86, 106], [66, 86], [50, 86]] : []).map(([x, y], i) => (
        <g key={i}>
          <Radial cx={x} cy={y} petals={5} rx={4.5} ry={6.5} color="#e86fa4" rot={i * 25} />
          <circle cx={x} cy={y} r={2.2} fill="#b23670" />
        </g>
      ))}
    <Leaf x={54} y={128} len={13} w={6} angle={-40} color="#5d8a48" />
    <Leaf x={66} y={122} len={12} w={6} angle={42} color="#527c40" />
  </>),

  forsythia: (bloom) => (<>
    <path d="M 58 150 Q 44 118 24 96 M 60 150 Q 62 112 84 84 M 59 144 Q 56 112 44 92"
      stroke="#7a5a36" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    {([[26, 96], [34, 106], [44, 116], [84, 86], [76, 96], [68, 106], [44, 92], [50, 104]] as [number, number][])
      .concat(bloom ? [[30, 88], [40, 100], [90, 78], [72, 90], [58, 116], [52, 84]] : []).map(([x, y], i) => (
        <Radial key={i} cx={x} cy={y} petals={4} rx={2.8} ry={5} color="#f6c827" center="#e0a41f" centerR={1.6} rot={i * 23} />
      ))}
  </>),

  camellia: (bloom) => (<>
    <path d="M 60 150 Q 58 122 54 104 M 60 140 Q 66 118 72 108" stroke="#5a4632" strokeWidth={4} fill="none" strokeLinecap="round" />
    {([[-46, 118], [50, 128], [66, 120], [78, 112]] as [number, number][]).map(([x, y], i) => (
      <path key={i} d={`M ${Math.abs(x)} ${y} q -8 -10 0 -16 q 8 6 0 16`} fill="#2e5c38" transform={`rotate(${i * 60 - 60} ${Math.abs(x)} ${y})`} />
    ))}
    <Radial cx={54} cy={92} petals={8} rx={7} ry={9.5} color="#cf2440" rot={10} />
    <Radial cx={54} cy={92} petals={6} rx={5} ry={7} color="#e04058" rot={38} />
    <circle cx={54} cy={92} r={5} fill="#f7d84d" />
    {[0, 60, 120, 180, 240, 300].map(a => <circle key={a} cx={54} cy={88.5} r={1.2} fill="#c88a2e" transform={`rotate(${a} 54 92)`} />)}
    {bloom && <>
      <Radial cx={78} cy={106} petals={8} rx={5} ry={7} color="#cf2440" center="#f7d84d" centerR={3.5} rot={25} />
      <Radial cx={38} cy={112} petals={8} rx={4.5} ry={6} color="#e04058" center="#f7d84d" centerR={3} rot={5} />
    </>}
  </>),

  morningglory: (bloom) => (<>
    <line x1={40} y1={150} x2={40} y2={60} stroke="#9c8a6a" strokeWidth={2.5} />
    <line x1={80} y1={150} x2={80} y2={60} stroke="#9c8a6a" strokeWidth={2.5} />
    <line x1={30} y1={70} x2={90} y2={70} stroke="#9c8a6a" strokeWidth={2.5} />
    <line x1={30} y1={110} x2={90} y2={110} stroke="#9c8a6a" strokeWidth={2.5} />
    <path d="M 60 150 Q 30 130 42 106 Q 56 88 44 72 M 60 150 Q 88 132 78 108 Q 66 90 80 72"
      stroke="#3f7a34" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    {([[44, 104], [78, 100]] as [number, number][]).map(([x, y], i) => (
      <path key={i} d={`M ${x} ${y} q -8 -10 0 -13 q 8 3 0 13`} fill="#4e8f3f" transform={`rotate(${i ? 30 : -30} ${x} ${y})`} />
    ))}
    {([[44, 74], [80, 70]] as [number, number][]).concat(bloom ? [[36, 118], [84, 112], [60, 64]] : []).map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={8.5} fill="#7a6cc9" />
        <circle cx={x} cy={y} r={5.5} fill="#9c90dd" />
        <Radial cx={x} cy={y} petals={5} rx={1.2} ry={7} color="#e8e4f7" rot={10} />
        <circle cx={x} cy={y} r={2} fill="#fdfbf3" />
      </g>
    ))}
  </>),

  balsam: (bloom) => (<>
    <Stem d="M 60 150 Q 59 110 60 68" w={4.5} color="#6a9c50" />
    <Leaf x={58} y={132} len={20} w={7} angle={-62} color="#4e8f3f" />
    <Leaf x={62} y={124} len={19} w={7} angle={58} color="#5da04a" />
    <Leaf x={58} y={104} len={18} w={6} angle={-56} color="#5da04a" />
    <Leaf x={62} y={96} len={17} w={6} angle={54} color="#4e8f3f" />
    <Leaf x={60} y={72} len={15} w={5} angle={-8} color="#66a854" />
    {([[52, 116], [68, 108], [52, 88]] as [number, number][]).concat(bloom ? [[68, 82], [56, 70], [66, 122]] : []).map(([x, y], i) => (
      <g key={i}>
        <Radial cx={x} cy={y} petals={5} rx={3.5} ry={5} color="#ef6b95" rot={i * 30} />
        <circle cx={x} cy={y} r={2} fill="#c22a5c" />
      </g>
    ))}
  </>),

  lilac: (bloom) => (<>
    <Stem d="M 60 150 Q 58 116 58 92" color="#6b4a2e" />
    <Leaf x={56} y={126} len={16} w={10} angle={-48} color="#4e8040" />
    <Leaf x={61} y={114} len={15} w={9} angle={46} color="#588c48" />
    {Array.from({ length: bloom ? 26 : 16 }).map((_, i) => {
      const row = Math.floor(i / 4), col = i % 4;
      const x = 58 + (col - 1.5) * (9 - row * 1.4) + (row % 2) * 2;
      const y = 88 - row * 8;
      return <Radial key={i} cx={x} cy={y} petals={4} rx={2} ry={3.2} color={i % 3 ? '#b48ad4' : '#c9a6e4'} center="#8a5cb0" centerR={1} rot={i * 20} />;
    })}
  </>),

  ginkgo: (bloom) => (<>
    <rect x={56} y={100} width={8} height={50} rx={3} fill="#7a5a36" />
    <path d="M 60 104 Q 48 92 40 78 M 60 100 Q 72 90 80 76" stroke="#7a5a36" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    {([[40, 74], [80, 72], [52, 84], [68, 82], [60, 64], [46, 60], [74, 58], [60, 44]] as [number, number][]).map(([x, y], i) => (
      <path key={i} d={`M ${x} ${y} L ${x - 8} ${y - 11} Q ${x} ${y - 16} ${x + 8} ${y - 11} Z`}
        fill={bloom ? (i % 2 ? '#f2c53a' : '#e9b52c') : (i % 2 ? '#9cb85a' : '#b0c465')}
        transform={`rotate(${(i * 47) % 60 - 30} ${x} ${y})`} />
    ))}
    {bloom && [[48, 96], [70, 92]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.5} fill="#e9b52c" />)}
  </>),

  maple: (bloom) => (<>
    <rect x={56} y={98} width={8} height={52} rx={3} fill="#6b4a2e" />
    <path d="M 60 102 Q 46 92 38 80 M 60 98 Q 74 90 82 78" stroke="#6b4a2e" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    {([[38, 72], [82, 70], [50, 80], [70, 78], [60, 58], [44, 54], [76, 52], [60, 38]] as [number, number][]).map(([x, y], i) => (
      <path key={i}
        d={`M ${x} ${y + 8} L ${x - 3} ${y + 2} L ${x - 9} ${y + 4} L ${x - 5} ${y - 2} L ${x - 7} ${y - 8} L ${x - 1} ${y - 5} L ${x} ${y - 11} L ${x + 1} ${y - 5} L ${x + 7} ${y - 8} L ${x + 5} ${y - 2} L ${x + 9} ${y + 4} L ${x + 3} ${y + 2} Z`}
        fill={bloom ? (i % 2 ? '#d43a2a' : '#e85c30') : (i % 2 ? '#e07a35' : '#d4622e')}
        transform={`rotate(${(i * 53) % 50 - 25} ${x} ${y}) scale(1.05)`} />
    ))}
  </>),

  rice: (bloom) => (<>
    {[-24, -12, 0, 12, 24].map((dx, i) => (
      <g key={i}>
        <path d={`M ${60 + dx * 0.5} 150 Q ${58 + dx} 104 ${56 + dx * 1.4} 74 Q ${55 + dx * 1.5} 66 ${60 + dx * 1.6} 60`}
          stroke="#b8a23c" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {Array.from({ length: bloom ? 7 : 5 }).map((_, k) => (
          <ellipse key={k} cx={60 + dx * 1.6 + (k % 2 ? 3 : -3)} cy={62 + k * 4.5} rx={2.6} ry={3.6}
            fill={bloom ? '#e8c94f' : '#cdb845'} transform={`rotate(${k % 2 ? 25 : -25} ${60 + dx * 1.6} ${62 + k * 4.5})`} />
        ))}
      </g>
    ))}
    <path d="M 42 148 Q 34 120 30 104 M 78 148 Q 88 122 92 106" stroke="#7c9c50" strokeWidth={2} fill="none" strokeLinecap="round" />
  </>),

  pepper: (bloom) => (<>
    <Stem d="M 60 150 Q 59 116 60 84" w={4.5} color="#4e7a3a" />
    <path d="M 60 120 Q 44 112 40 98 M 60 108 Q 76 102 82 90 M 60 94 Q 48 88 44 76" stroke="#4e7a3a" strokeWidth={3} fill="none" strokeLinecap="round" />
    <Leaf x={40} y={98} len={15} w={8} angle={-30} color="#4e8f3f" />
    <Leaf x={82} y={90} len={15} w={8} angle={30} color="#5da04a" />
    <Leaf x={44} y={76} len={13} w={7} angle={-24} color="#5da04a" />
    <Leaf x={60} y={84} len={14} w={8} angle={4} color="#4e8f3f" />
    {([[48, 104, -14], [72, 96, 12]] as [number, number, number][]).concat(bloom ? [[52, 82, -10], [68, 114, 16], [60, 90, 2]] : []).map(([x, y, a], i) => (
      <g key={i} transform={`rotate(${a} ${x} ${y})`}>
        <path d={`M ${x} ${y} Q ${x - 4} ${y + 12} ${x} ${y + 20} Q ${x + 5} ${y + 12} ${x + 2} ${y} Z`} fill="#d42a2a" />
        <path d={`M ${x - 1} ${y - 2} q 2 -3 4 0 l -1 3 Z`} fill="#3d7434" />
      </g>
    ))}
  </>),

  tomato: (bloom) => (<>
    <line x1={72} y1={150} x2={72} y2={58} stroke="#9c8a6a" strokeWidth={3} />
    <path d="M 58 150 Q 52 120 56 96 Q 60 76 70 62" stroke="#4e7a3a" strokeWidth={4} fill="none" strokeLinecap="round" />
    <Leaf x={54} y={122} len={16} w={9} angle={-46} color="#4e8f3f" />
    <Leaf x={60} y={100} len={15} w={8} angle={40} color="#5da04a" />
    <Leaf x={68} y={70} len={13} w={7} angle={-34} color="#5da04a" />
    {([[48, 108], [64, 88]] as [number, number][]).concat(bloom ? [[54, 130], [76, 76], [44, 88]] : []).map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={7.5} fill="#e33a2e" />
        <circle cx={x - 2.5} cy={y - 2.5} r={2.2} fill="#f2705f" opacity={0.8} />
        <path d={`M ${x} ${y - 7} l -3 -3 m 3 3 l 3 -3 m -3 3 l 0 -4`} stroke="#3d7434" strokeWidth={1.6} strokeLinecap="round" />
      </g>
    ))}
    {bloom && <Radial cx={80} cy={98} petals={5} rx={1.6} ry={3.6} color="#f7d84d" center="#e0a41f" centerR={1.2} />}
  </>),

  strawberry: (bloom) => (<>
    {[[42, 128, -20], [60, 120, 0], [78, 126, 20]].map(([x, y, a], i) => (
      <g key={i} transform={`rotate(${a} ${x} ${y})`}>
        <Leaf x={x} y={y + 14} len={22} w={12} angle={0} color={i % 2 ? '#4e8f3f' : '#5da04a'} />
      </g>
    ))}
    <path d="M 60 134 Q 44 128 36 116 M 60 134 Q 76 126 84 114" stroke="#5d8a48" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    {([[36, 118], [84, 116]] as [number, number][]).concat(bloom ? [[60, 100]] : []).map(([x, y], i) => (
      <g key={i}>
        <path d={`M ${x} ${y} Q ${x - 7} ${y + 4} ${x} ${y + 15} Q ${x + 7} ${y + 4} ${x} ${y} Z`} fill="#e0314b" />
        {[[-2, 5], [2, 8], [0, 11]].map(([sx, sy], k) => <circle key={k} cx={x + sx} cy={y + sy} r={0.8} fill="#f7d84d" />)}
        <path d={`M ${x - 4} ${y} L ${x} ${y - 3} L ${x + 4} ${y} Z`} fill="#4e8f3f" />
      </g>
    ))}
    {([[48, 104], [72, 102]] as [number, number][]).map(([x, y], i) => (
      <Radial key={i} cx={x} cy={y} petals={5} rx={2.4} ry={4} color="#fdfbf3" center="#f7d84d" centerR={2} rot={i * 30} />
    ))}
  </>),
};

export default function PlantArt({ type, bloom = false, className }: ArtProps) {
  const draw = ART[type];
  if (!draw) return null;
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden="true"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 6px 10px rgba(40,60,30,0.25))' }}>
      {draw(bloom)}
    </svg>
  );
}
