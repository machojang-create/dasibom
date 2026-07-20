// ════════ 프리셋 버튼(칩) 공용 ════════
//   시니어 타이핑 최소화용. 자주 쓰는 입력을 버튼으로 제공.
//   <PresetChips items={[{text:'돼지 꿈 🐷', value:'큰 돼지가 품에 안기는 꿈'}]} onPick={v=>...} />
export interface PresetItem { text: string; value: string; }

export default function PresetChips({
  items,
  onPick,
  className,
}: {
  items: PresetItem[];
  onPick: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((it, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(it.value)}
          style={{
            background: "#fff",
            border: "1px solid var(--dasibom-border, #F0E6D2)",
            color: "var(--dasibom-ink, #4A3E31)",
            borderRadius: 12,
            padding: "8px 14px",
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          {it.text}
        </button>
      ))}
    </div>
  );
}
