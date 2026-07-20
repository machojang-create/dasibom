export class AmbientAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (OscillatorNode | AudioBufferSourceNode | GainNode | BiquadFilterNode | StereoPannerNode)[] = [];
  private isPlaying = false;
  private currentWeather: string = 'sunny';
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.15; // Global volume
      this.masterGain.connect(this.ctx.destination);
    }
  }

  playWeather(weather: string) {
    this.currentWeather = weather;
    if (this.isPlaying) {
      this.applyWeather();
    }
  }

  toggle() {
    this.init();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.applyWeather();
    } else {
      this.stopAll();
    }
    return this.isPlaying;
  }
  
  getIsPlaying() {
    return this.isPlaying;
  }

  private stopAll() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Fade out to prevent popping
    if (this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
    }
    
    setTimeout(() => {
        this.activeNodes.forEach(node => {
          try { 
            if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
              node.stop(); 
            }
            node.disconnect(); 
          } catch (e) {}
        });
        this.activeNodes = [];
        if (this.masterGain) {
           this.masterGain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
        }
    }, 500);
  }

  private applyWeather() {
    if (!this.ctx || !this.masterGain) return;
    
    // Quick fade out old nodes, then start new ones
    this.stopAll();
    
    setTimeout(() => {
        if (!this.isPlaying || !this.ctx) return;
        const weather = this.currentWeather;
        const now = this.ctx.currentTime;
        
        if (weather === 'rainy' || weather === 'typhoon') {
          const bufferSize = this.ctx.sampleRate * 2;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          let lastOut = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; 
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;
          
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          
          if (weather === 'typhoon') {
            filter.frequency.value = 800;
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 0.15;
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 500;
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start(now);
            this.activeNodes.push(lfo, lfoGain);
          } else {
            filter.frequency.value = 400; // Gentle rain
          }
          
          noise.connect(filter);
          filter.connect(this.masterGain!);
          noise.start(now);
          this.activeNodes.push(noise, filter);
        } else {
           // Tonal drones for other weather
           let freqs = [261.63, 329.63, 392.00]; // C Major default
           let type: OscillatorType = 'sine';
           
           if (weather === 'sunny') freqs = [261.63, 329.63, 392.00, 523.25]; // Bright
           if (weather === 'cloudy') { freqs = [261.63, 311.13, 392.00]; type = 'triangle'; } // C minor
           if (weather === 'snowy') { freqs = [523.25, 659.25, 783.99, 1046.50]; type = 'sine'; } // High pitched
           if (weather === 'hot') { freqs = [130.81, 196.00, 261.63]; type = 'square'; } // Low and buzzy
           if (weather === 'clear') freqs = [261.63, 349.23, 440.00]; // F Major / C
           
           freqs.forEach((f, i) => {
              const osc = this.ctx!.createOscillator();
              osc.type = type;
              osc.frequency.value = f;
              
              // Slow modulation for ambient feel
              const lfo = this.ctx!.createOscillator();
              lfo.frequency.value = 0.05 + (i * 0.02);
              const lfoGain = this.ctx!.createGain();
              lfoGain.gain.value = 3;
              lfo.connect(lfoGain);
              lfoGain.connect(osc.frequency);
              lfo.start(now);
              
              const panner = this.ctx!.createStereoPanner();
              panner.pan.value = (i % 2 === 0 ? -1 : 1) * 0.5;

              const gain = this.ctx!.createGain();
              // Lower gain for harsh waveforms
              const baseGain = type === 'square' ? 0.01 : 0.03;
              gain.gain.value = baseGain;
              
              // Tremolo effect
              const tremolo = this.ctx!.createOscillator();
              tremolo.frequency.value = 0.1 + (i * 0.05);
              const tremoloGain = this.ctx!.createGain();
              tremoloGain.gain.value = baseGain * 0.8;
              tremolo.connect(tremoloGain);
              tremoloGain.connect(gain.gain);
              tremolo.start(now);
              
              osc.connect(panner);
              panner.connect(gain);
              gain.connect(this.masterGain!);
              osc.start(now);
              
              this.activeNodes.push(osc, lfo, lfoGain, panner, gain, tremolo, tremoloGain);
           });
        }
    }, 550);
  }
}

export const ambientAudio = new AmbientAudio();
