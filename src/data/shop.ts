// Piggy Supply Cart — an ethical, cosmetics-first shop *foundation* only.
//
// There is deliberately NO purchase logic here: no billing, no payment SDK, no
// way to spend real money. The products are definitions and the UI is a
// preview, gated by SHOP_LIVE. Nothing a player can do in this build charges
// anything or removes a pig from free play — every pig stays earnable in-game.

/** Real-money billing is OFF. Flip only once a platform billing layer exists. */
export const SHOP_LIVE = false;

/** Show the preview storefront UI (clearly labelled, non-functional). */
export const SHOP_PREVIEW = true;

export interface SupplyProduct {
  id: string;
  name: string;
  blurb: string;
  /** Display-only mock price. No charge is ever made. */
  mockPrice: string;
  /** What's inside — cosmetics / consumables only, never an exclusive pig. */
  contents: string[];
  icon: string;
}

export const SUPPLY_PRODUCTS: SupplyProduct[] = [
  {
    id: 'rescue_keys',
    name: 'Rescue Key Pack',
    blurb: 'Open standard coin cages a little faster.',
    mockPrice: '$1.99',
    contents: ['A handful of Rescue Keys', 'Helps with coin cages only'],
    icon: '🗝️',
  },
  {
    id: 'sanctuary_starter',
    name: 'Sanctuary Starter Pack',
    blurb: 'A warm welcome for a growing Sanctuary.',
    mockPrice: '$2.99',
    contents: ['Coins', '1 Rescue Token', 'Decorative flower patch', 'No exclusive pig'],
    icon: '🌼',
  },
  {
    id: 'builder_pack',
    name: 'Builder Pack',
    blurb: 'For the piggies who rebuild the kingdom.',
    mockPrice: '$3.99',
    contents: ['Coins', 'Sanctuary decoration', 'Builder hat cosmetic'],
    icon: '🔨',
  },
  {
    id: 'celebration_pack',
    name: 'Celebration Pack',
    blurb: 'Make every rescue a little more festive.',
    mockPrice: '$3.99',
    contents: ['Alternate confetti', 'Rescue flourish', 'Heart Tree decoration'],
    icon: '🎉',
  },
  {
    id: 'supporter_pack',
    name: 'Piggy Supporter Pack',
    blurb: 'Say thanks — with zero gameplay advantage.',
    mockPrice: '$4.99',
    contents: ['Supporter badge', 'Golden Sanctuary statue', 'Profile frame', 'No gameplay changes'],
    icon: '💛',
  },
];
