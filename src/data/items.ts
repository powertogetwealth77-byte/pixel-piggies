import type { ItemId } from '../engine/types';

/**
 * Recovery items. Each has a few FREE introductory uses, then a fair coin
 * price. Items only relieve time pressure or recall piggies — they never
 * change the board, queue order, piggy odds, or a level's solvability, so no
 * level ever *requires* an item, a coin, an ad, or a purchase to beat.
 */
export interface ItemDef {
  id: ItemId;
  name: string;
  icon: string;
  /** One-line effect, shown as the in-game preview. */
  effect: string;
  /** Free uses granted to every new player before coins are needed. */
  freeUses: number;
  /** Coin price once the free uses are spent. */
  price: number;
  /** True for the post-loss continue item (offered in the loss dialog). */
  continue?: boolean;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  timeTreat: {
    id: 'timeTreat',
    name: 'Time Treat',
    icon: '🍬',
    effect: 'Pushes the Glitch Tide back by a big chunk.',
    freeUses: 3,
    price: 60,
  },
  piggyWhistle: {
    id: 'piggyWhistle',
    name: 'Piggy Whistle',
    icon: '📣',
    effect: 'Instantly recalls one piggy to an empty pen.',
    freeUses: 3,
    price: 50,
  },
  freezePop: {
    id: 'freezePop',
    name: 'Freeze Pop',
    icon: '🧊',
    effect: 'Freezes the Tide completely for 6 seconds.',
    freeUses: 2,
    price: 80,
  },
  goldenPen: {
    id: 'goldenPen',
    name: 'Golden Pen',
    icon: '🖊️',
    effect: 'Drops in a golden wild piggy that matches any color.',
    freeUses: 2,
    price: 90,
  },
  secondWind: {
    id: 'secondWind',
    name: 'Second Wind',
    icon: '🌬️',
    effect: 'Continue after a Tide loss — win back two strikes.',
    freeUses: 1,
    price: 120,
    continue: true,
  },
};

/** Items shown on the in-level quick bar (Second Wind is loss-dialog only). */
export const IN_LEVEL_ITEMS: ItemId[] = ['timeTreat', 'piggyWhistle', 'freezePop', 'goldenPen'];
export const ITEM_ORDER: ItemId[] = ['timeTreat', 'piggyWhistle', 'freezePop', 'goldenPen', 'secondWind'];
