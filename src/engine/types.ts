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
  /** Optional special flag, e.g. rescue level. */
  rescue?: boolean;
}

export type GamePhase = 'ready' | 'playing' | 'paused' | 'won' | 'lost';

export type LossReason = 'overflow' | 'ammo';

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
  elapsedMs: number;
  closeCall: boolean; // pens nearly full
  lossReason: LossReason | null;
}
