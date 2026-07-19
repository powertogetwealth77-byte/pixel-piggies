// Playtest & diagnostics — all local, no network, no personal data.
//
// Enables a safe playtest surface (badge, summary, feedback, quick prompts,
// perf monitor, diagnostic export) gated behind a flag. Nothing here changes
// gameplay difficulty or rewards, and nothing is ever transmitted.

import { telemetry } from '../telemetry/telemetry';
import { APP_VERSION, BUILD_ID, SAVE_SCHEMA_VERSION } from '../version';
import type { SaveData } from '../save/save';

const FLAG_KEY = 'pixel-piggies-playtest';
const DEV_KEY = 'pixel-piggies-devtools';
const FEEDBACK_KEY = 'pixel-piggies-feedback';
const PROMPT_KEY = 'pixel-piggies-prompts';
const ERROR_KEY = 'pixel-piggies-errors';
const FEEDBACK_CAP = 100;
const ERROR_CAP = 50;

const isDevBuild = (): boolean =>
  typeof import.meta !== 'undefined' && !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV;

function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function writeFlag(key: string, on: boolean) {
  try { on ? localStorage.setItem(key, '1') : localStorage.removeItem(key); } catch { /* ignore */ }
}

/** Read `?playtest=1` / `?dev=1` once and persist so it survives navigation. */
export function initPlaytestFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get('playtest') === '1') writeFlag(FLAG_KEY, true);
    if (p.get('playtest') === '0') writeFlag(FLAG_KEY, false);
    if (p.get('dev') === '1') writeFlag(DEV_KEY, true);
  } catch { /* ignore */ }
}

/** Playtest mode: query flag, stored toggle, or a dev build. */
export function isPlaytest(): boolean {
  return isDevBuild() || readFlag(FLAG_KEY);
}
/** Extra developer-only tools (skip-to-level); never on for ordinary players. */
export function isDevTools(): boolean {
  return isDevBuild() || readFlag(DEV_KEY);
}
export function setPlaytest(on: boolean) { writeFlag(FLAG_KEY, on); }

// ---- Feedback (local only) ------------------------------------------------
export interface Feedback {
  at: string;
  rating: number; // 1–5
  category: string;
  confusing: string;
  frustrating: string;
  enjoyed: string;
  pig: string;
  again: string;
}

export function saveFeedback(f: Feedback) {
  try {
    const all = getFeedback();
    all.push(f);
    while (all.length > FEEDBACK_CAP) all.shift();
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
  telemetry.log('feedback_submitted');
}
export function getFeedback(): Feedback[] {
  try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]'); } catch { return []; }
}

// ---- One-tap quick prompts (playtest only, once each) ----------------------
export function promptAnswered(id: string): boolean {
  try { return id in JSON.parse(localStorage.getItem(PROMPT_KEY) || '{}'); } catch { return false; }
}
export function answerPrompt(id: string, answer: string) {
  try {
    const all = JSON.parse(localStorage.getItem(PROMPT_KEY) || '{}');
    all[id] = { answer, at: new Date().toISOString() };
    localStorage.setItem(PROMPT_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
  telemetry.log(`prompt_${id}`);
}
export function getPromptAnswers(): Record<string, { answer: string; at: string }> {
  try { return JSON.parse(localStorage.getItem(PROMPT_KEY) || '{}'); } catch { return {}; }
}

// ---- Error log (capped, no personal data) ---------------------------------
export interface ErrorRecord {
  at: string;
  message: string;
  stack?: string;
  screen?: string;
  level?: number;
  appVersion: string;
}
export function logError(rec: Omit<ErrorRecord, 'at' | 'appVersion'>) {
  try {
    const all = getErrors();
    all.push({ ...rec, at: new Date().toISOString(), appVersion: APP_VERSION });
    while (all.length > ERROR_CAP) all.shift();
    localStorage.setItem(ERROR_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
export function getErrors(): ErrorRecord[] {
  try { return JSON.parse(localStorage.getItem(ERROR_KEY) || '[]'); } catch { return []; }
}

// ---- Performance monitor (sampled; paused when hidden) ---------------------
export type PerfBand = 'good' | 'fair' | 'poor';

class PerfMonitor {
  fps = 60;
  band: PerfBand = 'good';
  longFrames = 0;
  loadMs = 0;
  private running = false;
  private raf = 0;
  private last = 0;
  private frames = 0;
  private acc = 0;

  start() {
    if (this.running) return;
    this.running = true;
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      this.loadMs = nav ? Math.round(nav.domContentLoadedEventEnd) : 0;
    } catch { /* ignore */ }
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      if (document.hidden) { this.raf = requestAnimationFrame(loop); return; } // paused when hidden
      const now = performance.now();
      const dt = now - this.last;
      this.last = now;
      if (dt > 50) this.longFrames++;
      this.frames++;
      this.acc += dt;
      if (this.acc >= 1000) {
        this.fps = Math.round((this.frames * 1000) / this.acc);
        this.band = this.fps >= 50 ? 'good' : this.fps >= 30 ? 'fair' : 'poor';
        this.frames = 0;
        this.acc = 0;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  status() { return { fps: this.fps, band: this.band, longFrames: this.longFrames, loadMs: this.loadMs }; }
}
export const perf = new PerfMonitor();

// ---- Diagnostics (no secrets, no fingerprinting) --------------------------
export function buildDiagnostics(save: SaveData) {
  const t = telemetry.snapshot();
  return {
    kind: 'pixel-piggies-diagnostics',
    appVersion: APP_VERSION,
    buildId: BUILD_ID,
    saveSchema: SAVE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    device: t.context, // device category / viewport / browser family only
    settings: save.settings,
    progress: {
      unlockedLevel: save.unlockedLevel,
      coins: save.coins,
      tokens: save.rescueTokens,
      freedPigs: Object.values(save.freedPigs).filter(Boolean).length,
    },
    summary: telemetry.summary(),
    recentEvents: t.eventLog.slice(-200),
    feedback: getFeedback(),
    promptAnswers: getPromptAnswers(),
    perf: perf.status(),
    errors: getErrors(),
  };
}

/** A short, human-readable summary for pasting into a bug report / Claude Code. */
export function diagnosticsText(save: SaveData): string {
  const s = telemetry.summary();
  const p = perf.status();
  const t = telemetry.snapshot();
  return [
    `Pixel Piggies ${APP_VERSION} (${BUILD_ID}) · save schema ${SAVE_SCHEMA_VERSION}`,
    `Device: ${t.context.device} · ${t.context.viewport} · ${t.context.browser}`,
    `Settings: reducedMotion=${save.settings.reducedMotion} lowEffects=${save.settings.lowEffects} sound=${!save.settings.muted}`,
    `Sessions: ${s.sessions} · levels ${s.levelsCompleted}/${s.levelsAttempted} · completion ${s.completionRate}%`,
    `Avg attempts/level: ${s.avgAttempts} · most-failed level: ${s.mostFailedLevel ?? '—'}`,
    `Invalid inputs: ${s.invalidInputs} · hints ${s.hintUsed}/${s.hintOffered} · best combo ${s.highestCombo}`,
    `Sanctuary visits: ${s.sanctuaryVisits} · rescues ${s.rescues} · quests ${s.questsClaimed}`,
    `Perf: ${p.band} (~${p.fps}fps, ${p.longFrames} long frames, load ${p.loadMs}ms)`,
    `Recent errors: ${getErrors().length}`,
  ].join('\n');
}

/** Download any JS object as a JSON file (stays on the device). */
export function downloadJson(obj: unknown, name: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
