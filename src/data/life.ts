// The living Sanctuary — ambient behaviours, a day cycle, relationships, Heart
// Moments, and one personal quest per pig. Pure data + save-aware read helpers;
// no React, no mutation (claiming lives in save.ts). Everything derives from the
// existing roster, rescue data, mastery baselines, and progression so nothing
// is duplicated or needs its own tracking beyond claim/viewed flags.

import { CHARACTERS, PIG_BY_ID } from './sanctuary';
import { clearedLevelsCount } from './book';
import { sanctuaryTier } from './story';
import type { SaveData } from '../save/save';

// ---- Day cycle ------------------------------------------------------------
export type SanctuaryPeriod = 'morning' | 'afternoon' | 'evening' | 'celebration';

export interface PeriodInfo {
  id: SanctuaryPeriod;
  label: string;
  icon: string;
  /** Themes surfaced this period (used to pick ambient behaviours). */
  themes: string[];
}

export const PERIODS: Record<SanctuaryPeriod, PeriodInfo> = {
  morning: { id: 'morning', label: 'Morning', icon: '🌅', themes: ['bake', 'garden', 'teach', 'farm'] },
  afternoon: { id: 'afternoon', label: 'Afternoon', icon: '☀️', themes: ['build', 'explore', 'deliver', 'play'] },
  evening: { id: 'evening', label: 'Evening', icon: '🌙', themes: ['story', 'music', 'family', 'fireflies'] },
  celebration: { id: 'celebration', label: 'Celebration', icon: '🎉', themes: ['cheer', 'dance', 'feast', 'glow'] },
};

export const PERIOD_ORDER: SanctuaryPeriod[] = ['morning', 'afternoon', 'evening', 'celebration'];

/** A deterministic starting period for a visit (session-based, no real clock). */
export function startPeriodIndex(save: SaveData): number {
  const freed = CHARACTERS.filter((c) => save.freedPigs[c.id]).length;
  return freed % PERIOD_ORDER.length;
}

// ---- Ambient behaviours (≥2 per pig) --------------------------------------
export interface Activity {
  icon: string;
  label: string;
  /** Periods this behaviour prefers; empty = any period. */
  themes?: string[];
}

const A = (icon: string, label: string, themes?: string[]): Activity => ({ icon, label, themes });

/** At least two lightweight ambient behaviours for every pig, by role/personality. */
export const PIG_ACTIVITIES: Record<string, Activity[]> = {
  biscuit: [A('🍞', 'carries bread to the firepit', ['bake']), A('🥐', 'leaves a biscuit for a new pig'), A('💛', 'glances at Pip’s necklace')],
  rosie: [A('💧', 'waters the flowers', ['garden']), A('🌸', 'smells a new bloom'), A('🌷', 'gives Pebbles a flower')],
  sunny: [A('🎵', 'sings by the Heart Tree', ['music']), A('📣', 'leads the group cheer', ['cheer']), A('☀️', 'wakes the sleepy pigs', ['morning'])],
  minty: [A('🌿', 'collects fresh herbs', ['garden']), A('🍵', 'leaves tea for Clover'), A('💚', 'checks on a tired pig')],
  splash: [A('💦', 'jumps in the water', ['play']), A('🐟', 'follows the stream', ['explore']), A('😆', 'shakes off near a friend')],
  pebbles: [A('🪨', 'collects a shiny stone', ['build']), A('🗼', 'builds a tiny tower'), A('✨', 'shows Rosie a new stone')],
  grapey: [A('🎨', 'paints the mural wall'), A('🖌️', 'tweaks a small detail')],
  doodle: [A('😂', 'slips in the mud', ['play']), A('🎭', 'strikes a silly pose'), A('🤣', 'makes a pig laugh')],
  waffles: [A('🧇', 'works beside Biscuit', ['bake']), A('🔔', 'rings the breakfast bell', ['morning']), A('🍳', 'carries a breakfast tray')],
  marsh: [A('☁️', 'naps under the Heart Tree', ['story']), A('💭', 'watches the clouds'), A('😴', 'mutters a dream line')],
  pippa: [A('🔧', 'repairs a little machine', ['build']), A('💡', 'tests an invention'), A('💨', 'makes a funny puff of smoke')],
  cocoa: [A('📖', 'reads to the piglets', ['teach']), A('🔤', 'writes on the chalkboard'), A('💬', 'offers an encouraging word')],
  berry: [A('🍓', 'picks ripe fruit', ['farm']), A('🧺', 'fills a basket'), A('🤝', 'shares fruit with a friend')],
  clover: [A('📜', 'tells a fireside story', ['story']), A('🌳', 'studies the Heart Tree'), A('👑', 'speaks with the King')],
  jade: [A('🗺️', 'studies a map', ['explore']), A('🔭', 'peers through a telescope'), A('📍', 'marks a route by the bridge')],
  ziggy: [A('✉️', 'delivers a letter', ['deliver']), A('⚡', 'dashes between homes', ['afternoon']), A('💫', 'trips, then keeps going')],
  nugget: [A('🛡️', 'patrols with a shield'), A('🦸', 'practices a heroic pose'), A('🫂', 'stands by a frightened new pig')],
  aurora: [A('🌈', 'weaves ribbons of light', ['glow']), A('🎗️', 'decorates the Heart Tree'), A('✨', 'watches the fireflies', ['fireflies'])],
  comet: [A('☄️', 'runs a nighttime route', ['evening']), A('🏁', 'races Ziggy for fun', ['play']), A('🌉', 'rests by the bridge')],
  king: [A('👑', 'welcomes a new pig'), A('🗣️', 'speaks with Clover'), A('🏰', 'watches the rebuilding')],
  honey: [A('🍯', 'bakes golden pastries', ['bake']), A('🎁', 'delivers a special treat'), A('✨', 'adds a golden sparkle')],
  ruby: [A('💎', 'guards the Heart Tree'), A('🎯', 'trains Nugget'), A('🛡️', 'patrols the celebration', ['celebration'])],
};

/**
 * Pick up to `cap` (pig, activity) pairs to animate this tick, favouring the
 * current period's themes and rotating through the herd so no more than `cap`
 * behaviours run at once (performance cap).
 */
export function pickAmbient(
  freedIds: string[],
  period: SanctuaryPeriod,
  tick: number,
  cap = 4,
): Array<{ pigId: string; activity: Activity }> {
  const themes = PERIODS[period].themes;
  const pool: Array<{ pigId: string; activity: Activity }> = [];
  for (const pigId of freedIds) {
    const acts = PIG_ACTIVITIES[pigId];
    if (!acts) continue;
    // Prefer an on-theme behaviour; fall back to any.
    const themed = acts.filter((a) => a.themes?.some((t) => themes.includes(t)));
    const choose = (themed.length ? themed : acts)[tick % (themed.length || acts.length)];
    pool.push({ pigId, activity: choose });
  }
  if (pool.length <= cap) return pool;
  const start = (tick * cap) % pool.length;
  const out: Array<{ pigId: string; activity: Activity }> = [];
  for (let i = 0; i < cap; i++) out.push(pool[(start + i) % pool.length]);
  return out;
}

// ---- Relationships --------------------------------------------------------
export type RelationType = 'family' | 'friends' | 'mentor' | 'partners' | 'rivals' | 'royal';

export interface Relationship {
  a: string;
  b: string;
  type: RelationType;
  /** The small visible interaction this pair shares. */
  interaction: string;
  line?: string;
}

export const REL_LABEL: Record<RelationType, string> = {
  family: 'Family',
  friends: 'Best friends',
  mentor: 'Mentor & student',
  partners: 'Working partners',
  rivals: 'Friendly rivals',
  royal: 'Royal allies',
};

export const RELATIONSHIPS: Relationship[] = [
  // Family (3)
  { a: 'rosie', b: 'pebbles', type: 'family', interaction: 'share a flower', line: 'Big sister always knows best.' },
  { a: 'biscuit', b: 'honey', type: 'family', interaction: 'bake together', line: 'Two bakers, one family.' },
  { a: 'aurora', b: 'comet', type: 'family', interaction: 'watch the night sky' },
  // Best friends (4)
  { a: 'sunny', b: 'doodle', type: 'friends', interaction: 'laugh together' },
  { a: 'splash', b: 'ziggy', type: 'friends', interaction: 'race to the stream' },
  { a: 'minty', b: 'cocoa', type: 'friends', interaction: 'sit and chat' },
  { a: 'grapey', b: 'marsh', type: 'friends', interaction: 'daydream together' },
  // Mentor & student (2)
  { a: 'clover', b: 'cocoa', type: 'mentor', interaction: 'read together', line: 'Every story is a lesson.' },
  { a: 'ruby', b: 'nugget', type: 'mentor', interaction: 'train together', line: 'Courage is not measured by size.' },
  // Working partners (2)
  { a: 'biscuit', b: 'waffles', type: 'partners', interaction: 'run the bakery', line: 'It smells like home again.' },
  { a: 'jade', b: 'pippa', type: 'partners', interaction: 'build a gadget' },
  // Friendly rivals (1)
  { a: 'ziggy', b: 'comet', type: 'rivals', interaction: 'race each other', line: 'Best two out of three!' },
  // Royal alliance (1)
  { a: 'king', b: 'ruby', type: 'royal', interaction: 'stand watch together', line: 'For the herd, always.' },
];

export function relationshipsFor(pigId: string): Relationship[] {
  return RELATIONSHIPS.filter((r) => r.a === pigId || r.b === pigId);
}

/** Relationship pairs where BOTH pigs are rescued (interactions can play). */
export function activeRelationships(save: SaveData): Relationship[] {
  return RELATIONSHIPS.filter((r) => save.freedPigs[r.a] && save.freedPigs[r.b]);
}

// ---- Heart Moments (≥12) --------------------------------------------------
export interface HeartMoment {
  id: string;
  title: string;
  pigs: string[]; // required rescued pigs
  line?: string;
}

export const HEART_MOMENTS: HeartMoment[] = [
  { id: 'biscuit_waffles', title: 'The Bakery Reopens', pigs: ['biscuit', 'waffles'], line: 'It smells like home again.' },
  { id: 'rosie_pebbles', title: 'A Heart-Shaped Stone', pigs: ['rosie', 'pebbles'], line: 'I saved the prettiest one for you.' },
  { id: 'clover_king', title: 'Yesterday & Tomorrow', pigs: ['clover', 'king'], line: 'We cannot rebuild yesterday — but we can protect tomorrow.' },
  { id: 'ruby_nugget', title: 'The Little Guardian', pigs: ['ruby', 'nugget'], line: 'Courage is not measured by size.' },
  { id: 'marsh_doodle', title: 'Nap Time', pigs: ['marsh', 'doodle'] },
  { id: 'jade_honey', title: 'The Trail’s End', pigs: ['jade', 'honey'], line: 'I told you I would find the way.' },
  { id: 'sunny_dawn', title: 'Song at Dawn', pigs: ['sunny'], line: 'The whole herd wakes to a morning song.' },
  { id: 'minty_clover', title: 'A Cup of Rest', pigs: ['minty', 'clover'], line: 'Rest now — you’ve carried us long enough.' },
  { id: 'ziggy_comet', title: 'Moonlight Race', pigs: ['ziggy', 'comet'], line: 'A dead heat — and a laugh in the dark.' },
  { id: 'pippa_jade', title: 'True North', pigs: ['pippa', 'jade'], line: 'It points true at last!' },
  { id: 'cocoa_class', title: 'Story Time', pigs: ['cocoa'], line: 'The little ones learn the old songs again.' },
  { id: 'aurora_tree', title: 'Ribbons of Light', pigs: ['aurora'], line: 'The Heart Tree glows a little brighter tonight.' },
  { id: 'berry_rosie', title: 'The First Harvest', pigs: ['berry', 'rosie'], line: 'The first fruit of a healed field, shared.' },
  { id: 'king_legendary', title: 'A King Among the Herd', pigs: ['king', 'clover', 'ruby'], line: 'A kingdom is its families — and they are home.' },
];

export const HEART_MOMENT_BY_ID: Record<string, HeartMoment> = Object.fromEntries(
  HEART_MOMENTS.map((m) => [m.id, m]),
);

/** Heart Moments whose required pigs are all rescued. */
export function eligibleHeartMoments(save: SaveData): HeartMoment[] {
  return HEART_MOMENTS.filter((m) => m.pigs.every((id) => save.freedPigs[id]));
}

/** The next unviewed, eligible Heart Moment (or null). */
export function nextHeartMoment(save: SaveData, skipIds: Set<string>): HeartMoment | null {
  return (
    eligibleHeartMoments(save).find((m) => !save.life?.heartMoments?.[m.id] && !skipIds.has(m.id)) ?? null
  );
}

// ---- Personal quests (one per pig) ---------------------------------------
export type QuestKind =
  | 'clearAfterRescue'
  | 'levelsCleared'
  | 'totalStars'
  | 'coins'
  | 'worldChests'
  | 'sanctuaryTier'
  | 'freedPigs'
  | 'heartMoment';

export interface QuestReward {
  coins?: number;
  tokens?: number;
  cosmetic?: string;
  decoration?: string;
  storyLine?: string;
}

export interface Quest {
  id: string;
  pigId: string;
  name: string;
  desc: string; // short objective
  request: string; // speech-bubble line
  kind: QuestKind;
  target: number | string;
  reward: QuestReward;
}

const Q = (
  pigId: string,
  name: string,
  desc: string,
  request: string,
  kind: QuestKind,
  target: number | string,
  reward: QuestReward,
): Quest => ({ id: `q_${pigId}`, pigId, name, desc, request, kind, target, reward });

export const QUESTS: Quest[] = [
  Q('biscuit', 'A Warm Welcome', 'Clear 3 levels after rescuing Biscuit.', 'The bakery could use a little help.', 'clearAfterRescue', 3, { coins: 30, cosmetic: 'Bakery sign', storyLine: 'Biscuit hangs a hand-painted sign: “Everyone eats today.”' }),
  Q('rosie', 'Let It Bloom', 'Earn 15 total stars.', 'Could you help the garden grow?', 'totalStars', 15, { coins: 25, cosmetic: 'Flower crown', storyLine: 'Rosie weaves a crown of the first blooms.' }),
  Q('sunny', 'Morning Chorus', 'Clear 4 levels.', 'Let’s wake the herd with a song!', 'levelsCleared', 4, { coins: 20, cosmetic: 'Song note', storyLine: 'Sunny’s tune drifts across a brighter meadow.' }),
  Q('minty', 'Healing Hands', 'Earn 20 total stars.', 'Some pigs are tired — I could brew tea.', 'totalStars', 20, { coins: 25, cosmetic: 'Herb pouch', storyLine: 'Minty’s herbs mend more than scrapes.' }),
  Q('splash', 'Downstream', 'Clear 6 levels.', 'Race me to the water?', 'levelsCleared', 6, { coins: 20, cosmetic: 'Splash goggles', storyLine: 'Splash maps every secret crossing at last.' }),
  Q('pebbles', 'Tower of Stones', 'Clear 3 levels after rescuing Pebbles.', 'I found the perfect stone!', 'clearAfterRescue', 3, { coins: 20, cosmetic: 'Stone tower', storyLine: 'Pebbles’ little tower stands proud in the garden.' }),
  Q('grapey', 'Wall of Memories', 'Earn 25 total stars.', 'I’m painting the whole herd.', 'totalStars', 25, { coins: 25, cosmetic: 'Paint set', storyLine: 'Grapey’s mural now holds every rescued face.' }),
  Q('doodle', 'Comic Relief', 'See the “Nap Time” Heart Moment.', 'Wanna hear a good one?', 'heartMoment', 'marsh_doodle', { coins: 20, cosmetic: 'Jester hat', storyLine: 'Doodle takes a bow — nap successful.' }),
  Q('waffles', 'Breakfast Rush', 'Clear 4 levels after rescuing Waffles.', 'Is it breakfast time yet?', 'clearAfterRescue', 4, { coins: 30, cosmetic: 'Breakfast bell', storyLine: 'The breakfast bell rings across the Sanctuary.' }),
  Q('cocoa', 'Class in Session', 'Rescue 12 piggies.', 'The little ones want to learn.', 'freedPigs', 12, { coins: 30, cosmetic: 'Chalkboard', storyLine: 'Cocoa’s school fills with eager piglets.' }),
  Q('ziggy', 'Special Delivery', 'Clear 10 levels.', 'I’ve got letters to run!', 'levelsCleared', 10, { coins: 25, cosmetic: 'Courier bag', storyLine: 'No message is ever late again.' }),
  Q('marsh', 'Sweet Dreams', 'See the “Nap Time” Heart Moment.', 'I dreamed something lovely…', 'heartMoment', 'marsh_doodle', { coins: 20, cosmetic: 'Dream cloud', storyLine: 'Marshmallow dreams the kingdom whole.' }),
  Q('pippa', 'Bright Idea', 'Open a world reward chest.', 'My machine is almost ready!', 'worldChests', 1, { coins: 30, cosmetic: 'Wrench badge', storyLine: 'Pippa’s contraption hums to life.' }),
  Q('berry', 'First Harvest', 'See the “First Harvest” Heart Moment.', 'The orchard is nearly ready.', 'heartMoment', 'berry_rosie', { coins: 25, cosmetic: 'Fruit basket', storyLine: 'Berry’s basket overflows — enough for everyone.' }),
  Q('clover', 'Memories of Home', 'Reach Sanctuary Tier 3.', 'Let’s visit the Heart Tree.', 'sanctuaryTier', 3, { coins: 30, cosmetic: 'Memory lantern', storyLine: 'Clover lights a lantern for every pig brought home.' }),
  Q('jade', 'The Hidden Trail', 'Open a world reward chest.', 'This map leads somewhere new…', 'worldChests', 1, { coins: 25, tokens: 1, cosmetic: 'Explorer scarf', storyLine: 'Jade charts a trail toward the next lost friend.' }),
  Q('nugget', 'Standing Guard', 'Clear 5 levels after rescuing Nugget.', 'No one gets past me!', 'clearAfterRescue', 5, { coins: 25, cosmetic: 'Guardian badge', storyLine: 'Nugget earns a badge as tall as their courage.' }),
  Q('aurora', 'Ribbons of Light', 'Reach Sanctuary Tier 4.', 'The Heart Tree needs a little shine.', 'sanctuaryTier', 4, { coins: 30, cosmetic: 'Light ribbon', storyLine: 'Aurora drapes the Heart Tree in living light.' }),
  Q('comet', 'Night Run', 'Clear 20 levels.', 'One more lap before dawn?', 'levelsCleared', 20, { coins: 30, cosmetic: 'Comet trail', storyLine: 'Comet’s route keeps the whole herd safe by night.' }),
  Q('honey', 'Golden Batch', 'Rescue 18 piggies.', 'A treat for everyone is coming!', 'freedPigs', 18, { coins: 40, tokens: 1, cosmetic: 'Golden whisk', storyLine: 'Honey’s golden batch lights up the festival.' }),
  Q('ruby', 'The Royal Watch', 'Reach Sanctuary Tier 4.', 'The Heart Tree must be guarded.', 'sanctuaryTier', 4, { coins: 30, tokens: 1, cosmetic: 'Ruby crest', storyLine: 'Ruby stands an unbroken watch once more.' }),
  Q('king', 'A King Among the Herd', 'Reach the final Sanctuary Tier.', 'Let us see the kingdom whole.', 'sanctuaryTier', 5, { coins: 50, tokens: 1, cosmetic: 'Royal banner', storyLine: 'The King raises a banner over a kingdom reborn.' }),
];

export const QUEST_BY_PIG: Record<string, Quest> = Object.fromEntries(QUESTS.map((q) => [q.pigId, q]));

export interface QuestStatus {
  done: number;
  need: number;
  complete: boolean;
  claimed: boolean;
}

function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((s, l) => s + (l?.stars ?? 0), 0);
}
function freedCount(save: SaveData): number {
  return CHARACTERS.filter((c) => save.freedPigs[c.id]).length;
}

/** Live progress for a quest, derived from existing save data (no extra tracking). */
export function questStatus(save: SaveData, quest: Quest): QuestStatus {
  const claimed = !!save.life?.quests?.[quest.id];
  let done = 0;
  let need = typeof quest.target === 'number' ? quest.target : 1;
  switch (quest.kind) {
    case 'clearAfterRescue': {
      const base = save.book?.rescueBaseline?.[quest.pigId]?.cleared ?? 0;
      done = Math.max(0, clearedLevelsCount(save) - base);
      break;
    }
    case 'levelsCleared':
      done = clearedLevelsCount(save);
      break;
    case 'totalStars':
      done = totalStars(save);
      break;
    case 'coins':
      done = save.coins;
      break;
    case 'worldChests':
      done = Object.values(save.worldChests).filter(Boolean).length;
      break;
    case 'sanctuaryTier':
      done = sanctuaryTier(freedCount(save)).n;
      break;
    case 'freedPigs':
      done = freedCount(save);
      break;
    case 'heartMoment':
      need = 1;
      done = save.life?.heartMoments?.[quest.target as string] ? 1 : 0;
      break;
  }
  return { done: Math.min(done, need), need, complete: done >= need, claimed };
}

/** True once a pig is rescued (its quest becomes active). */
export function questActive(save: SaveData, quest: Quest): boolean {
  return !!save.freedPigs[quest.pigId];
}

/** The single Sanctuary request to surface now: a rescued pig with an unclaimed,
 *  completable (or in-progress) quest. At most one, chosen deterministically. */
export function currentRequest(save: SaveData): Quest | null {
  const candidates = QUESTS.filter((q) => questActive(save, q) && !save.life?.quests?.[q.id]);
  if (candidates.length === 0) return null;
  // Prefer a quest that's ready to claim; otherwise rotate by freed count.
  const ready = candidates.filter((q) => questStatus(save, q).complete);
  const pool = ready.length ? ready : candidates;
  return pool[freedCount(save) % pool.length];
}

export function pigById(id: string) {
  return PIG_BY_ID[id];
}
