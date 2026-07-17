// Local save / progression system backed by localStorage.

import { LEVELS, LEVEL_COUNT } from '../data/levels';
import { RESCUE_ARCS } from '../data/piggies';
import type { PiggyType } from '../engine/types';

export interface LevelProgress {
  stars: number;
  bestScore: number;
  bestCombo: number;
  cleared: boolean;
}

export interface KingdomState {
  house: number; // 0..100 restoration
  bakery: number;
  fountain: number;
}

export type BoardTheme = 'classic' | 'sunrise' | 'candy' | 'lagoon';

export interface SaveData {
  version: number;
  unlockedLevel: number; // highest unlocked (1-based)
  levels: Record<number, LevelProgress>;
  coins: number;
  pigment: number;
  kingdom: KingdomState;
  /** Kept for backwards compatibility with old saves; mirrors rescued.mochi. */
  mochiRescued: boolean;
  /** Which hero piggies have been rescued from their milestone levels. */
  rescued: Partial<Record<PiggyType, boolean>>;
  /** Daily bonus board state: last completed date (YYYY-MM-DD). */
  dailyDone: string | null;
  settings: {
    muted: boolean;
    musicOff: boolean;
    hapticsOff: boolean;
    reducedMotion: boolean;
    lowEffects: boolean;
    colorSymbols: boolean;
    theme: BoardTheme;
  };
}

const KEY = 'pixel-piggies-save-v1';
const VERSION = 1;

export function defaultSave(): SaveData {
  return {
    version: VERSION,
    unlockedLevel: 1,
    levels: {},
    coins: 0,
    pigment: 0,
    kingdom: { house: 0, bakery: 0, fountain: 0 },
    mochiRescued: false,
    rescued: {},
    dailyDone: null,
    settings: {
      muted: false,
      musicOff: false,
      hapticsOff: false,
      reducedMotion: false,
      lowEffects: false,
      colorSymbols: false,
      theme: 'classic',
    },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed.version !== VERSION) return defaultSave();
    // Fill any missing fields defensively.
    const merged: SaveData = {
      ...defaultSave(),
      ...parsed,
      rescued: { ...parsed.rescued },
      settings: { ...defaultSave().settings, ...parsed.settings },
    };
    // Migrate pre-rescue-arc saves: mochiRescued implies rescued.mochi.
    if (merged.mochiRescued) merged.rescued.mochi = true;
    return merged;
  } catch {
    return defaultSave();
  }
}

export function persist(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable */
  }
}

export function resetSave(): SaveData {
  const fresh = defaultSave();
  persist(fresh);
  return fresh;
}

export interface LevelReward {
  levelId: number;
  stars: number;
  score: number;
  bestCombo: number;
  coins: number;
  pigment: number;
}

/** Apply the result of a completed level and return the updated save. */
export function applyLevelResult(prev: SaveData, reward: LevelReward): SaveData {
  const next: SaveData = structuredCloneSafe(prev);
  const existing = next.levels[reward.levelId];
  const firstClear = !existing?.cleared;
  const bestStars = Math.max(existing?.stars ?? 0, reward.stars);
  const bestScore = Math.max(existing?.bestScore ?? 0, reward.score);
  const bestCombo = Math.max(existing?.bestCombo ?? 0, reward.bestCombo);
  next.levels[reward.levelId] = { stars: bestStars, bestScore, bestCombo, cleared: true };

  next.coins += reward.coins;
  // Pigment only granted on the first clear of a level (progression currency).
  if (firstClear) {
    next.pigment += reward.pigment;
    // Rescue milestone: free the caged hero and grant their one-time reward.
    const hero = LEVELS.find((l) => l.id === reward.levelId)?.rescue;
    if (hero && !next.rescued[hero]) {
      next.rescued[hero] = true;
      if (hero === 'mochi') next.mochiRescued = true;
      const arc = RESCUE_ARCS[hero];
      next.coins += arc.reward.coins;
      next.pigment += arc.reward.pigment;
    }
  }

  // Unlock next level.
  if (reward.levelId >= next.unlockedLevel && reward.levelId < LEVEL_COUNT) {
    next.unlockedLevel = reward.levelId + 1;
  }
  return next;
}

/** Spend pigment to restore part of the kingdom. Returns null if unaffordable. */
export function restore(prev: SaveData, part: keyof KingdomState, cost: number, amount: number): SaveData | null {
  if (prev.pigment < cost) return null;
  if (prev.kingdom[part] >= 100) return null;
  const next: SaveData = structuredCloneSafe(prev);
  next.pigment -= cost;
  next.kingdom[part] = Math.min(100, next.kingdom[part] + amount);
  return next;
}

/** Board themes unlocked by fully restoring kingdom structures. */
export function unlockedThemes(data: SaveData): BoardTheme[] {
  const out: BoardTheme[] = ['classic'];
  if (data.kingdom.house >= 100) out.push('sunrise');
  if (data.kingdom.bakery >= 100) out.push('candy');
  if (data.kingdom.fountain >= 100) out.push('lagoon');
  return out;
}

export function totalStars(data: SaveData): number {
  return Object.values(data.levels).reduce((sum, l) => sum + l.stars, 0);
}

function structuredCloneSafe<T>(v: T): T {
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v)) as T;
}
