/* 배경음 루프(2026-07-22 Macho 제공 음원) — 맞고/오락실과 같은 패턴: loop·볼륨 0.32·선호 기억.
   자동재생 정책 대응: 켜둔 채 나갔다 오면 첫 터치에 조용히 이어 재생. */
let el: HTMLAudioElement | null = null;

function ensure(src: string) {
  if (!el) { el = new Audio(src); el.loop = true; el.volume = 0.32; }
  return el;
}

export function toggleBgm(src: string, prefKey: string): boolean {
  const a = ensure(src);
  if (a.paused) {
    a.play().catch(() => {});
    try { localStorage.setItem(prefKey, '1'); } catch (e) {}
    return true;
  }
  a.pause();
  try { localStorage.setItem(prefKey, '0'); } catch (e) {}
  return false;
}

export function autoResumeBgm(src: string, prefKey: string, onOn: () => void) {
  try { if (localStorage.getItem(prefKey) !== '1') return; } catch (e) { return; }
  const kick = () => {
    const a = ensure(src);
    a.play().then(onOn).catch(() => {});
  };
  document.addEventListener('pointerdown', kick, { once: true });
}
