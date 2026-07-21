/* 어항 앰비언트 — 물속 웅웅거림(브라운 노이즈 로우패스) + 보글보글 기포음.
   화분의 AmbientAudio와 같은 합성 방식(외부 파일 없음, 용량 0). */
export class AquariumAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private popTimer: ReturnType<typeof setTimeout> | null = null;
  private playing = false;

  toggle() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.playing = !this.playing;
    if (this.playing) this.start(); else this.stop();
    return this.playing;
  }

  getIsPlaying() { return this.playing; }

  private start() {
    const ctx = this.ctx!;
    // 물속 웅웅거림
    const size = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < size; i++) {
      const w = Math.random() * 2 - 1;
      d[i] = (last + 0.02 * w) / 1.02;
      last = d[i];
      d[i] *= 2.8;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 220;
    const g = ctx.createGain(); g.gain.value = 0.5;
    noise.connect(filt); filt.connect(g); g.connect(this.master!);
    noise.start();
    this.nodes.push(noise, filt, g);

    // 보글보글 — 무작위 간격의 상승 글리산도
    const pop = () => {
      if (!this.playing || !this.ctx) return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      o.frequency.setValueAtTime(250 + Math.random() * 250, now);
      o.frequency.exponentialRampToValueAtTime(700 + Math.random() * 500, now + 0.12);
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.05, now + 0.03);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      o.connect(og); og.connect(this.master!);
      o.start(now); o.stop(now + 0.16);
      this.popTimer = setTimeout(pop, 400 + Math.random() * 1800);
    };
    pop();
  }

  private stop() {
    if (this.popTimer) clearTimeout(this.popTimer);
    this.nodes.forEach(n => { try { (n as any).stop && (n as any).stop(); n.disconnect(); } catch (e) {} });
    this.nodes = [];
  }
}
export const aquariumAudio = new AquariumAudio();
