// Piggy Book logic — pure, save-aware helpers. No React, no mutation.
// Everything here derives collection state from the roster + the save's book
// data so components never re-implement the rules.

import { CHARACTERS, PIG_BY_ID, RARITY_ORDER, type PigCharacter, type Rarity } from './sanctuary';
import type { SaveData } from '../save/save';

export type PigState = 'hidden' | 'discovered' | 'rescued';

/** How many unfreed pigs (cheapest first) are always shown as "discovered". */
const UPCOMING_WINDOW = 2;

/** Canonical spend-cost of a pig for ordering (coin pigs before token pigs). */
function costOf(p: PigCharacter): number {
  return p.cost.coins ?? (p.cost.tokens ?? 0) * 100 + 100000;
}

/** The cheapest still-caged pigs, always visible as upcoming targets. */
function upcomingIds(save: SaveData): Set<string> {
  const caged = CHARACTERS.filter((p) => !save.freedPigs[p.id]).sort((a, b) => costOf(a) - costOf(b));
  return new Set(caged.slice(0, UPCOMING_WINDOW).map((p) => p.id));
}

export function pigState(save: SaveData, id: string): PigState {
  if (save.freedPigs[id]) return 'rescued';
  if (save.book?.discovered?.[id]) return 'discovered';
  if (upcomingIds(save).has(id)) return 'discovered';
  return 'hidden';
}

export function clearedLevelsCount(save: SaveData): number {
  return Object.values(save.levels).filter((l) => l?.cleared).length;
}

export interface CollectionStats {
  total: number;
  rescued: number;
  discovered: number; // discovered-but-not-rescued
  hidden: number;
  pct: number; // percent rescued
  byRarity: Record<Rarity, { rescued: number; total: number }>;
  byRole: Array<{ role: string; rescued: number; total: number }>;
}

export function collectionStats(save: SaveData): CollectionStats {
  const byRarity = {} as CollectionStats['byRarity'];
  for (const r of RARITY_ORDER) byRarity[r] = { rescued: 0, total: 0 };
  const roles = new Map<string, { rescued: number; total: number }>();
  let rescued = 0;
  let discovered = 0;
  let hidden = 0;
  for (const c of CHARACTERS) {
    const st = pigState(save, c.id);
    byRarity[c.rarity].total += 1;
    if (!roles.has(c.role)) roles.set(c.role, { rescued: 0, total: 0 });
    const rr = roles.get(c.role)!;
    rr.total += 1;
    if (st === 'rescued') { rescued += 1; byRarity[c.rarity].rescued += 1; rr.rescued += 1; }
    else if (st === 'discovered') discovered += 1;
    else hidden += 1;
  }
  const total = CHARACTERS.length;
  return {
    total,
    rescued,
    discovered,
    hidden,
    pct: Math.round((rescued / total) * 100),
    byRarity,
    byRole: [...roles.entries()].map(([role, v]) => ({ role, ...v })),
  };
}

// ---- Cosmetic mastery -----------------------------------------------------
// Three levels: 1 Rescued (base), 2 Settled In, 3 Kingdom Hero. Eligibility is
// measured from a per-pig baseline snapshot taken at rescue, so progress after
// rescuing them is what counts — no per-frame timers.

export interface MasteryReward {
  accessory?: string;
  cosmetic?: string;
  line: string;
  coins?: number;
  tokens?: number;
}

/** Highest mastery level a rescued pig currently qualifies for (1–3). */
export function masteryEligible(save: SaveData, id: string): number {
  if (!save.freedPigs[id]) return 0;
  const base = save.book?.rescueBaseline?.[id] ?? { cleared: 0, freed: 0 };
  const dc = clearedLevelsCount(save) - base.cleared;
  if (dc >= 8) return 3;
  if (dc >= 3) return 2;
  return 1;
}

/** The mastery level whose reward the player has already claimed (>=1 once rescued). */
export function masteryClaimedLevel(save: SaveData, id: string): number {
  if (!save.freedPigs[id]) return 0;
  return save.book?.mastery?.[id] ?? 1;
}

/** Human-readable condition text for the next mastery level. */
export function masteryConditionText(level: number): string {
  if (level === 2) return 'Clear 3 more levels after rescuing them.';
  if (level === 3) return 'Clear 8 levels after rescuing them.';
  return 'Rescued.';
}

/** The reward granted at a mastery level for a given pig. */
export function masteryReward(pig: PigCharacter, level: number): MasteryReward {
  if (level === 2) {
    return { accessory: pig.accessory, line: pig.idleLine, };
  }
  if (level === 3) {
    const rank = RARITY_ORDER.indexOf(pig.rarity);
    return {
      cosmetic: '👑',
      line: `${pig.name} is now a Kingdom Hero!`,
      coins: 20 + rank * 10,
      tokens: rank >= 4 ? 1 : 0, // legendary/golden give a token
    };
  }
  return { line: `${pig.name} joins the Sanctuary.` };
}

/** Convenience: the character for an id (throws-safe lookup). */
export function pigById(id: string): PigCharacter | undefined {
  return PIG_BY_ID[id];
}
