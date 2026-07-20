// ════════ "봄이가 생각 중…" 공용 로더 ════════
//   <BomThinking />  또는  <BomThinking label="봄이가 꿈을 풀어보는 중…" />
//   다시봄 테마 변수(dasibom-theme.css)를 쓰되, 없어도 기본색으로 동작.
export default function BomThinking({ label = "봄이가 생각 중…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 24, textAlign: "center" }}>
      <div
        style={{
          width: 56, height: 56,
          border: "4px solid var(--dasibom-border, #F0E6D2)",
          borderTopColor: "var(--dasibom-primary, #7D5A50)",
          borderRadius: "50%",
          animation: "bomspin 1s linear infinite",
        }}
      />
      <p style={{ color: "var(--dasibom-primary, #7D5A50)", fontWeight: 800, margin: 0 }}>{label}</p>
      <style>{`@keyframes bomspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
