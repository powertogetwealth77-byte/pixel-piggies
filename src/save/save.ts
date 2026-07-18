// Local save / progression system backed by localStorage.

import { LEVELS, LEVEL_COUNT } from '../data/levels';
import { RESCUE_ARCS } from '../data/piggies';
import { ITEMS } from '../data/items';
import { SANCTUARY, PIG_BY_ID, type CaptivePig } from '../data/sanctuary';
import { earnedRevealTiers } from '../data/story';
import { clearedLevelsCount, masteryEligible, masteryReward } from '../data/book';
import type { ItemId, PiggyType } from '../engine/types';

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
  /** Rescue Tokens — earned by playing well, spent to free golden Sanctuary piggies. */
  rescueTokens: number;
  /** Captive Sanctuary piggies that have been set free. */
  freedPigs: Partial<Record<string, boolean>>;
  kingdom: KingdomState;
  /** Kept for backwards compatibility with old saves; mirrors rescued.mochi. */
  mochiRescued: boolean;
  /** Which hero piggies have been rescued from their milestone levels. */
  rescued: Partial<Record<PiggyType, boolean>>;
  /** Daily bonus board state: last completed date (YYYY-MM-DD). */
  dailyDone: string | null;
  /** Owned counts of recovery items bought with coins (free uses tracked separately). */
  items: Partial<Record<ItemId, number>>;
  /** How many free introductory uses of each item have been spent. */
  freeUsed: Partial<Record<ItemId, number>>;
  /** World reward chests already claimed (keyed by world index 0-4). */
  worldChests: Partial<Record<number, boolean>>;
  /** One-time new-star token grants, keyed "levelId:starNumber". */
  starRewarded: Partial<Record<string, boolean>>;
  /** Anti-grind: consecutive non-improving replays of the same level. */
  replay: { levelId: number; streak: number };
  /**
   * Story-layer flags. `introSeen` gates the one-time opening cinematic;
   * `sanctuaryReveals` records which restoration-tier reveals (keyed by tier
   * number 1–5) have already played, so each plays once.
   */
  story: { introSeen: boolean; sanctuaryReveals: Partial<Record<number, boolean>> };
  /**
   * The Piggy Book collection state. Everything here augments the rescue data
   * in `freedPigs`; it never gates whether a pig can be earned.
   */
  book: {
    /** Pigs revealed by a rescue-chain clue (id -> true). */
    discovered: Partial<Record<string, boolean>>;
    /** Rescue reveal already viewed (pig id -> true), so it doesn't replay. */
    reveals: Partial<Record<string, boolean>>;
    /** Highest cosmetic-mastery level claimed per pig (1–3). */
    mastery: Partial<Record<string, number>>;
    /** Progress snapshot taken when a pig was rescued (drives mastery). */
    rescueBaseline: Partial<Record<string, { cleared: number; freed: number }>>;
    /** Source pigs whose rescue-chain clue has already been shown. */
    clues: Partial<Record<string, boolean>>;
    /** Whether the Piggy Book intro tooltip has been dismissed. */
    tutorialSeen: boolean;
  };
  settings: {
    muted: boolean;
    musicOff: boolean;
    hapticsOff: boolean;
    reducedMotion: boolean;
    lowEffects: boolean;
    colorSymbols: boolean;
    relaxedMode: boolean;
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
    rescueTokens: 0,
    freedPigs: {},
    kingdom: { house: 0, bakery: 0, fountain: 0 },
    mochiRescued: false,
    rescued: {},
    dailyDone: null,
    items: {},
    freeUsed: {},
    worldChests: {},
    starRewarded: {},
    replay: { levelId: 0, streak: 0 },
    story: { introSeen: false, sanctuaryReveals: {} },
    book: { discovered: {}, reveals: {}, mastery: {}, rescueBaseline: {}, clues: {}, tutorialSeen: false },
    settings: {
      muted: false,
      musicOff: false,
      hapticsOff: false,
      reducedMotion: false,
      lowEffects: false,
      colorSymbols: false,
      relaxedMode: false,
      theme: 'classic',
    },
  };
}

/**
 * Reveals a pre-feature save has already earned, keyed by tier number, so old
 * players don't get a flood of restoration reveals for tiers they long passed.
 */
function backfillReveals(freedPigs: SaveData['freedPigs'] | undefined): Partial<Record<number, boolean>> {
  const freed = SANCTUARY.filter((p) => freedPigs?.[p.id]).length;
  const out: Partial<Record<number, boolean>> = {};
  for (const n of earnedRevealTiers(freed)) out[n] = true;
  return out;
}

/**
 * Build the Piggy Book state from a loaded save, merging any stored fields and
 * backfilling for pre-feature saves so existing rescued pigs are consistent:
 * their reveal counts as seen (no replay), their rescue-chain clue is applied,
 * and their mastery reflects current progress WITHOUT a retroactive payout
 * (currencies must not change on migration).
 */
function buildBook(parsed: Partial<SaveData>): SaveData['book'] {
  const base = defaultSave().book;
  const stored = parsed.book;
  const book: SaveData['book'] = {
    discovered: { ...base.discovered, ...stored?.discovered },
    reveals: { ...base.reveals, ...stored?.reveals },
    mastery: { ...base.mastery, ...stored?.mastery },
    rescueBaseline: { ...base.rescueBaseline, ...stored?.rescueBaseline },
    clues: { ...base.clues, ...stored?.clues },
    tutorialSeen: stored?.tutorialSeen ?? base.tutorialSeen,
  };
  if (stored) return book; // already on the feature — nothing to backfill

  // Pre-feature save: reconcile the pigs already rescued.
  const cleared = Object.values(parsed.levels ?? {}).filter((l) => l?.cleared).length;
  const eligibleLevel = cleared >= 8 ? 3 : cleared >= 3 ? 2 : 1;
  for (const c of SANCTUARY) {
    if (!parsed.freedPigs?.[c.id]) continue;
    book.reveals[c.id] = true; // already rescued — don't replay the reveal
    book.rescueBaseline[c.id] = { cleared: 0, freed: 0 };
    book.mastery[c.id] = eligibleLevel; // reflect standing, no coin payout
    const meta = PIG_BY_ID[c.id];
    if (meta?.revealsId && !parsed.freedPigs?.[meta.revealsId]) {
      book.discovered[meta.revealsId] = true;
      book.clues[c.id] = true;
    }
  }
  return book;
}

/** Remaining free introductory uses of an item. */
export function freeUsesLeft(save: SaveData, id: ItemId): number {
  return Math.max(0, ITEMS[id].freeUses - (save.freeUsed[id] ?? 0));
}

/** Total available uses right now: remaining free uses + coin-bought stock. */
export function itemAvailable(save: SaveData, id: ItemId): number {
  return freeUsesLeft(save, id) + (save.items[id] ?? 0);
}

/**
 * Consume one use of an item, spending a free use first, then owned stock.
 * Returns the updated save, or null if none are available.
 */
export function useItem(save: SaveData, id: ItemId): SaveData | null {
  if (freeUsesLeft(save, id) > 0) {
    return { ...save, freeUsed: { ...save.freeUsed, [id]: (save.freeUsed[id] ?? 0) + 1 } };
  }
  if ((save.items[id] ?? 0) > 0) {
    return { ...save, items: { ...save.items, [id]: (save.items[id] ?? 0) - 1 } };
  }
  return null;
}

/** Count of Sanctuary piggies set free so far. */
export function freedPigCount(save: SaveData): number {
  return SANCTUARY.filter((p) => save.freedPigs[p.id]).length;
}

export function canAffordPig(save: SaveData, pig: CaptivePig): boolean {
  if (save.freedPigs[pig.id]) return false;
  if (pig.cost.tokens != null) return save.rescueTokens >= pig.cost.tokens;
  return save.coins >= (pig.cost.coins ?? 0);
}

/** Free a captive Sanctuary piggy, spending coins or tokens. Null if unaffordable. */
export function freePig(save: SaveData, pig: CaptivePig): SaveData | null {
  if (!canAffordPig(save, pig)) return null;
  const next = structuredCloneSafe(save);
  if (pig.cost.tokens != null) next.rescueTokens -= pig.cost.tokens;
  else next.coins -= pig.cost.coins ?? 0;
  const freedBefore = freedPigCount(save);
  next.freedPigs[pig.id] = true;
  // Piggy Book: snapshot progress for mastery, and follow any rescue chain.
  next.book.rescueBaseline[pig.id] = { cleared: clearedLevelsCount(next), freed: freedBefore };
  next.book.mastery[pig.id] = 1; // Level 1 "Rescued"
  const meta = PIG_BY_ID[pig.id];
  if (meta?.revealsId && !next.freedPigs[meta.revealsId]) {
    next.book.discovered[meta.revealsId] = true;
    next.book.clues[pig.id] = true;
  }
  return next;
}

/** Mark a pig's rescue reveal as viewed so it doesn't replay. */
export function markPigRevealViewed(save: SaveData, pigId: string): SaveData {
  const next = structuredCloneSafe(save);
  next.book.reveals[pigId] = true;
  return next;
}

/**
 * Claim any newly-earned cosmetic mastery for a rescued pig, advancing to the
 * eligible level and granting its rewards exactly once (Level 3 pays a small
 * coin/token bonus). Returns null if nothing new is claimable.
 */
export function claimMasteryReward(
  save: SaveData,
  pigId: string,
): { next: SaveData; level: number; coins: number; tokens: number } | null {
  const pig = PIG_BY_ID[pigId];
  if (!pig || !save.freedPigs[pigId]) return null;
  const eligible = masteryEligible(save, pigId);
  const claimed = save.book.mastery[pigId] ?? 1;
  if (eligible <= claimed) return null;
  const next = structuredCloneSafe(save);
  let coins = 0;
  let tokens = 0;
  for (let lvl = claimed + 1; lvl <= eligible; lvl++) {
    const r = masteryReward(pig, lvl);
    coins += r.coins ?? 0;
    tokens += r.tokens ?? 0;
  }
  next.book.mastery[pigId] = eligible;
  next.coins += coins;
  next.rescueTokens += tokens;
  return { next, level: eligible, coins, tokens };
}

/**
 * Claim a world's reward chest exactly once. The caller passes the world's
 * span + reward; this verifies all six levels are cleared and not-yet-claimed.
 */
export function claimWorldChest(
  save: SaveData,
  world: { index: number; first: number; last: number; chest: { coins: number; tokens: number } },
): SaveData | null {
  if (save.worldChests[world.index]) return null; // already claimed
  for (let id = world.first; id <= world.last; id++) {
    if (!save.levels[id]?.cleared) return null; // world not complete
  }
  const next = structuredCloneSafe(save);
  next.worldChests[world.index] = true;
  next.coins += world.chest.coins;
  next.rescueTokens += world.chest.tokens;
  return next;
}

/** The next Sanctuary piggy to aim for, and whether it's affordable now. */
export function nextRescueTarget(
  save: SaveData,
): { pig: CaptivePig; ready: boolean; need: number; currency: 'coins' | 'tokens' } | null {
  const unfreed = SANCTUARY.filter((p) => !save.freedPigs[p.id]);
  if (unfreed.length === 0) return null;
  // Affordable right now? Prefer the cheapest affordable.
  const affordable = unfreed
    .filter((p) => canAffordPig(save, p))
    .sort((a, b) => cost(a) - cost(b));
  if (affordable.length) {
    const pig = affordable[0];
    return { pig, ready: true, need: 0, currency: pig.cost.tokens != null ? 'tokens' : 'coins' };
  }
  // Otherwise the closest coin-pig by coins still needed (fall back to token-pig).
  const coinPigs = unfreed.filter((p) => p.cost.coins != null);
  const pool = coinPigs.length ? coinPigs : unfreed;
  const pig = pool.sort((a, b) => cost(a) - cost(b))[0];
  if (pig.cost.tokens != null) {
    return { pig, ready: false, need: pig.cost.tokens - save.rescueTokens, currency: 'tokens' };
  }
  return { pig, ready: false, need: (pig.cost.coins ?? 0) - save.coins, currency: 'coins' };
}

function cost(p: CaptivePig): number {
  return p.cost.coins ?? (p.cost.tokens ?? 0) * 100; // token pigs rank after coin pigs
}

/** Buy one item with coins. Returns updated save, or null if unaffordable. */
export function buyItem(save: SaveData, id: ItemId): SaveData | null {
  const price = ITEMS[id].price;
  if (save.coins < price) return null;
  return {
    ...save,
    coins: save.coins - price,
    items: { ...save.items, [id]: (save.items[id] ?? 0) + 1 },
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
      items: { ...parsed.items },
      freeUsed: { ...parsed.freeUsed },
      freedPigs: { ...parsed.freedPigs },
      worldChests: { ...parsed.worldChests },
      starRewarded: { ...parsed.starRewarded },
      replay: parsed.replay ?? { levelId: 0, streak: 0 },
      // Returning players who already have progress shouldn't be interrupted by
      // the opening cinematic — treat a pre-story save as already-seen. New and
      // first-run players (no progress) get the intro. It's replayable either way.
      // Restoration reveals: if this save predates the feature, backfill the
      // reveals the player already earned so they don't get a flood of them on
      // their next Sanctuary visit — future tiers still reveal normally.
      story: {
        introSeen:
          parsed.story?.introSeen ??
          ((parsed.unlockedLevel ?? 1) > 1 || Object.keys(parsed.levels ?? {}).length > 0),
        sanctuaryReveals: parsed.story?.sanctuaryReveals
          ? { ...parsed.story.sanctuaryReveals }
          : backfillReveals(parsed.freedPigs),
      },
      book: buildBook(parsed),
      settings: { ...defaultSave().settings, ...parsed.settings },
    };
    // Migrate pre-rescue-arc saves: mochiRescued implies rescued.mochi.
    if (merged.mochiRescued) merged.rescued.mochi = true;
    // Migrate pre-star-token saves: mark already-owned stars as rewarded so
    // replays never retroactively grant tokens for stars the player already had.
    for (const [id, prog] of Object.entries(merged.levels)) {
      for (let n = 1; n <= (prog?.stars ?? 0); n++) {
        merged.starRewarded[`${id}:${n}`] ??= true;
      }
    }
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
  coins: number; // engine's first-clear coin value
  pigment: number;
}

/** All star ratings top out at 3; a "perfect" clear earns all 3. */
export const MAX_LEVEL_STARS = 3;

export const REWARD_PHRASES = [
  'OINKREDIBLE!',
  'SNOUTSTANDING!',
  'PIG-TASTIC!',
  'NEW PIGGY BEST!',
  "THAT'LL SHOW THE WOLVES!",
  'THE SANCTUARY GROWS!',
];

/** Compact, refresh-safe breakdown of what a level clear awarded. */
export interface RewardSummary {
  firstClear: boolean;
  baseCoins: number; // first-clear coin value, or replay base
  scoreBonus: number; // replay score bonus (post-cap)
  highScoreBonus: number;
  newStarTokens: number;
  treasureCoins: number;
  pigment: number;
  totalCoins: number;
  totalTokens: number;
  newHighScore: boolean;
  perfect: boolean;
  antiGrind: boolean; // base was reduced by the anti-grind rule
  phrase: string;
}

/**
 * Resolve a level clear into an updated save AND a reward summary, applying
 * all rewards atomically so a page refresh can never re-grant them. Handles
 * both the first clear (existing rewards + hero rescue) and the replay economy
 * (base coins, score/high-score bonuses, one-time new-star tokens, perfect
 * treasure chest, and anti-grind reduction).
 *
 * `rng` is injectable so tests are deterministic.
 */
export function resolveLevelReward(
  prev: SaveData,
  reward: LevelReward,
  maxStars = MAX_LEVEL_STARS,
  rng: () => number = Math.random,
): { next: SaveData; summary: RewardSummary } {
  const next: SaveData = structuredCloneSafe(prev);
  const existing = next.levels[reward.levelId];
  const firstClear = !existing?.cleared;
  const prevStars = existing?.stars ?? 0;
  const prevScore = existing?.bestScore ?? 0;

  const summary: RewardSummary = {
    firstClear,
    baseCoins: 0,
    scoreBonus: 0,
    highScoreBonus: 0,
    newStarTokens: 0,
    treasureCoins: 0,
    pigment: 0,
    totalCoins: 0,
    totalTokens: 0,
    newHighScore: false,
    perfect: reward.stars >= maxStars,
    antiGrind: false,
    phrase: REWARD_PHRASES[Math.floor(rng() * REWARD_PHRASES.length)] ?? REWARD_PHRASES[0],
  };

  // Save best progress.
  next.levels[reward.levelId] = {
    stars: Math.max(prevStars, reward.stars),
    bestScore: Math.max(prevScore, reward.score),
    bestCombo: Math.max(existing?.bestCombo ?? 0, reward.bestCombo),
    cleared: true,
  };

  let coins = 0;
  let tokens = 0;

  // Anti-grind tracker: completing ANY different level resets the streak.
  if (next.replay.levelId !== reward.levelId) {
    next.replay = { levelId: reward.levelId, streak: 0 };
  }

  if (firstClear) {
    // Keep the existing first-clear rewards and token logic.
    coins += reward.coins;
    tokens += 1 + Math.max(0, reward.stars - 1) + 1; // clear + per extra star + first-clear bonus
    next.pigment += reward.pigment;
    summary.pigment = reward.pigment;
    summary.baseCoins = reward.coins;
    const hero = LEVELS.find((l) => l.id === reward.levelId)?.rescue;
    if (hero && !next.rescued[hero]) {
      next.rescued[hero] = true;
      if (hero === 'mochi') next.mochiRescued = true;
      const arc = RESCUE_ARCS[hero];
      coins += arc.reward.coins;
      next.pigment += arc.reward.pigment;
      summary.pigment += arc.reward.pigment;
    }
    // Mark every star earned on the first clear as rewarded (no double later).
    for (let n = 1; n <= reward.stars; n++) next.starRewarded[`${reward.levelId}:${n}`] = true;
  } else {
    // --- Replay economy ---
    const improved = reward.score > prevScore || reward.stars > prevStars;
    // Anti-grind: count consecutive non-improving replays of the same level.
    next.replay.streak = improved ? 0 : next.replay.streak + 1;
    const base = next.replay.streak >= 5 ? 5 : 10;
    summary.antiGrind = base === 5;
    const rawScoreBonus = Math.min(15, Math.floor(reward.score / 1000));
    const normal = Math.min(25, base + rawScoreBonus); // base+bonus capped at 25
    summary.baseCoins = base;
    summary.scoreBonus = normal - base;
    coins += normal;

    if (reward.score > prevScore) {
      coins += 15;
      summary.highScoreBonus = 15;
      summary.newHighScore = true;
    }

    // One-time token for each newly earned star (never awarded twice).
    for (let n = prevStars + 1; n <= reward.stars; n++) {
      const key = `${reward.levelId}:${n}`;
      if (!next.starRewarded[key]) {
        next.starRewarded[key] = true;
        tokens += 1;
        summary.newStarTokens += 1;
      }
    }

    // Perfect clear: 20% chance of a treasure chest (20-50 coins), granted
    // and stored now so refreshing can't re-claim it.
    if (reward.stars >= maxStars && rng() < 0.2) {
      const t = 20 + Math.floor(rng() * 31);
      coins += t;
      summary.treasureCoins = t;
    }
  }

  // New-star tokens can also occur when a first-clear is below max, then a
  // later replay improves stars — handled above via the replay branch.

  next.coins += coins;
  next.rescueTokens += tokens;
  summary.totalCoins = coins;
  summary.totalTokens = tokens;

  // Unlock next level.
  if (reward.levelId >= next.unlockedLevel && reward.levelId < LEVEL_COUNT) {
    next.unlockedLevel = reward.levelId + 1;
  }
  return { next, summary };
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
