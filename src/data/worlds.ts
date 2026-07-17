import { LEVELS } from './levels';
import type { SaveData } from '../save/save';

/** The five themed worlds, six campaign levels each. */
export interface WorldDef {
  index: number;
  name: string;
  subtitle: string;
  first: number; // first level id
  last: number; // last level id (inclusive)
  chest: { coins: number; tokens: number };
  theme: 'meadow' | 'midnight' | 'kingdom' | 'elements' | 'wolf';
}

export const WORLDS: WorldDef[] = [
  { index: 0, name: 'Sunny Snout Meadows', subtitle: 'Where every piggy adventure begins.', first: 1, last: 6, chest: { coins: 150, tokens: 1 }, theme: 'meadow' },
  { index: 1, name: 'Midnight Munchies', subtitle: 'Snacks and secrets after dark.', first: 7, last: 12, chest: { coins: 225, tokens: 1 }, theme: 'midnight' },
  { index: 2, name: 'Wild Piggy Kingdom', subtitle: 'Rescue the royal snouts.', first: 13, last: 18, chest: { coins: 300, tokens: 2 }, theme: 'kingdom' },
  { index: 3, name: 'Elements of Oink', subtitle: 'Fire, frost, storm and stone.', first: 19, last: 24, chest: { coins: 400, tokens: 2 }, theme: 'elements' },
  { index: 4, name: "The Wolf's Final Howl", subtitle: 'One last stand for the herd.', first: 25, last: 30, chest: { coins: 600, tokens: 3 }, theme: 'wolf' },
];

export const WORLD_OF = (levelId: number): WorldDef | undefined =>
  WORLDS.find((w) => levelId >= w.first && levelId <= w.last);

export interface WorldStats {
  cleared: number; // levels cleared in this world (0..6)
  total: number; // 6
  stars: number; // total stars earned in this world
  maxStars: number; // 18 (6 levels * 3)
  perfected: number; // levels with 3 stars
  complete: boolean; // all 6 cleared
  chestClaimed: boolean;
  chestReady: boolean; // complete and not yet claimed
}

export function worldStats(save: SaveData, world: WorldDef): WorldStats {
  let cleared = 0;
  let stars = 0;
  let perfected = 0;
  for (let id = world.first; id <= world.last; id++) {
    const p = save.levels[id];
    if (p?.cleared) cleared += 1;
    stars += p?.stars ?? 0;
    if ((p?.stars ?? 0) >= 3) perfected += 1;
  }
  const complete = cleared === world.last - world.first + 1;
  const chestClaimed = !!save.worldChests[world.index];
  return {
    cleared,
    total: world.last - world.first + 1,
    stars,
    maxStars: (world.last - world.first + 1) * 3,
    perfected,
    complete,
    chestClaimed,
    chestReady: complete && !chestClaimed,
  };
}

export const LEVEL_TITLE = (levelId: number): string =>
  LEVELS.find((l) => l.id === levelId)?.name ?? `Level ${levelId}`;
