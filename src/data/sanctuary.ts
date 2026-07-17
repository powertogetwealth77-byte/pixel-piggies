import type { ColorId, PiggyType } from '../engine/types';

/**
 * The Rescue Sanctuary roster — captive piggies you set free by spending the
 * coins and Rescue Tokens you earn from playing. It's the long-tail heart of
 * the game: there's always another piggy waiting, so every coin has a purpose.
 *
 * Most piggies are freed with coins; the rarer "golden" piggies cost Rescue
 * Tokens (earned by clearing levels well and doing the daily), so both
 * currencies matter. Costs escalate gently so a next piggy is always in reach.
 */
export interface CaptivePig {
  id: string;
  name: string;
  type: PiggyType;
  color: ColorId;
  blurb: string;
  cost: { coins?: number; tokens?: number };
}

const P = (
  id: string,
  name: string,
  type: PiggyType,
  color: ColorId,
  blurb: string,
  coins?: number,
  tokens?: number,
): CaptivePig => ({ id, name, type, color, blurb, cost: tokens ? { tokens } : { coins } });

export const SANCTUARY: CaptivePig[] = [
  P('rosie', 'Rosie', 'mochi', 'coral', 'A shy piggy who loves belly rubs.', 120),
  P('sunny', 'Sunny', 'blaze', 'sunny', 'Always the first to smile.', 160),
  P('minty', 'Minty', 'mochi', 'mint', 'Smells faintly of fresh grass.', 200),
  P('splash', 'Splash', 'pip', 'sky', 'Never met a puddle she didn’t like.', 260),
  P('grapey', 'Grapey', 'blaze', 'grape', 'Dreams in shades of purple.', 320),
  P('pebbles', 'Pebbles', 'pip', 'coral', 'Collects shiny little stones.', 400),
  P('biscuit', 'Biscuit', 'mochi', 'sunny', 'Warm, round, and golden.', 480),
  P('doodle', 'Doodle', 'blaze', 'sky', 'Draws in the mud with her snout.', 580),
  P('waffles', 'Waffles', 'pip', 'mint', 'Breakfast is her favorite time.', 700),
  P('cocoa', 'Cocoa', 'mochi', 'grape', 'Cozy as a winter morning.', 840),
  P('ziggy', 'Ziggy', 'blaze', 'coral', 'Zooms everywhere at full speed.', 1000),
  P('marsh', 'Marshmallow', 'mochi', 'sky', 'The softest piggy in the pen.', 1200),
  P('pippa', 'Pippa', 'pip', 'sunny', 'Tiny but mighty.', 1450),
  P('berry', 'Berry', 'blaze', 'mint', 'Stains everything she touches.', 1750),
  P('nugget', 'Nugget', 'mochi', 'coral', 'Small, precious, priceless.', 2100),
  P('clover', 'Clover', 'pip', 'grape', 'Lucky through and through.', 2500),
  // Golden piggies — freed with Rescue Tokens.
  P('aurora', 'Aurora', 'prism', 'grape', 'Shimmers with rainbow light.', undefined, 6),
  P('comet', 'Comet', 'prism', 'sky', 'Streaks across the night sky.', undefined, 9),
  P('honey', 'Honey', 'prism', 'sunny', 'Sweet enough to glow.', undefined, 12),
  P('ruby', 'Ruby', 'prism', 'coral', 'A jewel of a piggy.', undefined, 16),
  P('jade', 'Jade', 'prism', 'mint', 'Calm, wise, and green.', undefined, 20),
  P('king', 'King Oinkter', 'prism', 'grape', 'The legendary lost royal piggy.', undefined, 30),
];

export const SANCTUARY_COUNT = SANCTUARY.length;
