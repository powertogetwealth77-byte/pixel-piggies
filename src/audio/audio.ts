// Web Audio synthesis — all sounds generated programmatically (no audio files).

type WaveType = OscillatorType;

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicIntensity = 0; // 0 normal, 1 fever

  get muted() {
    return this._muted;
  }

  private ensure() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  /** Must be called from a user gesture to unlock audio. */
  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  private tone(freq: number, dur: number, type: WaveType = 'sine', vol = 0.3, delay = 0, slideTo?: number) {
    if (this._muted) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.2) {
    if (this._muted) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  // --- Game SFX ---------------------------------------------------------
  select() {
    this.tone(520, 0.08, 'triangle', 0.2);
  }

  launch() {
    this.tone(300, 0.18, 'sawtooth', 0.18, 0, 720);
  }

  fizzle() {
    this.tone(180, 0.22, 'sine', 0.2, 0, 90);
  }

  /** Combo pop rising in pitch with combo size. */
  pop(combo: number, big: boolean) {
    const base = 440 + Math.min(combo, 24) * 28;
    this.tone(base, 0.12, 'triangle', 0.26);
    this.tone(base * 1.5, 0.1, 'sine', 0.16, 0.02);
    if (big) {
      this.noise(0.12, 0.18);
      this.tone(base * 2, 0.16, 'square', 0.12, 0.03);
    }
  }

  /** Cascade stage jingle — rises a major third per stage. */
  chain(stage: number) {
    const base = 523 * Math.pow(1.26, Math.min(stage - 2, 6));
    [1, 1.25, 1.5].forEach((ratio, i) => this.tone(base * ratio, 0.14, 'triangle', 0.24, i * 0.05));
    this.tone(base * 2, 0.2, 'sine', 0.14, 0.16);
    if (stage >= 4) this.noise(0.14, 0.16);
  }

  feverStart() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.22, 'square', 0.22, i * 0.07));
    this.musicIntensity = 1;
  }

  feverEnd() {
    this.musicIntensity = 0;
    this.tone(400, 0.3, 'sine', 0.16, 0, 220);
  }

  spawn() {
    this.tone(660, 0.09, 'sine', 0.14, 0, 880);
  }

  coin() {
    this.tone(988, 0.09, 'square', 0.18);
    this.tone(1319, 0.12, 'square', 0.16, 0.06);
  }

  star() {
    [784, 988, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.22, i * 0.09));
  }

  win() {
    const seq = [523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.24, i * 0.12));
    this.noise(0.4, 0.12);
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.2, i * 0.12));
  }

  // --- Background music -------------------------------------------------
  startMusic() {
    if (this.musicTimer != null) return;
    this.ensure();
    const bassLine = [131, 131, 165, 196, 147, 147, 175, 220];
    const melody = [523, 659, 587, 784, 698, 659, 587, 494];
    const stepMs = 260;
    this.musicStep = 0;
    this.musicTimer = window.setInterval(() => {
      if (this._muted) return;
      const i = this.musicStep % 8;
      const fever = this.musicIntensity > 0;
      this.tone(bassLine[i] * (fever ? 2 : 1), 0.22, 'triangle', 0.08);
      if (i % 2 === 0 || fever) {
        this.tone(melody[i] * (fever ? 1.5 : 1), 0.18, 'sine', fever ? 0.09 : 0.055);
      }
      if (fever && i % 2 === 0) this.tone(melody[i] * 2, 0.1, 'square', 0.05);
      this.musicStep++;
    }, stepMs);
  }

  stopMusic() {
    if (this.musicTimer != null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioManager();

export function vibrate(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
