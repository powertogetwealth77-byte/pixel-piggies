// Core shared types for the Pixel Piggies game engine.

export type ColorId = 'coral' | 'sunny' | 'mint' | 'sky' | 'grape';

export const COLOR_IDS: ColorId[] = ['coral', 'sunny', 'mint', 'sky', 'grape'];

export type PiggyType = 'pip' | 'mochi' | 'blaze' | 'prism';

/** A block sitting on the puzzle board. */
export interface Block {
  id: number;
  color: ColorId;
}

/** A queued or held piggy instance. */
export interface Piggy {
  id: number;
  type: PiggyType;
  color: ColorId;
  ammo: number;
  maxAmmo: number;
}

/** Compact queue definition entry used in level data. */
export interface QueueEntry {
  type: PiggyType;
  color: ColorId;
  ammo?: number;
  /** How many identical piggies to add in sequence. */
  count?: number;
}

/** A single handcrafted level. */
export interface LevelDef {
  id: number;
  name: string;
  /** Short reason-to-continue shown on the level card. */
  tagline: string;
  /** Board rows of block chars: c=coral s=sunny m=mint b=sky g=grape . = empty */
  blocks: string[];
  /** Hidden picture revealed as blocks clear (same width). */
  picture: string[];
  /** The name of the picture revealed on win. */
  pictureName: string;
  /** Number of holding pen slots. */
  pens: number;
  /** Milliseconds between piggy spawns from the queue. */
  spawnMs: number;
  /** Ordered queue of piggies for the level. */
  queue: QueueEntry[];
  /** Score thresholds for 1/2/3 stars. */
  starScores: [number, number, number];
  /** Pigment awarded on first clear. */
  pigment: number;
  /** Which piggy hero is caged in this level (rescue milestone). */
  rescue?: PiggyType;
}

export type GamePhase = 'ready' | 'playing' | 'paused' | 'won' | 'lost';

export type LossReason = 'overflow' | 'ammo' | 'tide';

/** In-level recovery items the player can trigger. */
export type ItemId = 'timeTreat' | 'piggyWhistle' | 'freezePop' | 'goldenPen' | 'secondWind';

/** Transient visual info about the most recent launch, read by the effects layer. */
export interface LaunchResult {
  id: number;
  lane: number;
  cleared: { row: number; col: number; color: ColorId }[];
  comboAfter: number;
  multiplier: number;
  gained: number;
  fizzle: boolean;
  fever: boolean;
  shake: number; // 0..1 intensity
  piggyType: PiggyType;
}

/**
 * A cascade stage that fired automatically after a clear: two (or more)
 * previously separate same-color clusters merged when gravity healed the
 * board, and the merged cluster popped on its own.
 */
export interface ChainEvent {
  id: number;
  /** Cascade stage: 2 for the first auto-pop after a launch, then 3, 4… */
  stage: number;
  cleared: { row: number; col: number; color: ColorId }[];
  gained: number;
  comboAfter: number;
  multiplier: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  level: LevelDef;
  width: number;
  height: number;
  board: (Block | null)[][]; // [row][col], row 0 = top
  revealed: boolean[][]; // which picture cells are revealed
  pens: (Piggy | null)[];
  queue: Piggy[];
  selectedPen: number | null;
  blocksRemaining: number;
  blocksTotal: number;
  score: number;
  combo: number;
  bestCombo: number;
  multiplier: number;
  fever: number; // 0..100 meter
  feverActive: boolean;
  feverMsLeft: number;
  prismUsed: boolean;
  shotsFired: number;
  nextSpawnMs: number;
  lastLaunch: LaunchResult | null;
  lastChain: ChainEvent | null;
  /** True while a cascade stage is scheduled (blocks may still auto-pop). */
  chainPending: boolean;
  elapsedMs: number;
  closeCall: boolean; // pens nearly full
  lossReason: LossReason | null;
  // --- The Glitch Tide ---
  tideEnabled: boolean;
  tide: number; // 0..100 pressure meter
  tideStage: 'calm' | 'building' | 'critical';
  tideFrozen: boolean; // frozen by chain / freeze pop / fever / grace
  strikes: number; // Glitch Strikes taken (3 = loss)
  maxStrikes: number;
  lastStrikeId: number; // increments each strike (UI trigger)
  relaxed: boolean;
  /** Per-pen recharge progress 0..1 (1 = ready / occupied), for recharge rings. */
  penRecharge: number[];
  lastTimeRestored: number; // ms-equivalent restored on the last launch (UI)
}
