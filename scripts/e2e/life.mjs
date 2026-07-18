// Living Sanctuary — ambient behaviours, Heart Moments, personal quests, Journal.
import { chromium } from 'playwright-core';
const SHOT = new URL('./shots', import.meta.url).pathname;
import { mkdirSync } from 'fs';
mkdirSync(SHOT, { recursive: true });

const errors = [];
const fail = (m) => { errors.push(m); console.log('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await (await browser.newContext({ viewport: { width: 420, height: 950 }, hasTouch: true })).newPage();
const cerr = [];
page.on('console', (m) => { if (m.type() === 'error') cerr.push(m.text()); });
page.on('pageerror', (e) => cerr.push('pageerror: ' + e.message));

const KEY = 'pixel-piggies-save-v1';
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

// A save with several pigs freed (incl. Biscuit+Waffles → a Heart Moment),
// enough cleared levels that Biscuit's quest is ready, all reveals seen.
await page.evaluate((KEY) => {
  // Biscuit+Waffles yield exactly ONE eligible Heart Moment; the others'
  // partners are still caged, so no second moment competes.
  const freed = ['biscuit', 'waffles', 'pebbles', 'nugget', 'jade', 'ziggy'];
  const freedPigs = {}; freed.forEach((id) => (freedPigs[id] = true));
  const levels = {}; for (let i = 1; i <= 6; i++) levels[i] = { stars: 2, bestScore: 900, bestCombo: 5, cleared: true };
  const s = {
    version: 1, unlockedLevel: 12, levels, coins: 4000, pigment: 0, rescueTokens: 5,
    freedPigs, kingdom: { house: 0, bakery: 0, fountain: 0 }, mochiRescued: true,
    rescued: { mochi: true }, dailyDone: null, items: {}, freeUsed: {}, worldChests: {},
    starRewarded: {}, replay: { levelId: 0, streak: 0 },
    story: { introSeen: true, sanctuaryReveals: { 1: true, 2: true, 3: true, 4: true, 5: true } },
    book: { discovered: {}, reveals: Object.fromEntries(freed.map((id) => [id, true])), mastery: Object.fromEntries(freed.map((id) => [id, 1])), rescueBaseline: Object.fromEntries(freed.map((id) => [id, { cleared: 0, freed: 0 }])), clues: {}, tutorialSeen: true },
    life: { quests: {}, heartMoments: {} },
    settings: { muted: true, musicOff: false, hapticsOff: false, reducedMotion: false, lowEffects: false, colorSymbols: false, relaxedMode: true, theme: 'classic' },
  };
  localStorage.setItem(KEY, JSON.stringify(s));
}, KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForSelector('.world-map');
await page.locator('.icon-btn[aria-label="Rescue Sanctuary"]').click();
await page.waitForSelector('.sanctuary-scene');

// 1. A Heart Moment plays on entry (Biscuit + Waffles are both rescued).
await page.waitForSelector('.heart-dialog', { timeout: 4000 });
ok('a Heart Moment plays on entry');
await page.screenshot({ path: `${SHOT}/life-moment.png` });
// Skippable after ~1s.
await page.waitForTimeout(1100);
await page.locator('.heart-dialog .btn--primary').click();
await page.waitForTimeout(400);
const seenMoment = await page.evaluate((KEY) => Object.keys(JSON.parse(localStorage.getItem(KEY)).life.heartMoments).length, KEY);
if (seenMoment >= 1) ok('Heart Moment recorded as viewed'); else fail('moment not persisted');

// 2. Day-cycle chip + ambient behaviour bubbles render (capped).
if (await page.locator('.scene-period').count()) ok('day-cycle chip renders'); else fail('no period chip');
await page.waitForTimeout(500);
const bubbles = await page.locator('.pig-bubble').count();
const actions = await page.locator('.pig-action').count();
if (bubbles <= 4 && actions <= 4) ok(`ambient behaviours capped (${bubbles} bubbles)`); else fail('too many active behaviours: ' + bubbles);

// 3. Re-enter → the same Heart Moment does NOT replay this session isn't testable
//    across a reload, but a reload (new session) with it marked viewed must not replay.
await page.locator('button[aria-label="Back"]').click();
await page.waitForSelector('.world-map');
await page.locator('.icon-btn[aria-label="Rescue Sanctuary"]').click();
await page.waitForSelector('.sanctuary-scene');
await page.waitForTimeout(600);
if (await page.locator('.heart-dialog').count() === 0) ok('viewed Heart Moment does not replay'); else fail('Heart Moment replayed after viewing');

// 4. A Sanctuary request bubble opens a personal quest, claimable once.
const req = page.locator('.request-bubble');
if (await req.count()) {
  ok('a request bubble is shown (never stacks: only one)');
  const reqCount = await req.count();
  if (reqCount === 1) ok('exactly one request bubble at a time'); else fail('request bubbles stacked: ' + reqCount);
  await req.first().evaluate((el) => el.click()); // it gently bobs; dispatch directly
  await page.waitForSelector('.quest-dialog');
  await page.screenshot({ path: `${SHOT}/life-quest.png` });
  const claimBtn = page.getByRole('button', { name: /claim reward/i });
  if (await claimBtn.count()) {
    const coins0 = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).coins, KEY);
    await claimBtn.click();
    await page.waitForTimeout(400);
    const coins1 = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).coins, KEY);
    if (coins1 > coins0) ok(`quest reward paid (+${coins1 - coins0} coins)`); else fail('quest reward not paid');
  } else {
    ok('request quest shown (in progress — no claim yet)');
    await page.locator('.quest-dialog .btn--ghost').click();
  }
} else {
  ok('no pending request (all active quests claimed) — acceptable');
}

// 5. Journal tab renders in the Piggy Book.
await page.locator('.icon-btn[aria-label="The Piggy Book"]').click();
await page.waitForSelector('.book-grid');
await page.locator('.book-card.state-rescued').first().click();
await page.waitForSelector('.pig-card');
await page.getByRole('button', { name: /journal/i }).click();
await page.waitForTimeout(200);
if (await page.locator('.journal').count()) ok('Journal tab renders'); else fail('no Journal tab');
await page.screenshot({ path: `${SHOT}/life-journal.png` });

if (cerr.length === 0) ok('no console errors'); else fail('console errors: ' + cerr.join('; '));
console.log('\nconsole errors:', cerr.length ? cerr : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nLIVING SANCTUARY E2E PASSED');
await browser.close();
process.exit(errors.length ? 1 : 0);
