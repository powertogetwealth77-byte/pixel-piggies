// Story layer for "Piggy Kingdom: The Last Oink".
//
// Pure data — no runtime dependencies on the engine or save. The narrative is
// delivered in tiny beats: a one-time opening cinematic, a chapter framing over
// the five worlds, and Sanctuary restoration lines that grow as pigs come home.
// All original writing; every string here is safe to display and persist.

/** One panel of the opening cinematic. Emoji + gradient only — no image gen. */
export interface StoryPanel {
  /** A large emblem shown above the text (emoji, kept lightweight). */
  emblem: string;
  /** Background gradient class suffix: .cine--{bg}. */
  bg: 'dawn' | 'festival' | 'red' | 'ash' | 'root' | 'hope';
  /** One or two short lines of narration. */
  lines: string[];
}

/**
 * The opening cinematic: the fall of Piggy Kingdom and the birth of Pip's
 * quest. Short, skippable, shown once (replayable from the menu).
 */
export const INTRO_PANELS: StoryPanel[] = [
  {
    emblem: '🌅',
    bg: 'dawn',
    lines: ['Beyond the human houses, past the Whispering Woods,', 'stood a hidden kingdom where piggies lived in peace.'],
  },
  {
    emblem: '🌳',
    bg: 'festival',
    lines: ['At its center grew the Great Heart Tree.', 'Its golden light connected every piggy heart.'],
  },
  {
    emblem: '🏮',
    bg: 'festival',
    lines: ['On the night of the Festival of a Thousand Lanterns,', 'every bell in the kingdom suddenly went silent.'],
  },
  {
    emblem: '🐺',
    bg: 'red',
    lines: ['The sky turned red. A black fog rolled over the hills.', 'The Wolf Legion came — led by the Iron Howl.'],
  },
  {
    emblem: '🔥',
    bg: 'ash',
    lines: ['Homes burned. Families were carried away in iron cages.', 'By sunrise, Piggy Kingdom was gone.'],
  },
  {
    emblem: '🐷',
    bg: 'root',
    lines: ['Only one tiny piglet remained, hidden beneath the roots,', 'holding a small wooden necklace from her mother.', 'Her name was Pip.'],
  },
  {
    emblem: '💛',
    bg: 'hope',
    lines: ['“Follow the light inside your heart,” her mother whispered.', '“It will always lead you home.”'],
  },
  {
    emblem: '✨',
    bg: 'hope',
    lines: ['Every night, Pip’s necklace glows faintly.', 'And a tiny voice calls: “Please find us.”', 'Pip refuses to stop looking. So do you.'],
  },
];

/** Chapter framing laid over each world (by world index 0–4). */
export interface ChapterDef {
  n: number;
  title: string;
  /** One-line story beat shown under the world header. */
  beat: string;
}

export const CHAPTERS: Record<number, ChapterDef> = {
  0: { n: 1, title: 'Ashes of Home', beat: 'Pip searches the ruins for the first survivors — and the wolves are still watching.' },
  1: { n: 2, title: 'The Human Houses', beat: 'Captured piggies are hidden inside giant human homes. Sneak in, find them, get out.' },
  2: { n: 3, title: 'The Broken Herd', beat: 'Pigs who escaped years ago have stopped hoping. Pip must earn their trust.' },
  3: { n: 4, title: 'The Golden Cages', beat: 'Beautiful prisons, and piggies who forgot the way home. Light the Memory Lanterns.' },
  4: { n: 5, title: 'The Last Oink', beat: 'The Iron Howl waits above the Hollow Heart. The whole herd stands with Pip now.' },
};

export const CHAPTER_OF = (worldIndex: number): ChapterDef | undefined => CHAPTERS[worldIndex];

/** Sanctuary restoration narration — grows as more pigs are brought home. */
export interface SanctuaryTier {
  n: number; // tier index 0–5
  min: number; // freed count at which this tier begins
  title: string;
  line: string; // the on-reveal narration
}

/**
 * Six restoration tiers keyed to rescue count (the bible's 1–100 arc,
 * compressed to the current 22-pig roster). The Sanctuary scene, the Heart
 * Tree, and the reveal moments all derive from these — there's no separate
 * progression system.
 */
export const SANCTUARY_TIERS: SanctuaryTier[] = [
  { n: 0, min: 0, title: 'The Silent Meadow', line: 'This place is waiting. Rescue your first piggy to bring it back to life.' },
  { n: 1, min: 1, title: 'The First Light', line: 'The fire is burning again.' },
  { n: 2, min: 4, title: 'Home Begins', line: 'The oven lights itself. Home remembers.' },
  { n: 3, min: 8, title: 'The Herd Returns', line: 'The meadow is no longer quiet.' },
  { n: 4, min: 13, title: 'A Kingdom Awakens', line: 'They are not merely surviving anymore.' },
  { n: 5, min: 18, title: 'Piggy Kingdom Reborn', line: 'A kingdom returns when its families come home.' },
];

/** The restoration tier for a given number of freed pigs. */
export function sanctuaryTier(freed: number): SanctuaryTier {
  let tier = SANCTUARY_TIERS[0];
  for (const t of SANCTUARY_TIERS) if (freed >= t.min) tier = t;
  return tier;
}

/**
 * The next tier to reach and how many more pigs are needed, or null once the
 * Sanctuary is fully reborn. Powers the Heart Tree panel and the menu preview.
 */
export function nextSanctuaryTier(
  freed: number,
): { tier: SanctuaryTier; need: number } | null {
  const current = sanctuaryTier(freed);
  const next = SANCTUARY_TIERS[current.n + 1];
  if (!next) return null;
  return { tier: next, need: next.min - freed };
}

/** Tier numbers whose reveal a player at `freed` pigs has already earned (1–5). */
export function earnedRevealTiers(freed: number): number[] {
  return SANCTUARY_TIERS.filter((t) => t.n >= 1 && t.min <= freed).map((t) => t.n);
}
