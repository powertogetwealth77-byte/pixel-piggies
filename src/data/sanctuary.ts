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
  /** A short story "memory" shown when this piggy is first set free (optional). */
  story?: string;
}

const P = (
  id: string,
  name: string,
  type: PiggyType,
  color: ColorId,
  blurb: string,
  coins?: number,
  tokens?: number,
  story?: string,
): CaptivePig => ({ id, name, type, color, blurb, cost: tokens ? { tokens } : { coins }, story });

export const SANCTUARY: CaptivePig[] = [
  P('rosie', 'Rosie', 'mochi', 'coral', 'A shy piggy who loves belly rubs.', 120, undefined, '“Are you really here for me? I’d almost stopped listening for footsteps.”'),
  P('sunny', 'Sunny', 'blaze', 'sunny', 'Always the first to smile.', 160),
  P('minty', 'Minty', 'mochi', 'mint', 'Smells faintly of fresh grass.', 200),
  P('splash', 'Splash', 'pip', 'sky', 'Never met a puddle she didn’t like.', 260),
  P('grapey', 'Grapey', 'blaze', 'grape', 'Dreams in shades of purple.', 320),
  P('pebbles', 'Pebbles', 'pip', 'coral', 'Collects shiny little stones.', 400),
  P('biscuit', 'Biscuit', 'mochi', 'sunny', 'Warm, round, and golden.', 480, undefined, '“Are you… real?” Biscuit sees Pip’s necklace and starts to cry. “My mother had one just like that.”'),
  P('doodle', 'Doodle', 'blaze', 'sky', 'Draws in the mud with her snout.', 580),
  P('waffles', 'Waffles', 'pip', 'mint', 'Breakfast is her favorite time.', 700),
  P('cocoa', 'Cocoa', 'mochi', 'grape', 'Cozy as a winter morning.', 840),
  P('ziggy', 'Ziggy', 'blaze', 'coral', 'Zooms everywhere at full speed.', 1000),
  P('marsh', 'Marshmallow', 'mochi', 'sky', 'The softest piggy in the pen.', 1200, undefined, '“I stopped hoping because hope hurt too much.” Pip answers: “Then I’ll hope for both of us.”'),
  P('pippa', 'Pippa', 'pip', 'sunny', 'Tiny but mighty.', 1450),
  P('berry', 'Berry', 'blaze', 'mint', 'Stains everything she touches.', 1750),
  P('nugget', 'Nugget', 'mochi', 'coral', 'Small, precious, priceless.', 2100),
  P('clover', 'Clover', 'pip', 'grape', 'Lucky through and through.', 2500, undefined, 'Old Clover studies the necklace. “Your mother was no ordinary villager, little one. You should know that.”'),
  // Golden piggies — freed with Rescue Tokens.
  P('aurora', 'Aurora', 'prism', 'grape', 'Shimmers with rainbow light.', undefined, 6),
  P('comet', 'Comet', 'prism', 'sky', 'Streaks across the night sky.', undefined, 9),
  P('honey', 'Honey', 'prism', 'sunny', 'Sweet enough to glow.', undefined, 12),
  P('ruby', 'Ruby', 'prism', 'coral', 'A jewel of a piggy.', undefined, 16),
  P('jade', 'Jade', 'prism', 'mint', 'Calm, wise, and green.', undefined, 20, 'A former royal guardian. “Rebuilding won’t be easy. But you make me believe it’s worth it.”'),
  P('king', 'King Oinkter', 'prism', 'grape', 'The legendary lost royal piggy.', undefined, 30, 'The lost royal bows his head. “The Heart Tree never chose us for our blood — only our love. It chose well in you.”'),
];

export const SANCTUARY_COUNT = SANCTUARY.length;

// ---------------------------------------------------------------------------
// The Piggy Book character layer.
//
// Rich, distinct identity for each of the 22 pigs, kept in one place so no
// component re-authors character content. This augments the rescue roster
// above (id/name/type/color/cost/story) with title, rarity, role, an accessory
// marker, personality, bio, voice line, Sanctuary role/location, relationships,
// a hidden-state discovery clue, and — for chain "sources" — the pig they help
// discover and the clue they give.
// ---------------------------------------------------------------------------

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'golden';

export interface RarityInfo {
  label: string;
  /** Ordering / celebration intensity (0 lowest). */
  rank: number;
  /** Reveal duration in ms (skippable after the name appears). */
  revealMs: number;
  /** Particle count for the reveal / Sanctuary flourish. */
  particles: number;
}

export const RARITY_META: Record<Rarity, RarityInfo> = {
  common: { label: 'Common', rank: 0, revealMs: 2200, particles: 6 },
  uncommon: { label: 'Uncommon', rank: 1, revealMs: 3000, particles: 8 },
  rare: { label: 'Rare', rank: 2, revealMs: 3400, particles: 12 },
  epic: { label: 'Epic', rank: 3, revealMs: 4200, particles: 16 },
  legendary: { label: 'Legendary', rank: 4, revealMs: 5000, particles: 22 },
  golden: { label: 'Golden', rank: 5, revealMs: 5200, particles: 26 },
};

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'golden'];

export interface PigMeta {
  title: string;
  rarity: Rarity;
  role: string;
  accessory: string; // small emoji marker overlaid on the portrait
  personality: string;
  favoriteFood: string;
  biography: string;
  rescueLine: string; // spoken on the rescue reveal
  sanctuaryLocation: string;
  idleLine: string; // ambient reaction line
  relationshipIds: string[];
  discoveryClue: string; // shown while the pig is still hidden
  revealsId?: string; // a pig this one's rescue discovers (a rescue chain)
  chainClue?: string; // the clue this pig gives about revealsId
}

export const PIG_META: Record<string, PigMeta> = {
  rosie: {
    title: 'The Garden Keeper', rarity: 'common', role: 'Gardener', accessory: '🌸',
    personality: 'Loving, energetic', favoriteFood: 'Strawberries',
    biography: 'Rosie coaxed the first flowers back into the ash. Where she walks, the meadow blooms.',
    rescueLine: 'You came back for me!', sanctuaryLocation: 'The flower garden',
    idleLine: 'Rosie buries her snout in a flower patch.',
    relationshipIds: ['pebbles'], discoveryClue: 'Somewhere among the old flower beds…',
    revealsId: 'pebbles', chainClue: 'My little brother Pebbles loved the shiny stones by the creek — please, find him.',
  },
  sunny: {
    title: 'The Sunrise Singer', rarity: 'common', role: 'Musician', accessory: '🎵',
    personality: 'Cheery, warm', favoriteFood: 'Sunflower seeds',
    biography: 'Sunny hums the tune the kingdom woke to every morning. It is coming back, note by note.',
    rescueLine: 'Let’s make some noise again!', sanctuaryLocation: 'The bandstand',
    idleLine: 'Sunny hums a little morning tune.',
    relationshipIds: [], discoveryClue: 'A hum drifts from beyond the hill…',
  },
  minty: {
    title: 'The Herb Healer', rarity: 'common', role: 'Healer', accessory: '🌿',
    personality: 'Calm, caring', favoriteFood: 'Mint leaves',
    biography: 'Minty knows which leaf mends a scrape and which one mends a mood.',
    rescueLine: 'You look like you need a rest.', sanctuaryLocation: 'The herb patch',
    idleLine: 'Minty sorts a bundle of fresh herbs.',
    relationshipIds: [], discoveryClue: 'A faint smell of fresh mint on the wind…',
  },
  splash: {
    title: 'The Puddle Scout', rarity: 'common', role: 'Explorer', accessory: '💧',
    personality: 'Playful, fearless', favoriteFood: 'Watermelon',
    biography: 'Splash mapped every stream and secret crossing — and jumped in most of them.',
    rescueLine: 'Race you to the water!', sanctuaryLocation: 'The stream',
    idleLine: 'Splash stomps happily in a puddle.',
    relationshipIds: [], discoveryClue: 'Wet little hoofprints lead away from the river…',
  },
  grapey: {
    title: 'The Mural Painter', rarity: 'uncommon', role: 'Inventor', accessory: '🎨',
    personality: 'Quiet, creative', favoriteFood: 'Grapes',
    biography: 'Grapey paints the kingdom’s memories on every wall so no one forgets them.',
    rescueLine: 'I’ll paint this day forever.', sanctuaryLocation: 'The mural wall',
    idleLine: 'Grapey dabs a fresh splash of purple on the wall.',
    relationshipIds: [], discoveryClue: 'Half-finished paintings near a hidden cellar…',
  },
  pebbles: {
    title: 'The Stone Collector', rarity: 'common', role: 'Builder', accessory: '🔨',
    personality: 'Curious, steady', favoriteFood: 'Acorns',
    biography: 'Pebbles kept every pretty stone from the old creek. Each one is a tiny piece of home.',
    rescueLine: 'I saved a stone for you!', sanctuaryLocation: 'The rock garden',
    idleLine: 'Pebbles stacks little stones into a tower.',
    relationshipIds: ['rosie'], discoveryClue: 'Rosie says her brother waits by the creek…',
  },
  biscuit: {
    title: 'The First Light', rarity: 'common', role: 'Baker', accessory: '🥐',
    personality: 'Gentle, hopeful', favoriteFood: 'Honey biscuits',
    biography: 'The first piggy Pip ever rescued. Biscuit relit the bakery oven and, with it, hope.',
    rescueLine: 'Are you… real?', sanctuaryLocation: 'The bakery',
    idleLine: 'Biscuit leaves a warm loaf of bread near the fire.',
    relationshipIds: ['waffles'], discoveryClue: 'Somewhere near the old bakery…',
    revealsId: 'waffles', chainClue: 'Another baker is trapped near the old kitchen — Waffles never missed a breakfast.',
  },
  doodle: {
    title: 'The Mud Comedian', rarity: 'uncommon', role: 'Comedian', accessory: '🎭',
    personality: 'Silly, kind', favoriteFood: 'Blueberries',
    biography: 'Doodle draws jokes in the mud. Even on the darkest days, someone was always laughing.',
    rescueLine: 'Wanna hear a good one?', sanctuaryLocation: 'The art corner',
    idleLine: 'Doodle draws a silly face in the mud.',
    relationshipIds: ['marsh'], discoveryClue: 'Marshmallow remembers a piggy who drew jokes in the mud…',
  },
  waffles: {
    title: 'The Breakfast Baker', rarity: 'uncommon', role: 'Baker', accessory: '🧇',
    personality: 'Warm, punctual', favoriteFood: 'Waffles & syrup',
    biography: 'Waffles never missed a morning. The smell of breakfast means the kingdom is truly home.',
    rescueLine: 'Is it breakfast time yet?', sanctuaryLocation: 'The bakery',
    idleLine: 'Waffles flips an imaginary breakfast in the air.',
    relationshipIds: ['biscuit'], discoveryClue: 'Biscuit says a fellow baker is trapped near the old kitchen…',
  },
  cocoa: {
    title: 'The Cozy Teacher', rarity: 'rare', role: 'Teacher', accessory: '📚',
    personality: 'Patient, gentle', favoriteFood: 'Hot cocoa',
    biography: 'Cocoa reopened the little school so the youngest piggies could learn the old songs again.',
    rescueLine: 'There’s so much to teach you.', sanctuaryLocation: 'The schoolhouse',
    idleLine: 'Cocoa reads a story to a circle of piglets.',
    relationshipIds: [], discoveryClue: 'A dusty chalkboard sits in a forgotten schoolroom…',
  },
  ziggy: {
    title: 'The Speedy Courier', rarity: 'epic', role: 'Explorer', accessory: '⚡',
    personality: 'Zippy, bold', favoriteFood: 'Energy berries',
    biography: 'Ziggy carried messages between hiding piggies for years, always one step ahead of the wolves.',
    rescueLine: 'Fast enough for ya?', sanctuaryLocation: 'The trailhead',
    idleLine: 'Ziggy zooms a lap around the meadow.',
    relationshipIds: ['pippa'], discoveryClue: 'A blur of hoofprints circles the ruins…',
    revealsId: 'pippa', chainClue: 'A tiny inventor was tinkering in the workshop when the wolves came — Pippa is clever, she’ll be hiding.',
  },
  marsh: {
    title: 'The Dreamer', rarity: 'uncommon', role: 'Storyteller', accessory: '☁️',
    personality: 'Shy, imaginative', favoriteFood: 'Toasted marshmallows',
    biography: 'Marshmallow dreams the kingdom back to life, one gentle story at a time.',
    rescueLine: 'I dreamed you would come.', sanctuaryLocation: 'Beneath the Heart Tree',
    idleLine: 'Marshmallow naps softly beneath the Heart Tree.',
    relationshipIds: ['doodle'], discoveryClue: 'Someone is humming a lullaby in the dark…',
    revealsId: 'doodle', chainClue: 'There’s a piggy who draws jokes in the mud to make everyone laugh — Doodle needs us.',
  },
  pippa: {
    title: 'The Tiny Inventor', rarity: 'uncommon', role: 'Inventor', accessory: '🔧',
    personality: 'Bright, mighty', favoriteFood: 'Sunflower seeds',
    biography: 'Small but brilliant, Pippa builds the little machines that keep the Sanctuary humming.',
    rescueLine: 'I knew I could fix this!', sanctuaryLocation: 'The workshop',
    idleLine: 'Pippa tightens a bolt on a tiny contraption.',
    relationshipIds: ['ziggy'], discoveryClue: 'Ziggy says a clever inventor is hiding in the workshop…',
  },
  berry: {
    title: 'The Orchard Farmer', rarity: 'rare', role: 'Farmer', accessory: '🍓',
    personality: 'Warm, hardworking', favoriteFood: 'Berries',
    biography: 'Berry replanted the orchard from a single saved seed. Now the whole kingdom eats.',
    rescueLine: 'Let’s grow something good.', sanctuaryLocation: 'The orchard',
    idleLine: 'Berry waters a row of fresh sprouts.',
    relationshipIds: [], discoveryClue: 'A lone berry bush survives in a trampled field…',
  },
  nugget: {
    title: 'The Little Guardian', rarity: 'epic', role: 'Guardian', accessory: '🛡️',
    personality: 'Brave, loyal', favoriteFood: 'Golden corn',
    biography: 'The smallest guardian with the biggest heart. Nugget stood at the gate so others could run.',
    rescueLine: 'No one gets past me!', sanctuaryLocation: 'The front gate',
    idleLine: 'Nugget keeps a proud watch at the gate.',
    relationshipIds: [], discoveryClue: 'A tiny shield lies abandoned by a broken gate…',
  },
  clover: {
    title: 'The Keeper of Memories', rarity: 'rare', role: 'Elder Historian', accessory: '🍀',
    personality: 'Wise, patient', favoriteFood: 'Apple slices',
    biography: 'Clover remembers everything — the festivals, the families, and the night it all fell.',
    rescueLine: 'I have waited so long for this.', sanctuaryLocation: 'The story circle',
    idleLine: 'Clover tells the little ones a story of old.',
    relationshipIds: ['king'], discoveryClue: 'An old piggy hums forgotten songs somewhere far away…',
    revealsId: 'king', chainClue: 'There is a secret gate beneath the Wolf Fortress — that is where they took the King.',
  },
  aurora: {
    title: 'The Aurora Weaver', rarity: 'epic', role: 'Musician', accessory: '🌈',
    personality: 'Serene, radiant', favoriteFood: 'Stardust berries',
    biography: 'Aurora paints the night sky with light so no lost piggy ever walks home in the dark.',
    rescueLine: 'Look up — that light is for you.', sanctuaryLocation: 'The night meadow',
    idleLine: 'Aurora trails soft rainbow light as she moves.',
    relationshipIds: [], discoveryClue: 'Strange lights shimmer over the far hills at night…',
  },
  comet: {
    title: 'The Night Racer', rarity: 'legendary', role: 'Explorer', accessory: '☄️',
    personality: 'Daring, kind', favoriteFood: 'Comet candy',
    biography: 'Comet scouted the wolf roads under cover of night and always brought everyone home.',
    rescueLine: 'Ready for the adventure?', sanctuaryLocation: 'The observatory',
    idleLine: 'Comet streaks across the meadow like a shooting star.',
    relationshipIds: [], discoveryClue: 'A streak of light crosses the sky, too fast to follow…',
  },
  honey: {
    title: 'The Golden Baker', rarity: 'golden', role: 'Baker', accessory: '🍯',
    personality: 'Sweet, generous', favoriteFood: 'Honeycomb',
    biography: 'A legendary golden piggy whose honey bread could light a whole festival with joy.',
    rescueLine: 'Sweetness returns to the kingdom.', sanctuaryLocation: 'The golden bakery',
    idleLine: 'Honey glows softly, sharing warm bread with everyone.',
    relationshipIds: ['jade'], discoveryClue: 'Jade’s map points to a golden glow deep in the woods…',
  },
  ruby: {
    title: 'The Royal Guardian', rarity: 'golden', role: 'Guardian', accessory: '💎',
    personality: 'Noble, steadfast', favoriteFood: 'Ruby berries',
    biography: 'Ruby guarded the royal family to the very end. Her loyalty never once wavered.',
    rescueLine: 'The crown is safe once more.', sanctuaryLocation: 'The throne steps',
    idleLine: 'Ruby stands a proud, glittering watch.',
    relationshipIds: ['king'], discoveryClue: 'The King speaks of a guardian who never left her post…',
  },
  jade: {
    title: 'The Trail Finder', rarity: 'rare', role: 'Explorer', accessory: '🗺️',
    personality: 'Brave, curious', favoriteFood: 'Wild berries',
    biography: 'Jade reads the old maps and the older stars, and finds the paths everyone else has lost.',
    rescueLine: 'I know the way now.', sanctuaryLocation: 'By the bridge',
    idleLine: 'Jade studies a worn map near the bridge.',
    relationshipIds: ['honey'], discoveryClue: 'A trail of clever markings leads toward the deep woods…',
    revealsId: 'honey', chainClue: 'This old map points to a Golden Pig — Honey, who glows sweet enough to light the way.',
  },
  king: {
    title: 'The Fallen King', rarity: 'legendary', role: 'Royal Leader', accessory: '👑',
    personality: 'Proud, compassionate', favoriteFood: 'Golden apples',
    biography: 'The last king of Piggy Kingdom. He greets every rescued piggy himself, at the Heart Tree.',
    rescueLine: 'My people… you found us all.', sanctuaryLocation: 'The Heart Tree',
    idleLine: 'King Oinkter warmly greets a newly-rescued piggy.',
    relationshipIds: ['clover', 'ruby'], discoveryClue: 'Clover whispers of a secret gate beneath the Wolf Fortress…',
    revealsId: 'ruby', chainClue: 'My royal guardian Ruby stood watch until the very end. Find her, and the crown means something again.',
  },
};

/** The merged character = rescue entry (id/name/type/color/cost/story) + rich meta. */
export type PigCharacter = CaptivePig & PigMeta;

export const CHARACTERS: PigCharacter[] = SANCTUARY.map((p) => ({ ...p, ...PIG_META[p.id] }));

export const PIG_BY_ID: Record<string, PigCharacter> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
);

/** Count of pigs per rarity (for the roster / distribution checks). */
export function rarityCounts(): Record<Rarity, number> {
  const out = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, golden: 0 } as Record<Rarity, number>;
  for (const c of CHARACTERS) out[c.rarity] += 1;
  return out;
}

/** Every rescue chain: a source pig discovers a target pig with a clue. */
export function rescueChains(): Array<{ from: string; to: string; clue: string }> {
  return CHARACTERS.filter((c) => c.revealsId && c.chainClue).map((c) => ({
    from: c.id,
    to: c.revealsId!,
    clue: c.chainClue!,
  }));
}
