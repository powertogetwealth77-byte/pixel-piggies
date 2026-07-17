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
}

const KEY = 'pixel-piggies-telemetry-v1';
const MAX_DAYS = 120;

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

  session() {
    if (this.duplicate('session', 5000)) return;
    this.data.sessions += 1;
    const today = new Date().toISOString().slice(0, 10);
    if (!this.data.daysPlayed.includes(today)) {
      this.data.daysPlayed.push(today);
      if (this.data.daysPlayed.length > MAX_DAYS) this.data.daysPlayed.shift();
    }
    this.persist();
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
