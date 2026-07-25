// Privacy-safe local playtest telemetry.
//
// Everything is stored ONLY in this browser's localStorage — there are no
// network calls, no identifiers, and no external tracking of any kind. The
// data exists so playtesters can export a JSON snapshot (Settings → Playtest
// stats) that shows where players struggle, and can wipe it at any time.

export interface LevelStats {
  attempts: number;
  wins: number;
  losses: number;
  retries: number;
  fizzles: number;
  bestTimeMs: number | null;
}

export interface TelemetryData {
  version: 1;
  createdAt: string;
  /** Count of app loads and the distinct local days the game was opened. */
  sessions: number;
  daysPlayed: string[]; // YYYY-MM-DD, capped
  tutorialCompleted: boolean;
  feverActivations: number;
  largestCombo: number;
  kingdomVisits: number;
  dailiesCompleted: number;
  rescues: Partial<Record<string, string>>; // hero -> ISO timestamp
  levels: Record<number, LevelStats>;
  // --- The Glitch Tide ---
  /** Highest Tide stage reached: 0 none, 1 calm, 2 building, 3 critical. */
  maxTideStage: number;
  /** Total Tide points restored by matches/items (proxy for "time restored"). */
  timeRestored: number;
  glitchStrikes: number;
  timeoutLosses: number;
  feverSaves: number; // Fever ignited while in the Critical stage
  relaxedRuns: number;
  itemUses: Partial<Record<string, number>>;
  coinContinues: number;
  postLossExits: number;
  sanctuaryVisits: number;
  pigsFreed: number;
  /** Cumulative ms shaved off piggy return cooldowns by good play (active recovery loop). */
  cooldownSavedMs: number;
  /** Instant piggy recalls by source: chains, the Whistle item, Fever, Second Wind. */
  recalls: Partial<Record<'chain' | 'whistle' | 'fever' | 'secondWind', number>>;
  /** Lightweight internal event counters (world map, replay economy, etc.). */
  events: Partial<Record<string, number>>;
  /** Anonymous, locally-generated id — no personal data, never sent anywhere. */
  anonId: string;
  /** Non-identifying session/device context, refreshed each app load. */
  context: SessionContext;
  /** Capped rolling log of recent events (name + relative ms), for the report. */
  eventLog: Array<{ t: number; name: string }>;
}

export interface SessionContext {
  device: 'mobile' | 'tablet' | 'desktop';
  viewport: string; // "WxH" bucketed
  browser: string; // family only (Chrome/Safari/Firefox/Edge/Other)
  reducedMotion: boolean;
  lowEffects: boolean;
  sound: boolean;
  startedAt: string;
}

const KEY = 'pixel-piggies-telemetry-v1';
const MAX_DAYS = 120;
const EVENT_CAP = 3000;

function detectDevice(): SessionContext['device'] {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  if (touch && w < 600) return 'mobile';
  if (touch && w < 1024) return 'tablet';
  return 'desktop';
}

function detectBrowser(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

function genId(): string {
  return 'pt-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function blank(): TelemetryData {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    sessions: 0,
    daysPlayed: [],
    tutorialCompleted: false,
    feverActivations: 0,
    largestCombo: 0,
    kingdomVisits: 0,
    dailiesCompleted: 0,
    rescues: {},
    levels: {},
    maxTideStage: 0,
    timeRestored: 0,
    glitchStrikes: 0,
    timeoutLosses: 0,
    feverSaves: 0,
    relaxedRuns: 0,
    itemUses: {},
    coinContinues: 0,
    postLossExits: 0,
    sanctuaryVisits: 0,
    pigsFreed: 0,
    cooldownSavedMs: 0,
    recalls: {},
    events: {},
    anonId: genId(),
    context: { device: 'desktop', viewport: '', browser: 'Other', reducedMotion: false, lowEffects: false, sound: true, startedAt: new Date().toISOString() },
    eventLog: [],
  };
}

class Telemetry {
  private data: TelemetryData;
  private saveTimer = 0;
  /** Dedupe rapid duplicate events (React StrictMode double-mounts in dev). */
  private lastEvent = new Map<string, number>();

  constructor() {
    this.data = this.load();
  }

  private duplicate(key: string, windowMs = 800): boolean {
    const now = performance.now();
    const prev = this.lastEvent.get(key);
    this.lastEvent.set(key, now);
    return prev !== undefined && now - prev < windowMs;
  }

  private load(): TelemetryData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const parsed = JSON.parse(raw) as TelemetryData;
      if (parsed.version !== 1) return blank();
      return { ...blank(), ...parsed };
    } catch {
      return blank();
    }
  }

  private persist() {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch {
        /* storage unavailable — telemetry is best-effort */
      }
    }, 250);
  }

  private level(id: number): LevelStats {
    if (!this.data.levels[id]) {
      this.data.levels[id] = {
        attempts: 0,
        wins: 0,
        losses: 0,
        retries: 0,
        fizzles: 0,
        bestTimeMs: null,
      };
    }
    return this.data.levels[id];
  }

  private sessionStart = performance.now();

  session(ctx?: { reducedMotion?: boolean; lowEffects?: boolean; sound?: boolean }) {
    if (this.duplicate('session', 5000)) return;
    this.data.sessions += 1;
    if (!this.data.anonId) this.data.anonId = genId();
    this.sessionStart = performance.now();
    this.data.context = {
      device: detectDevice(),
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      browser: detectBrowser(),
      reducedMotion: !!ctx?.reducedMotion,
      lowEffects: !!ctx?.lowEffects,
      sound: ctx?.sound ?? true,
      startedAt: new Date().toISOString(),
    };
    const today = new Date().toISOString().slice(0, 10);
    if (!this.data.daysPlayed.includes(today)) {
      this.data.daysPlayed.push(today);
      if (this.data.daysPlayed.length > MAX_DAYS) this.data.daysPlayed.shift();
    }
    this.persist();
  }

  /** Milliseconds elapsed in the current session (local, best-effort). */
  sessionDurationMs(): number {
    return Math.round(performance.now() - this.sessionStart);
  }

  /** Record a screen visit as a capped event. */
  screen(name: string) {
    if (this.duplicate(`screen:${name}`, 400)) return;
    this.log(`screen_${name}`);
  }

  levelStart(id: number) {
    if (this.duplicate(`start:${id}`)) return;
    this.level(id).attempts += 1;
    this.persist();
  }

  levelEnd(id: number, won: boolean, timeMs: number, bestCombo: number) {
    const l = this.level(id);
    if (won) {
      l.wins += 1;
      if (l.bestTimeMs == null || timeMs < l.bestTimeMs) l.bestTimeMs = Math.round(timeMs);
    } else {
      l.losses += 1;
    }
    this.data.largestCombo = Math.max(this.data.largestCombo, bestCombo);
    this.persist();
  }

  retry(id: number) {
    this.level(id).retries += 1;
    this.persist();
  }

  fizzle(id: number) {
    this.level(id).fizzles += 1;
    this.persist();
  }

  fever() {
    this.data.feverActivations += 1;
    this.persist();
  }

  tutorialDone() {
    if (this.data.tutorialCompleted) return;
    this.data.tutorialCompleted = true;
    this.persist();
  }

  kingdomVisit() {
    if (this.duplicate('kingdom')) return;
    this.data.kingdomVisits += 1;
    this.persist();
  }

  rescue(hero: string) {
    if (!this.data.rescues[hero]) {
      this.data.rescues[hero] = new Date().toISOString();
      this.persist();
    }
  }

  dailyDone() {
    this.data.dailiesCompleted += 1;
    this.persist();
  }

  // --- Glitch Tide telemetry (all local) ---
  tideStage(stage: number) {
    if (stage > this.data.maxTideStage) {
      this.data.maxTideStage = stage;
      this.persist();
    }
  }

  timeRestored(points: number) {
    if (points <= 0) return;
    this.data.timeRestored += Math.round(points);
    this.persist();
  }

  glitchStrike() {
    this.data.glitchStrikes += 1;
    this.persist();
  }

  timeoutLoss() {
    this.data.timeoutLosses += 1;
    this.persist();
  }

  feverSave() {
    this.data.feverSaves += 1;
    this.persist();
  }

  relaxedRun() {
    this.data.relaxedRuns += 1;
    this.persist();
  }

  itemUse(id: string) {
    this.data.itemUses[id] = (this.data.itemUses[id] ?? 0) + 1;
    this.persist();
  }

  /** Cumulative ms shaved off piggy return cooldowns by good play, this run. */
  cooldownSaved(ms: number) {
    this.data.cooldownSavedMs += ms;
    this.persist();
  }

  /** An instant piggy recall fired (chain / whistle / fever / secondWind). */
  recall(source: 'chain' | 'whistle' | 'fever' | 'secondWind', count = 1) {
    this.data.recalls[source] = (this.data.recalls[source] ?? 0) + count;
    this.persist();
  }

  coinContinue() {
    this.data.coinContinues += 1;
    this.persist();
  }

  postLossExit() {
    this.data.postLossExits += 1;
    this.persist();
  }

  sanctuaryVisit() {
    if (this.duplicate('sanctuary')) return;
    this.data.sanctuaryVisits += 1;
    this.persist();
  }

  pigFreed() {
    this.data.pigsFreed += 1;
    this.persist();
  }

  /** Generic lightweight event logger (world_viewed, level_replayed, …). */
  log(name: string) {
    this.data.events[name] = (this.data.events[name] ?? 0) + 1;
    // Append to the capped rolling event log (drops oldest beyond the cap).
    this.data.eventLog.push({ t: Math.round(performance.now() - this.sessionStart), name });
    if (this.data.eventLog.length > EVENT_CAP) {
      this.data.eventLog.splice(0, this.data.eventLog.length - EVENT_CAP);
    }
    this.persist();
  }

  /** Computed playtest summary: totals, rates, and a per-level table. */
  summary() {
    const d = this.data;
    const rows = Object.entries(d.levels)
      .map(([id, l]) => {
        const attempts = l.attempts;
        const wins = l.wins;
        return {
          level: Number(id),
          attempts,
          wins,
          failures: l.losses,
          completion: attempts ? Math.round((wins / attempts) * 100) : 0,
          avgMs: l.bestTimeMs ?? 0,
          retries: l.retries,
        };
      })
      .sort((a, b) => a.level - b.level);
    const totalAttempts = rows.reduce((s, r) => s + r.attempts, 0);
    const totalWins = rows.reduce((s, r) => s + r.wins, 0);
    const mostFailed = [...rows].sort((a, b) => b.failures - a.failures)[0];
    const ev = d.events;
    return {
      sessions: d.sessions,
      levelsAttempted: rows.filter((r) => r.attempts > 0).length,
      levelsCompleted: rows.filter((r) => r.wins > 0).length,
      totalAttempts,
      completionRate: totalAttempts ? Math.round((totalWins / totalAttempts) * 100) : 0,
      avgAttempts: rows.length ? +(totalAttempts / rows.length).toFixed(1) : 0,
      mostFailedLevel: mostFailed && mostFailed.failures > 0 ? mostFailed.level : null,
      invalidInputs: ev.invalid_action_feedback ?? 0,
      hintOffered: ev.smart_hint_offered ?? 0,
      hintUsed: ev.smart_hint_used ?? 0,
      highestCombo: d.largestCombo,
      sanctuaryVisits: d.sanctuaryVisits,
      bookVisits: ev.piggy_book_opened ?? 0,
      pigCardViews: ev.pig_card_opened ?? 0,
      rescues: d.pigsFreed,
      questsClaimed: ev.pig_personal_quest_reward_claimed ?? 0,
      heartMoments: ev.heart_moment_triggered ?? 0,
      nearWins: ev.near_win_entered ?? 0,
      rows,
    };
  }

  snapshot(): TelemetryData {
    return JSON.parse(JSON.stringify(this.data)) as TelemetryData;
  }

  /** Download the current stats as a JSON file (stays on the device). */
  export() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel-piggies-playtest-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  reset() {
    this.data = blank();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

export const telemetry = new Telemetry();
