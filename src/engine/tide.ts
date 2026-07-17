// The Glitch Tide — an urgency system layered on top of the puzzle.
//
// Design invariants (these are what keep every level fair & solver-verified):
//   1. The Tide NEVER touches the board, queue, piggy odds, or level layout.
//      It only affects a cosmetic pressure meter and a strike counter.
//   2. Running out of time issues a Glitch Strike, not a loss. Three strikes
//      end the level, but a strike leaves the board/piggies exactly as they
//      were — so a puzzle that was solvable stays solvable.
//   3. Relaxed Mode disables the Tide entirely (reduced bonus rewards), so the
//      logical solvability of every level can be verified without timing.
//
// All timing flows through GameEngine.tick(dtMs), so tests drive it
// deterministically by calling tick() with fixed deltas.

export type TideStage = 'calm' | 'building' | 'critical';

export const TIDE_MAX = 100;
export const MAX_STRIKES = 3;

/** Stage thresholds on the 0..100 meter. */
export function tideStage(value: number): TideStage {
  if (value >= 75) return 'critical';
  if (value >= 40) return 'building';
  return 'calm';
}

export interface TideConfig {
  /** When false, the Tide never rises (tutorial & Relaxed Mode). */
  enabled: boolean;
  /** Meter points gained per second of inactivity at Calm stage. */
  risePerSec: number;
  /** Extra rise multiplier once in the Critical stage (tension ramp). */
  criticalMultiplier: number;
  /** Meter points restored per cleared block (capped per launch). */
  restorePerClear: number;
  /** Cap on restore from a single launch. */
  restoreCap: number;
  /** A clear this size or larger counts as "large" and pushes the Tide back. */
  bigClearThreshold: number;
  /** Extra points pushed back on a large clear. */
  bigClearPushback: number;
  /** Milliseconds the Tide is frozen after a chain cascade stage. */
  chainFreezeMs: number;
  /** Where the meter resets to after a Glitch Strike. */
  strikeResetLevel: number;
  /** Grace period (ms) with no rise right after a strike. */
  strikeGraceMs: number;
}

const DISABLED: TideConfig = {
  enabled: false,
  risePerSec: 0,
  criticalMultiplier: 1,
  restorePerClear: 0,
  restoreCap: 0,
  bigClearThreshold: 99,
  bigClearPushback: 0,
  chainFreezeMs: 0,
  strikeResetLevel: 0,
  strikeGraceMs: 0,
};

/** Shared restore/freeze feel; only the rise rate escalates by tier. */
function tier(risePerSec: number): TideConfig {
  return {
    enabled: true,
    risePerSec,
    criticalMultiplier: 1.25,
    restorePerClear: 3,
    restoreCap: 30,
    bigClearThreshold: 6,
    bigClearPushback: 15,
    chainFreezeMs: 1200,
    strikeResetLevel: 35,
    strikeGraceMs: 900,
  };
}

// Difficulty tiers. Numbers chosen so an *active* player easily outpaces the
// rise (a single 5-block match restores ~15 pts ≈ several seconds of drift),
// while idling drifts to a strike in the seconds below:
//   early ≈ 45s idle-to-strike · mid ≈ 32s · late ≈ 24s
const EARLY = tier(100 / 45);
const MID = tier(100 / 32);
const LATE = tier(100 / 24);

/**
 * Resolve the Tide configuration for a level.
 * - Relaxed Mode → always disabled.
 * - Level 1 (tutorial) → disabled (no pressure while learning).
 * - Daily board (id 1000) → mid tier.
 * - Campaign → escalating tiers by level number.
 */
export function tideConfigFor(levelId: number, relaxed: boolean): TideConfig {
  if (relaxed) return DISABLED;
  if (levelId === 1) return DISABLED;
  if (levelId === 1000) return MID;
  if (levelId <= 4) return EARLY;
  if (levelId <= 10) return MID;
  return LATE;
}

export { DISABLED as TIDE_DISABLED };
