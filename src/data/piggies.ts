import type { PiggyType } from '../engine/types';

export interface PiggyDef {
  type: PiggyType;
  name: string;
  power: string;
  blurb: string;
  /** Accent color used for the piggy body regardless of ammo color. */
  face: string; // emoji-ish expression handled in component
}

export const PIGGIES: Record<PiggyType, PiggyDef> = {
  pip: {
    type: 'pip',
    name: 'Pip',
    power: 'Lane Drill',
    blurb: 'Drills the lane, popping every pixel of his color.',
    face: 'pip',
  },
  mochi: {
    type: 'mochi',
    name: 'Mochi',
    power: 'Area Pop',
    blurb: 'Bursts a 3x3 splash of pixels.',
    face: 'mochi',
  },
  blaze: {
    type: 'blaze',
    name: 'Blaze',
    power: 'Combo Fire',
    blurb: 'Matches color and supercharges the combo.',
    face: 'blaze',
  },
  prism: {
    type: 'prism',
    name: 'Prism',
    power: 'Wildcard',
    blurb: 'Matches ANY color. One dazzling shot per level.',
    face: 'prism',
  },
};

export const PIGGY_ORDER: PiggyType[] = ['pip', 'mochi', 'blaze', 'prism'];

/** Per-hero rescue arc: story beats, avatar color, and one-time reward. */
export interface RescueArc {
  type: PiggyType;
  color: 'coral' | 'sunny' | 'mint' | 'sky' | 'grape';
  caged: string; // where they were trapped
  joins: string; // what they bring to the team
  reward: { coins: number; pigment: number };
}

export const RESCUE_ARCS: Record<PiggyType, RescueArc> = {
  mochi: {
    type: 'mochi',
    color: 'sky',
    caged: 'locked in a pixel cage deep in the grape thicket',
    joins: 'Mochi joins your team and can now help restore the Piggy Kingdom.',
    reward: { coins: 100, pigment: 0 },
  },
  pip: {
    type: 'pip',
    color: 'coral',
    caged: 'stuck behind the bakery pantry wall',
    joins: 'Pip grabs his drill and starts fixing up the Kingdom.',
    reward: { coins: 150, pigment: 0 },
  },
  blaze: {
    type: 'blaze',
    color: 'sunny',
    caged: 'soggy and shivering at the bottom of the old fountain',
    joins: 'Blaze dries off and brings the party back to the meadow.',
    reward: { coins: 0, pigment: 40 },
  },
  prism: {
    type: 'prism',
    color: 'grape',
    caged: 'dazed and lost inside the festival fireworks',
    joins: 'Prism lights up the whole Kingdom with rainbow sparkles.',
    reward: { coins: 0, pigment: 60 },
  },
};
