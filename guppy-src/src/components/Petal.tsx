/** 다시봄 꽃잎 아이콘 — 이모지 🌸가 윈도우에서 별 박힌 모양으로 렌더되는 문제 회피(자체 SVG) */
export default function Petal({ className = 'w-4 h-4' }: { className?: string }) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {petals.map(a => (
        <ellipse key={a} cx="12" cy="6.6" rx="3.5" ry="5.1" fill="#F79BB8" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.7" fill="#E4587E" />
    </svg>
  );
}
