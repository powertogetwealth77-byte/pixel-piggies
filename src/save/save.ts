// Local save / progression system backed by localStorage.

import { LEVEL_COUNT } from '../data/levels';

export interface LevelProgress {
  stars: number;
  bestScore: number;
  cleared: boolean;
}

export interface KingdomState {
  house: number; // 0..100 restoration
  bakery: number;
  fountain: number;
}

export interface SaveData {
  version: number;
  unlockedLevel: number; // highest unlocked (1-based)
  levels: Record<number, LevelProgress>;
  coins: number;
  pigment: number;
  kingdom: KingdomState;
  mochiRescued: boolean;
  settings: {
    muted: boolean;
    reducedMotion: boolean;
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
    settings: { muted: false, reducedMotion: false },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed.version !== VERSION) return defaultSave();
    // Fill any missing fields defensively.
    return { ...defaultSave(), ...parsed, settings: { ...defaultSave().settings, ...parsed.settings } };
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
  next.levels[reward.levelId] = { stars: bestStars, bestScore, cleared: true };

  next.coins += reward.coins;
  // Pigment only granted on the first clear of a level (progression currency).
  if (firstClear) {
    next.pigment += reward.pigment;
    // Rescue Mochi on completing level 5.
    if (reward.levelId === 5) next.mochiRescued = true;
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

export function totalStars(data: SaveData): number {
  return Object.values(data.levels).reduce((sum, l) => sum + l.stars, 0);
}

function structuredCloneSafe<T>(v: T): T {
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v)) as T;
}
