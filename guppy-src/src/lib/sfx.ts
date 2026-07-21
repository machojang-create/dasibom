/* 말랑말랑 버튼 효과음(2026-07-22 Macho) — 파일 없이 WebAudio 합성, 용량 0.
   모든 버튼 공통 '뽁' + 물방울 '플립'. 볼륨 작게(시니어 놀라지 않게), 피치 랜덤으로 생기. */
let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function popSfx() {
  try {
    const c = ac(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sine';
    const base = 480 + Math.random() * 160;
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * 1.9, t + 0.07);   // 말랑하게 위로 '뽁'
    o.frequency.exponentialRampToValueAtTime(base * 1.2, t + 0.16);
    f.type = 'lowpass'; f.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(f); f.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.2);
  } catch (e) {}
}

export function plipSfx() {
  try {
    const c = ac(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(900 + Math.random() * 300, t);
    o.frequency.exponentialRampToValueAtTime(400, t + 0.09);   // 물방울 '플립'
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.13);
  } catch (e) {}
}

let mounted = false;
export function mountButtonSfx() {
  if (mounted) return; mounted = true;
  document.addEventListener('pointerdown', (e) => {
    const el = e.target as HTMLElement;
    if (el && el.closest && el.closest('button')) popSfx();
  }, { capture: true, passive: true });
}
