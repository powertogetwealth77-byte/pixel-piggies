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
    power: 'Line Blast',
    blurb: 'Clears an entire lane in one charge.',
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
