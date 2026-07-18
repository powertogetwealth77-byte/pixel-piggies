// Web Audio synthesis — all sounds generated programmatically (no audio files).
//
// The soundtrack is an original adaptive engine with four musical states that
// crossfade smoothly: Playful (calm), Building, Critical, and Fever. Warm
// marimba + bubble tones carry the melody; a plucked synth and bass layer fade
// in as tension rises, and the tempo lifts gently — intensifying without ever
// becoming harsh. Instrument layer volumes lerp toward per-state targets each
// step, so transitions are seamless rather than abrupt cuts.

type WaveType = OscillatorType;

export type MusicState = 'playful' | 'building' | 'critical' | 'fever';

interface StateProfile {
  stepMs: number; // tempo
  bass: number; // layer target gains
  marimba: number;
  pluck: number;
  sparkle: number;
  transpose: number; // semitone shift
}

const MUSIC_PROFILES: Record<MusicState, StateProfile> = {
  playful: { stepMs: 300, bass: 0.07, marimba: 0.06, pluck: 0.0, sparkle: 0.0, transpose: 0 },
  building: { stepMs: 268, bass: 0.08, marimba: 0.06, pluck: 0.045, sparkle: 0.0, transpose: 0 },
  critical: { stepMs: 230, bass: 0.1, marimba: 0.055, pluck: 0.06, sparkle: 0.02, transpose: 0 },
  fever: { stepMs: 190, bass: 0.09, marimba: 0.07, pluck: 0.05, sparkle: 0.06, transpose: 12 },
};

const semis = (base: number, s: number) => base * Math.pow(2, s / 12);

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private _musicEnabled = true;
  private musicState: MusicState = 'playful';
  // Live (lerped) layer gains + tempo for smooth crossfades between states.
  private live = { stepMs: 300, bass: 0.07, marimba: 0.06, pluck: 0, sparkle: 0, transpose: 0 };

  get muted() {
    return this._muted;
  }

  setMusicEnabled(on: boolean) {
    this._musicEnabled = on;
  }

  /** Switch the adaptive music target state (crossfades over a few steps). */
  setMusicState(state: MusicState) {
    this.musicState = state;
  }

  private ensure() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      // Gentle bus compression glues layered SFX + music together.
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
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
    this.tone(300, 0.18, 'sawtooth', 0.14, 0, 720);
    this.noise(0.14, 0.08); // air whoosh under the pitch rise
  }

  fizzle() {
    this.tone(180, 0.22, 'sine', 0.2, 0, 90);
  }

  /** Combo pop rising in pitch with combo size, with a low thump for body. */
  pop(combo: number, big: boolean) {
    const base = 440 + Math.min(combo, 24) * 28;
    this.tone(110, 0.09, 'sine', 0.22, 0, 55); // body
    this.tone(base, 0.12, 'triangle', 0.26);
    this.tone(base * 1.5, 0.1, 'sine', 0.16, 0.02);
    if (big) {
      this.noise(0.12, 0.18);
      this.tone(base * 2, 0.16, 'square', 0.12, 0.03);
    }
  }

  /** Combo milestone fanfare — one tier louder & longer each time. */
  praise(tier: number) {
    const roots = [659, 784, 1047];
    const root = roots[Math.min(tier, roots.length - 1)];
    [1, 1.25, 1.5, 2].forEach((r, i) =>
      this.tone(root * r, 0.16 + tier * 0.03, 'triangle', 0.2, i * 0.045),
    );
    if (tier >= 2) this.noise(0.2, 0.14);
  }

  /** Happy piggy squeal (poking a rescued piggy in the Kingdom). */
  squeal() {
    this.tone(620, 0.1, 'square', 0.16, 0, 1150);
    this.tone(880, 0.14, 'triangle', 0.18, 0.07, 1400);
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
    this.setMusicState('fever');
  }

  feverEnd() {
    this.tone(400, 0.3, 'sine', 0.16, 0, 220);
    // Caller (GameScreen) restores the tide-appropriate state next frame.
  }

  // --- Glitch Tide SFX --------------------------------------------------
  /** Soft warning shimmer when the Tide first enters the Critical stage. */
  tideWarn() {
    this.tone(370, 0.18, 'triangle', 0.16, 0, 300);
    this.tone(555, 0.2, 'sine', 0.1, 0.06);
  }

  /** A Glitch Strike — a detuned wobble, tense but not harsh. */
  glitchStrike() {
    this.tone(220, 0.28, 'sawtooth', 0.18, 0, 150);
    this.tone(233, 0.28, 'sawtooth', 0.14, 0.01, 140); // slight detune = glitch
    this.noise(0.2, 0.14);
    this.tone(330, 0.22, 'square', 0.12, 0.12);
  }

  /** Sparkling reward bell when a match restores Tide time. */
  timeRestore() {
    this.tone(1047, 0.12, 'sine', 0.16, 0, 1319);
    this.tone(1568, 0.14, 'triangle', 0.1, 0.05);
  }

  /** Freeze Pop / freeze moment — a glassy descending chime. */
  freeze() {
    this.tone(1319, 0.24, 'sine', 0.16, 0, 784);
    this.tone(880, 0.3, 'triangle', 0.1, 0.05, 660);
  }

  /** Item-use pop with a bright confirm. */
  item() {
    this.tone(660, 0.09, 'triangle', 0.2, 0, 990);
    this.tone(1320, 0.12, 'sine', 0.14, 0.06);
  }

  /** Powerful final-pixel release — the board is clear. */
  finalRelease() {
    const seq = [523, 659, 784, 1047, 1319, 1568];
    seq.forEach((f, i) => this.tone(f, 0.34, 'triangle', 0.24, i * 0.08));
    this.tone(131, 0.6, 'sine', 0.2, 0, 262);
    this.noise(0.5, 0.16);
    this.tone(2093, 0.5, 'sine', 0.1, 0.4);
  }

  // --- Replay reward SFX (all original) --------------------------------
  /** Rising three-note chime for a new high score. */
  highScoreChime() {
    [659, 831, 988].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.22, i * 0.11));
    this.tone(1319, 0.24, 'sine', 0.12, 0.34);
  }

  /** Sparkling ping for a newly earned star. */
  starPing() {
    this.tone(1568, 0.1, 'sine', 0.16, 0, 2093);
    this.tone(2093, 0.14, 'triangle', 0.1, 0.05);
  }

  /** Short chest-opening flourish. */
  chestOpen() {
    this.tone(196, 0.14, 'sawtooth', 0.14, 0, 260); // creak
    [784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.18, 0.12 + i * 0.05));
    this.noise(0.18, 0.1);
  }

  /** Soft coin cascade for the reward total. */
  coinCascade() {
    for (let i = 0; i < 5; i++) this.tone(880 + i * 90, 0.07, 'square', 0.12, i * 0.055);
  }

  /** Gentle two-note pad for a story cinematic panel. */
  storyChime() {
    this.tone(392, 0.5, 'sine', 0.08, 0, 523);
    this.tone(523, 0.6, 'triangle', 0.06, 0.16);
  }

  /** Soft two-note cue when the objective card appears. */
  objectiveCue() {
    this.tone(523, 0.14, 'sine', 0.09, 0, 659);
    this.tone(784, 0.16, 'triangle', 0.07, 0.1);
  }

  /** Bright anticipation blip for the "one more!" near-win moment. */
  oneMore() {
    this.tone(880, 0.1, 'triangle', 0.12, 0, 1175);
    this.tone(1175, 0.14, 'sine', 0.1, 0.08);
  }

  /** Warm rising flourish for a Sanctuary restoration reveal. */
  restoreFlourish() {
    const seq = [392, 523, 659, 784];
    seq.forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.16, i * 0.13));
    this.tone(1047, 0.6, 'sine', 0.12, 0.5); // warm bloom
    this.tone(659, 0.7, 'sine', 0.06, 0.5); // soft under-layer
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

  // --- Adaptive background music ---------------------------------------
  startMusic() {
    if (this.musicTimer != null) return;
    this.ensure();
    // A warm, hopeful 8-step loop in a pentatonic-friendly key.
    const bassLine = [131, 131, 165, 196, 147, 147, 175, 196];
    const marimba = [523, 659, 587, 784, 698, 659, 587, 494];
    const pluck = [784, 988, 880, 1047, 988, 880, 784, 659];
    this.musicStep = 0;
    this.musicState = 'playful';
    this.live = { ...MUSIC_PROFILES.playful };

    const step = () => {
      const target = MUSIC_PROFILES[this.musicState];
      // Lerp live params toward the target for a smooth crossfade.
      const k = 0.28;
      this.live.stepMs += (target.stepMs - this.live.stepMs) * k;
      this.live.bass += (target.bass - this.live.bass) * k;
      this.live.marimba += (target.marimba - this.live.marimba) * k;
      this.live.pluck += (target.pluck - this.live.pluck) * k;
      this.live.sparkle += (target.sparkle - this.live.sparkle) * k;
      this.live.transpose += (target.transpose - this.live.transpose) * k;

      if (!this._muted && this._musicEnabled && this.ctx) {
        const i = this.musicStep % 8;
        const tr = this.live.transpose;
        // Bass foundation.
        if (this.live.bass > 0.005) this.tone(semis(bassLine[i], tr), 0.24, 'triangle', this.live.bass);
        // Marimba melody on the strong beats.
        if (this.live.marimba > 0.005 && (i % 2 === 0 || tr > 6)) {
          this.tone(semis(marimba[i], tr), 0.2, 'sine', this.live.marimba);
        }
        // Plucked synth counter-line as tension builds.
        if (this.live.pluck > 0.006) {
          this.tone(semis(pluck[i], tr), 0.12, 'triangle', this.live.pluck, i % 2 ? 0.06 : 0);
        }
        // Sparkle bells in Critical/Fever.
        if (this.live.sparkle > 0.006 && i % 4 === 0) {
          this.tone(semis(marimba[i] * 2, tr), 0.14, 'sine', this.live.sparkle, 0.03);
        }
      }
      this.musicStep++;
      this.musicTimer = window.setTimeout(step, Math.round(this.live.stepMs));
    };
    step();
  }

  stopMusic() {
    if (this.musicTimer != null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicState = 'playful';
  }
}

export const audio = new AudioManager();

let hapticsEnabled = true;

export function setHaptics(on: boolean) {
  hapticsEnabled = on;
}

export function vibrate(pattern: number | number[]) {
  if (!hapticsEnabled) return;
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
