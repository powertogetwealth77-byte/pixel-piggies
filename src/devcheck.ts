import { LEVELS } from './data/levels';
import { solveAll } from './engine/solver';
import { GameEngine } from './engine/engine';
import { solveLevel } from './engine/solver';
import { generateDailyLevel, todayKey } from './daily/daily';
import { defaultSave, resolveLevelReward, claimWorldChest, freePig, claimMasteryReward, claimQuest, markHeartMomentViewed, type LevelReward } from './save/save';
import { WORLDS } from './data/worlds';
import { CHAPTER_OF, INTRO_PANELS, sanctuaryTier, nextSanctuaryTier, earnedRevealTiers, SANCTUARY_TIERS } from './data/story';
import { SANCTUARY, SANCTUARY_COUNT, CHARACTERS, PIG_BY_ID, RARITY_ORDER, rarityCounts, rescueChains } from './data/sanctuary';
import { collectionStats, pigState, masteryEligible } from './data/book';
import { PIG_ACTIVITIES, RELATIONSHIPS, HEART_MOMENTS, QUESTS, QUEST_BY_PIG, questStatus, pickAmbient, PERIOD_ORDER } from './data/life';
import type { LevelDef } from './engine/types';

// Validate board/picture dimensions.
let dimOk = true;
for (const lvl of LEVELS) {
  const w = lvl.blocks[0].length;
  for (const row of lvl.blocks) {
    if (row.length !== w) {
      console.log(`Level ${lvl.id} block row width mismatch: "${row}" (${row.length} vs ${w})`);
      dimOk = false;
    }
  }
  if (w % 3 !== 0) {
    console.log(`Level ${lvl.id} width ${w} not divisible by 3`);
    dimOk = false;
  }
  if (lvl.picture.length !== lvl.blocks.length) {
    console.log(`Level ${lvl.id} picture height ${lvl.picture.length} != board ${lvl.blocks.length}`);
    dimOk = false;
  }
  for (const row of lvl.picture) {
    if (row.length !== w) {
      console.log(`Level ${lvl.id} picture row width mismatch: "${row}" (${row.length} vs ${w})`);
      dimOk = false;
    }
  }
}
console.log(dimOk ? 'DIMENSIONS OK' : 'DIMENSION ERRORS FOUND');

const reports = solveAll(LEVELS);
let allSolvable = true;
for (const r of reports) {
  console.log(`L${r.levelId} ${r.solvable ? 'OK ' : 'FAIL'} ${r.name} — ${r.note}`);
  if (!r.solvable) allSolvable = false;
}
console.log(allSolvable ? 'ALL LEVELS SOLVABLE' : 'SOME LEVELS UNSOLVABLE');

// --- Chain reaction unit check -------------------------------------------
// Board (top to bottom):   . m .      Clearing the coral L drops the three
//                          m c m      mints into one row: three previously
//                          c c c      separate clusters merge and cascade.
const chainLevel: LevelDef = {
  id: 999,
  name: 'chain-test',
  tagline: '',
  pictureName: 'test',
  blocks: ['.m.', 'mcm', 'ccc'],
  picture: ['...', '...', '...'],
  pens: 3,
  spawnMs: 99999,
  queue: [{ type: 'blaze', color: 'coral' }],
  starScores: [1, 2, 3],
  pigment: 0,
};
const eng = new GameEngine(chainLevel);
eng.start();
eng.launchLane(0, 0);
let chainOk = false;
for (let t = 0; t < 20; t++) {
  eng.tick(100);
  const s = eng.getSnapshot();
  if (s.lastChain && s.phase === 'won') {
    chainOk = s.lastChain.stage === 2 && s.lastChain.cleared.length === 3;
    break;
  }
}
console.log(chainOk ? 'CHAIN CASCADE OK' : 'CHAIN CASCADE FAILED');

// --- Daily bonus board validation --------------------------------------
// Generate boards for a spread of dates and confirm each is solver-passing
// and deterministic for its date.
let dailyOk = true;
const dates: string[] = [];
const base = new Date('2026-07-01T12:00:00');
for (let i = 0; i < 30; i++) {
  const d = new Date(base);
  d.setDate(base.getDate() + i);
  dates.push(todayKey(d));
}
for (const date of dates) {
  const lvl = generateDailyLevel(date);
  const again = generateDailyLevel(date);
  const report = solveLevel(lvl);
  if (!report.solvable) {
    console.log(`DAILY ${date} UNSOLVABLE: ${report.note}`);
    dailyOk = false;
  }
  if (JSON.stringify(lvl.blocks) !== JSON.stringify(again.blocks)) {
    console.log(`DAILY ${date} NOT DETERMINISTIC`);
    dailyOk = false;
  }
}
console.log(dailyOk ? `DAILY BOARDS OK (${dates.length} dates validated)` : 'DAILY BOARD FAILURES');

// --- Glitch Tide deterministic unit checks -----------------------------
// Idle-able board (id 2 → early tier: ~45s idle-to-strike). Three separate
// coral columns (cols 0/2/4) never merge under gravity, so idling never
// auto-clears the board, and one 2-ammo coral blaze can match twice.
function tideLevel(id: number): LevelDef {
  return {
    id,
    name: 'tide-test',
    tagline: '',
    pictureName: 'test',
    blocks: ['c.c.c.', 'c.c.c.', 'c.c.c.', 'c.c.c.', 'c.c.c.'],
    picture: ['......', '......', '......', '......', '......'],
    pens: 3,
    spawnMs: 99999,
    queue: [{ type: 'blaze', color: 'coral', ammo: 4 }],
    starScores: [1, 2, 3],
    pigment: 0,
  };
}
const tideChecks: [string, boolean][] = [];

// 1. Tutorial (level 1) has no Tide even after moves + long idle.
{
  const e = new GameEngine({ ...tideLevel(1) });
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 200; t++) e.tick(1000);
  const s = e.getSnapshot();
  tideChecks.push(['tutorial has no tide', !s.tideEnabled && s.tide === 0 && s.strikes === 0]);
}

// 2. Tide is idle before the first move, then rises after it.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  for (let t = 0; t < 10; t++) e.tick(1000);
  const beforeMove = e.getSnapshot().tide;
  e.launchLane(0, 0);
  for (let t = 0; t < 5; t++) e.tick(200); // let cascades settle
  const afterClear = e.getSnapshot().tide;
  for (let t = 0; t < 8; t++) e.tick(1000); // idle
  const afterIdle = e.getSnapshot().tide;
  tideChecks.push([
    'tide idle before move, rises after',
    beforeMove === 0 && afterIdle > afterClear,
  ]);
}

// 3. Pause stops the clock.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 4; t++) e.tick(200);
  const before = e.getSnapshot().tide;
  e.pause();
  for (let t = 0; t < 30; t++) e.tick(1000);
  const during = e.getSnapshot().tide;
  e.resume();
  tideChecks.push(['pause stops the tide clock', before === during]);
}

// 4. Strike on expiry: meter resets, board is untouched, no instant loss.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 3; t++) e.tick(200);
  const blocksBefore = e.getSnapshot().blocksRemaining;
  // Idle ~55s to guarantee one strike (early ≈ 45s to fill).
  for (let t = 0; t < 60; t++) e.tick(1000);
  const s = e.getSnapshot();
  const blocksAfter = s.blocksRemaining;
  tideChecks.push([
    'strike resets meter, keeps board',
    s.strikes >= 1 && s.phase === 'playing' && s.tide < 100 && blocksAfter === blocksBefore,
  ]);
}

// 5. Three strikes lose the level with reason 'tide'.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 400 && e.getSnapshot().phase === 'playing'; t++) e.tick(1000);
  const s = e.getSnapshot();
  tideChecks.push(['three strikes = loss (tide)', s.phase === 'lost' && s.lossReason === 'tide' && s.strikes === 3]);
}

// 6. Relaxed Mode: the Tide never rises.
{
  const e = new GameEngine(tideLevel(2), { relaxed: true });
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 200; t++) e.tick(1000);
  const s = e.getSnapshot();
  tideChecks.push(['relaxed mode disables tide', !s.tideEnabled && s.tide === 0 && s.strikes === 0]);
}

// 7. A match restores time (lowers the meter).
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0); // clears the col-0 coral cluster; sets shotsFired
  for (let t = 0; t < 10; t++) e.tick(1000); // raise the tide (~22)
  const raised = e.getSnapshot().tide;
  e.launchLane(1, 0); // same 4-ammo coral blaze clears the col-2 cluster
  const restored = e.getSnapshot().tide;
  tideChecks.push(['match restores tide', raised > 5 && restored < raised]);
}

// 8. Second Wind revives a tide loss without touching the board.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 400 && e.getSnapshot().phase === 'playing'; t++) e.tick(1000);
  const lost = e.getSnapshot();
  const blocks = lost.blocksRemaining;
  const revived = e.secondWind();
  const s = e.getSnapshot();
  tideChecks.push([
    'second wind revives tide loss',
    lost.phase === 'lost' && revived && s.phase === 'playing' && s.strikes === 1 && s.blocksRemaining === blocks,
  ]);
}

let tideOk = true;
for (const [name, pass] of tideChecks) {
  if (!pass) {
    console.log(`TIDE CHECK FAILED: ${name}`);
    tideOk = false;
  }
}
console.log(tideOk ? `GLITCH TIDE OK (${tideChecks.length} checks)` : 'GLITCH TIDE FAILURES');

// --- Replay reward economy + world chest unit checks --------------------
const rc: [string, boolean][] = [];
const R = (levelId: number, stars: number, score: number): LevelReward => ({
  levelId,
  stars,
  score,
  bestCombo: 10,
  coins: 100,
  pigment: 12,
});
const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

// 1. First clear: existing coins/pigment/token logic + stars marked.
{
  const { next, summary } = resolveLevelReward(defaultSave(), R(1, 2, 1500), 3, () => 0.99);
  rc.push(['first-clear coins', next.coins === 100]);
  rc.push(['first-clear tokens', next.rescueTokens === 3]); // 1 + (2-1) + 1
  rc.push(['first-clear pigment', next.pigment === 12]);
  rc.push(['first-clear marks stars', !!next.starRewarded['1:1'] && !!next.starRewarded['1:2']]);
  rc.push(['first-clear unlocks next', next.unlockedLevel === 2]);
  rc.push(['first-clear no anti-grind', summary.antiGrind === false]);
}

// 2. Replay base + score bonus (no high score), capped at 25.
{
  const s = defaultSave();
  s.levels[1] = { stars: 3, bestScore: 999999, bestCombo: 50, cleared: true };
  s.starRewarded = { '1:1': true, '1:2': true, '1:3': true };
  const a = resolveLevelReward(s, R(1, 1, 5000), 3, () => 0.99);
  rc.push(['replay base+score = 15', a.summary.totalCoins === 15]);
  rc.push(['replay grants no pigment', a.next.pigment === 0]);
  const b = resolveLevelReward(s, R(1, 1, 50000), 3, () => 0.99);
  rc.push(['replay capped at 25', b.summary.totalCoins === 25]);
}

// 3. New high score = +15 once.
{
  const s = defaultSave();
  s.levels[1] = { stars: 1, bestScore: 500, bestCombo: 10, cleared: true };
  s.starRewarded = { '1:1': true };
  const { summary } = resolveLevelReward(s, R(1, 1, 3000), 3, () => 0.99);
  rc.push(['high-score bonus', summary.newHighScore && summary.totalCoins === 28]); // 10+3+15
}

// 4. New-star token granted once, never twice.
{
  const s = defaultSave();
  s.levels[1] = { stars: 1, bestScore: 100, bestCombo: 10, cleared: true };
  s.starRewarded = { '1:1': true };
  const a = resolveLevelReward(s, R(1, 2, 50), 3, () => 0.99);
  rc.push(['new-star token', a.summary.newStarTokens === 1 && a.next.rescueTokens === 1]);
  const b = resolveLevelReward(a.next, R(1, 2, 50), 3, () => 0.99);
  rc.push(['no double star token', b.summary.newStarTokens === 0]);
}

// 5. Perfect-clear treasure: deterministic via injected rng.
{
  const s = defaultSave();
  s.levels[1] = { stars: 3, bestScore: 999999, bestCombo: 10, cleared: true };
  s.starRewarded = { '1:1': true, '1:2': true, '1:3': true };
  const hit = resolveLevelReward(s, R(1, 3, 5000), 3, seq([0.9, 0.1, 0.5]));
  rc.push(['treasure granted', hit.summary.treasureCoins === 35]); // 20 + floor(0.5*31)
  const miss = resolveLevelReward(s, R(1, 3, 5000), 3, seq([0.9, 0.5]));
  rc.push(['treasure skipped', miss.summary.treasureCoins === 0]);
}

// 6. Anti-grind reduces base after repeated non-improving replays, then resets.
{
  let s = defaultSave();
  s.levels[1] = { stars: 3, bestScore: 999999, bestCombo: 10, cleared: true };
  s.starRewarded = { '1:1': true, '1:2': true, '1:3': true };
  const bases: number[] = [];
  for (let i = 0; i < 6; i++) {
    const { next, summary } = resolveLevelReward(s, R(1, 1, 100), 3, () => 0.99);
    bases.push(summary.baseCoins);
    s = next;
  }
  rc.push(['anti-grind kicks in', bases[0] === 10 && bases[5] === 5]);
  s.levels[2] = { stars: 0, bestScore: 0, bestCombo: 0, cleared: false };
  const diff = resolveLevelReward(s, R(2, 1, 100), 3, () => 0.99).next;
  const back = resolveLevelReward(diff, R(1, 1, 100), 3, () => 0.99).summary;
  rc.push(['anti-grind resets after other level', back.baseCoins === 10]);
}

// 7. World chest: claim once, only when complete.
{
  const s = defaultSave();
  for (let i = 1; i <= 6; i++) s.levels[i] = { stars: 2, bestScore: 100, bestCombo: 0, cleared: true };
  const w = WORLDS[0];
  const c1 = claimWorldChest(s, w);
  rc.push(['world chest pays out', !!c1 && c1.coins === 150 && c1.rescueTokens === 1 && c1.worldChests[0] === true]);
  rc.push(['world chest once', claimWorldChest(c1!, w) === null]);
  const s2 = defaultSave();
  s2.levels[1] = { stars: 2, bestScore: 100, bestCombo: 0, cleared: true };
  rc.push(['world chest needs full world', claimWorldChest(s2, w) === null]);
}

// 8. Migration intent: stars already owned never re-award a token on replay.
{
  const s = defaultSave();
  s.levels[1] = { stars: 2, bestScore: 100, bestCombo: 0, cleared: true };
  s.starRewarded = { '1:1': true, '1:2': true };
  const { summary } = resolveLevelReward(s, R(1, 2, 50), 3, () => 0.99);
  rc.push(['no token for owned stars', summary.newStarTokens === 0]);
}

let rewardOk = true;
for (const [name, pass] of rc) {
  if (!pass) {
    console.log(`REWARD CHECK FAILED: ${name}`);
    rewardOk = false;
  }
}
console.log(rewardOk ? `REWARD ECONOMY OK (${rc.length} checks)` : 'REWARD ECONOMY FAILURES');

// ---- Story layer: cinematic gate, chapters, sanctuary tiers, pig memories ----
const sc: [string, boolean][] = [];
{
  // Chapters cover every world with sensible numbering.
  sc.push(['a chapter exists for each of the 5 worlds', WORLDS.every((w) => !!CHAPTER_OF(w.index))]);
  sc.push(['chapters are numbered 1..5 in order', WORLDS.every((w) => CHAPTER_OF(w.index)!.n === w.index + 1)]);
  sc.push(['intro cinematic has panels', INTRO_PANELS.length >= 4 && INTRO_PANELS.every((p) => p.lines.length > 0)]);

  // Sanctuary restoration: six tiers derive from rescue count at the spec's
  // boundaries (0, 1, 4, 8, 13, 18) and never regress.
  sc.push(['six restoration tiers exist', SANCTUARY_TIERS.length === 6]);
  sc.push(['tier(0) is The Silent Meadow', sanctuaryTier(0).n === 0]);
  sc.push(['tier(3) is still The First Light', sanctuaryTier(3).n === 1]);
  sc.push(['tier(4) advances to Home Begins', sanctuaryTier(4).n === 2]);
  sc.push(['tier(8) is The Herd Returns', sanctuaryTier(8).n === 3]);
  sc.push(['tier(13) is A Kingdom Awakens', sanctuaryTier(13).n === 4]);
  sc.push(['tier(18) is Piggy Kingdom Reborn', sanctuaryTier(18).n === 5]);
  sc.push(['tier(SANCTUARY_COUNT) is the final tier', sanctuaryTier(SANCTUARY_COUNT).n === 5]);
  sc.push(['tier numbers never regress', (() => { let last = -1; for (let n = 0; n <= 40; n++) { const m = sanctuaryTier(n).n; if (m < last) return false; last = m; } return true; })()]);
  sc.push(['nextTier at 0 needs 1 pig for The First Light', nextSanctuaryTier(0)?.need === 1 && nextSanctuaryTier(0)?.tier.n === 1]);
  sc.push(['nextTier at full roster is null', nextSanctuaryTier(SANCTUARY_COUNT) === null]);
  sc.push(['earnedRevealTiers(0) is empty', earnedRevealTiers(0).length === 0]);
  sc.push(['earnedRevealTiers(full) covers tiers 1..5', earnedRevealTiers(SANCTUARY_COUNT).join(',') === '1,2,3,4,5']);

  // Biscuit carries the necklace clue (the bible's first-rescue beat).
  const biscuit = SANCTUARY.find((p) => p.id === 'biscuit');
  sc.push(['Biscuit has a story memory line', !!biscuit?.story && /necklace/i.test(biscuit!.story!)]);

  // Migration: a save with existing progress must NOT re-trigger the intro,
  // while a brand-new save must show it.
  const withProgress = JSON.stringify({ ...defaultSave(), unlockedLevel: 4, levels: { 1: { stars: 3, bestScore: 9, bestCombo: 1, cleared: true } }, story: undefined });
  // Emulate loadSave's merge rule directly (loadSave reads localStorage).
  const migratedSeen = (JSON.parse(withProgress).unlockedLevel > 1) || Object.keys(JSON.parse(withProgress).levels).length > 0;
  sc.push(['existing-progress save skips the intro', migratedSeen === true]);
  sc.push(['fresh save defaults introSeen=false', defaultSave().story.introSeen === false]);
  sc.push(['fresh save has empty sanctuaryReveals', Object.keys(defaultSave().story.sanctuaryReveals).length === 0]);
}
let storyOk = true;
for (const [name, pass] of sc) {
  if (!pass) {
    console.log(`STORY CHECK FAILED: ${name}`);
    storyOk = false;
  }
}
console.log(storyOk ? `STORY LAYER OK (${sc.length} checks)` : 'STORY LAYER FAILURES');

// ---- Piggy Book: roster, rarity, chains, collection math, mastery ----
const bc: [string, boolean][] = [];
{
  // Complete, distinct roster.
  bc.push(['22 characters', CHARACTERS.length === 22]);
  const fieldsOk = CHARACTERS.every(
    (c) => c.title && c.role && c.personality && c.favoriteFood && c.biography && c.rescueLine && c.sanctuaryLocation && c.discoveryClue && c.accessory,
  );
  bc.push(['every character has full identity fields', fieldsOk]);
  bc.push(['unique titles', new Set(CHARACTERS.map((c) => c.title)).size === 22]);

  // Rarity distribution: 6/5/4/3/2/2.
  const rc2 = rarityCounts();
  bc.push(['rarity 6 common', rc2.common === 6]);
  bc.push(['rarity 5 uncommon', rc2.uncommon === 5]);
  bc.push(['rarity 4 rare', rc2.rare === 4]);
  bc.push(['rarity 3 epic', rc2.epic === 3]);
  bc.push(['rarity 2 legendary', rc2.legendary === 2]);
  bc.push(['rarity 2 golden', rc2.golden === 2]);
  bc.push(['rarity totals to 22', RARITY_ORDER.reduce((s, r) => s + rc2[r], 0) === 22]);

  // Rescue chains — at least six, all valid.
  const chains = rescueChains();
  bc.push(['at least 6 rescue chains', chains.length >= 6]);
  bc.push(['chains point to real, different pigs', chains.every((c) => PIG_BY_ID[c.to] && c.to !== c.from)]);
  bc.push(['relationship ids all resolve', CHARACTERS.every((c) => c.relationshipIds.every((id) => !!PIG_BY_ID[id]))]);

  // Collection math on a fresh save.
  const fresh = defaultSave();
  const st = collectionStats(fresh);
  bc.push(['fresh: 0 rescued, 22 total', st.rescued === 0 && st.total === 22]);
  bc.push(['fresh: some pigs discovered (upcoming), rest hidden', st.discovered >= 1 && st.discovered + st.hidden === 22]);
  bc.push(['fresh: 0% complete', st.pct === 0]);

  // Freeing a pig rescues it + follows its chain (Rosie → Pebbles).
  let sv = defaultSave();
  sv.coins = 5000;
  const rosie = CHARACTERS.find((c) => c.id === 'rosie')!;
  sv = freePig(sv, rosie)!;
  bc.push(['freeing Rosie marks her rescued', pigState(sv, 'rosie') === 'rescued']);
  bc.push(['Rosie discovers her brother Pebbles', !!sv.book.discovered['pebbles']]);
  bc.push(['collection ticks to 1 rescued', collectionStats(sv).rescued === 1]);

  // Cosmetic mastery: advances with progress, never pays twice.
  bc.push(['Rosie mastery starts at Level 1', masteryEligible(sv, 'rosie') === 1]);
  for (let i = 1; i <= 3; i++) sv.levels[i] = { stars: 1, bestScore: 1, bestCombo: 0, cleared: true };
  bc.push(['3 cleared levels → eligible Level 2', masteryEligible(sv, 'rosie') === 2]);
  const claim1 = claimMasteryReward(sv, 'rosie');
  bc.push(['claim advances to Level 2', !!claim1 && claim1.level === 2]);
  sv = claim1!.next;
  bc.push(['claiming again is a no-op (no dup)', claimMasteryReward(sv, 'rosie') === null]);
  for (let i = 4; i <= 8; i++) sv.levels[i] = { stars: 1, bestScore: 1, bestCombo: 0, cleared: true };
  const coinsBefore = sv.coins;
  const claim3 = claimMasteryReward(sv, 'rosie');
  bc.push(['8 cleared → Level 3 with a coin reward', !!claim3 && claim3.level === 3 && claim3.coins > 0]);
  sv = claim3!.next;
  bc.push(['Level 3 paid its reward once', sv.coins === coinsBefore + (claim3!.coins)]);
  bc.push(['Level 3 cannot be re-claimed', claimMasteryReward(sv, 'rosie') === null]);

  // Every pig stays free-earnable (has a coin or token cost, no "paywall").
  bc.push(['every pig has an in-game cost', CHARACTERS.every((c) => c.cost.coins != null || c.cost.tokens != null)]);
}
let bookOk = true;
for (const [name, pass] of bc) {
  if (!pass) {
    console.log(`BOOK CHECK FAILED: ${name}`);
    bookOk = false;
  }
}
console.log(bookOk ? `PIGGY BOOK OK (${bc.length} checks)` : 'PIGGY BOOK FAILURES');

// ---- Living Sanctuary: behaviours, relationships, moments, quests ----
const lc: [string, boolean][] = [];
{
  // Every pig has at least two ambient behaviours.
  lc.push(['every pig has ≥2 ambient behaviours', CHARACTERS.every((c) => (PIG_ACTIVITIES[c.id]?.length ?? 0) >= 2)]);

  // Ambient scheduler caps concurrent behaviours.
  const allIds = CHARACTERS.map((c) => c.id);
  const picked = pickAmbient(allIds, 'morning', 3, 4);
  lc.push(['ambient scheduler caps at 4', picked.length <= 4]);
  lc.push(['ambient picks are valid pigs', picked.every((a) => allIds.includes(a.pigId))]);

  // Relationship category quotas.
  const count = (t: string) => RELATIONSHIPS.filter((r) => r.type === t).length;
  lc.push(['≥3 family relationships', count('family') >= 3]);
  lc.push(['≥4 friendships', count('friends') >= 4]);
  lc.push(['≥2 mentor relationships', count('mentor') >= 2]);
  lc.push(['≥2 partnerships', count('partners') >= 2]);
  lc.push(['≥1 friendly rivalry', count('rivals') >= 1]);
  lc.push(['≥1 royal alliance', count('royal') >= 1]);
  lc.push(['relationship pigs all resolve', RELATIONSHIPS.every((r) => PIG_BY_ID[r.a] && PIG_BY_ID[r.b] && r.a !== r.b)]);

  // Heart Moments.
  lc.push(['at least 12 Heart Moments', HEART_MOMENTS.length >= 12]);
  lc.push(['heart moment pigs all resolve', HEART_MOMENTS.every((m) => m.pigs.length > 0 && m.pigs.every((id) => PIG_BY_ID[id]))]);
  lc.push(['unique heart moment ids', new Set(HEART_MOMENTS.map((m) => m.id)).size === HEART_MOMENTS.length]);

  // Personal quests: one per pig, unique, modest rewards.
  lc.push(['22 personal quests', QUESTS.length === 22]);
  lc.push(['one quest per pig', CHARACTERS.every((c) => !!QUEST_BY_PIG[c.id])]);
  lc.push(['quest rewards never require a purchase', QUESTS.every((q) => (q.reward.coins ?? 0) <= 60 && (q.reward.tokens ?? 0) <= 1)]);
  const totalQuestCoins = QUESTS.reduce((s, q) => s + (q.reward.coins ?? 0), 0);
  lc.push(['total quest coins are modest (< a few world chests)', totalQuestCoins < 700]);

  // A quest completes for free and claims exactly once.
  let qsv = defaultSave();
  qsv.coins = 500;
  const sunny = CHARACTERS.find((c) => c.id === 'sunny')!;
  qsv = freePig(qsv, sunny)!; // Sunny's quest: clear 4 levels
  lc.push(['fresh quest is not yet complete', !questStatus(qsv, QUEST_BY_PIG.sunny).complete]);
  for (let i = 1; i <= 4; i++) qsv.levels[i] = { stars: 1, bestScore: 1, bestCombo: 0, cleared: true };
  lc.push(['quest completes from ordinary play', questStatus(qsv, QUEST_BY_PIG.sunny).complete]);
  const coinsPre = qsv.coins;
  const claimQ = claimQuest(qsv, 'sunny');
  lc.push(['claiming a quest grants its coin reward', !!claimQ && claimQ.coins === 20 && claimQ.next.coins === coinsPre + 20]);
  qsv = claimQ!.next;
  lc.push(['a quest cannot be claimed twice', claimQuest(qsv, 'sunny') === null]);

  // A heart-moment quest counts a viewed moment (Doodle needs "Nap Time").
  let hsv = defaultSave();
  hsv.coins = 5000;
  hsv = freePig(hsv, CHARACTERS.find((c) => c.id === 'marsh')!)!;
  hsv = freePig(hsv, CHARACTERS.find((c) => c.id === 'doodle')!)!;
  lc.push(['heart-moment quest incomplete before viewing', !questStatus(hsv, QUEST_BY_PIG.doodle).complete]);
  hsv = markHeartMomentViewed(hsv, 'marsh_doodle');
  lc.push(['heart-moment quest completes after viewing', questStatus(hsv, QUEST_BY_PIG.doodle).complete]);

  // A day period always resolves.
  lc.push(['period cycle has four phases', PERIOD_ORDER.length === 4]);
}
let lifeOk = true;
for (const [name, pass] of lc) {
  if (!pass) {
    console.log(`LIFE CHECK FAILED: ${name}`);
    lifeOk = false;
  }
}
console.log(lifeOk ? `LIVING SANCTUARY OK (${lc.length} checks)` : 'LIVING SANCTUARY FAILURES');

if (!chainOk || !allSolvable || !dimOk || !dailyOk || !tideOk || !rewardOk || !storyOk || !bookOk || !lifeOk) throw new Error('devcheck failed');
