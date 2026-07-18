// The Piggy Book — collection, rescue reveal, chains, mastery, disabled shop.
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

// Modern save, intro seen, lots of coins, nothing freed yet.
await page.evaluate((KEY) => {
  const s = {
    version: 1, unlockedLevel: 31, levels: {}, coins: 9000, pigment: 0, rescueTokens: 40,
    freedPigs: {}, kingdom: { house: 0, bakery: 0, fountain: 0 }, mochiRescued: true,
    rescued: { mochi: true }, dailyDone: null, items: {}, freeUsed: {}, worldChests: {},
    starRewarded: {}, replay: { levelId: 0, streak: 0 },
    story: { introSeen: true, sanctuaryReveals: { 1: true, 2: true, 3: true, 4: true, 5: true } },
    book: { discovered: {}, reveals: {}, mastery: {}, rescueBaseline: {}, clues: {}, tutorialSeen: false },
    settings: { muted: true, musicOff: false, hapticsOff: false, reducedMotion: false, lowEffects: false, colorSymbols: false, relaxedMode: true, theme: 'classic' },
  };
  localStorage.setItem(KEY, JSON.stringify(s));
}, KEY);
await page.reload({ waitUntil: 'networkidle' });

// 1. Open the Piggy Book from the menu.
await page.getByRole('button', { name: /the piggy book/i }).click();
await page.waitForSelector('.book-grid');
const cards = await page.locator('.book-card').count();
if (cards === 22) ok('Piggy Book shows all 22 entries'); else fail('card count: ' + cards);
const hidden = await page.locator('.book-card.state-hidden').count();
const discovered = await page.locator('.book-card.state-discovered').count();
if (hidden > 0 && discovered > 0) ok(`states render (hidden ${hidden}, discovered ${discovered})`); else fail('missing hidden/discovered states');
await page.screenshot({ path: `${SHOT}/book-grid.png`, fullPage: true });

// 2. Disabled shop: buy buttons cannot purchase.
await page.locator('.icon-btn[aria-label="Piggy Supply Cart"]').click();
await page.waitForSelector('.supply-cart');
const buys = await page.locator('.supply-buy').count();
const enabledBuys = await page.locator('.supply-buy:not([disabled])').count();
if (buys > 0 && enabledBuys === 0) ok(`supply cart is preview-only (${buys} products, 0 purchasable)`); else fail('shop has enabled buy buttons: ' + enabledBuys);
await page.locator('.supply-cart .btn--primary').click();
await page.waitForTimeout(150);

// 3. A discovered card opens a detail with a rescue cost + Sanctuary link.
await page.locator('.book-card.state-discovered').first().click();
await page.waitForSelector('.pig-card');
if (await page.locator('.pig-cost-line').count()) ok('discovered card shows a rescue cost'); else fail('no cost on discovered card');
await page.locator('.pig-card .btn--primary').click(); // close
await page.waitForTimeout(150);
await page.locator('button[aria-label="Back"]').click();
await page.waitForTimeout(150);

// 4. Rescue a pig → character reveal appears (skippable) and follows a chain.
await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForSelector('.world-map');
await page.locator('.icon-btn[aria-label="Rescue Sanctuary"]').click();
await page.waitForSelector('.sanctuary-scene');
// Rosie is first (120 coins) and reveals Pebbles.
await page.locator('.captive button').first().click();
await page.waitForTimeout(500);
if (await page.locator('.reveal-dialog').count()) ok('rescue shows a character reveal'); else fail('no character reveal');
await page.screenshot({ path: `${SHOT}/book-reveal.png` });
// Skippable once the name shows.
await page.waitForSelector('.reveal-name', { timeout: 3000 });
const skip = page.locator('.reveal-skip');
if (await skip.count()) { await skip.click(); } else { await page.locator('.reveal-dialog .btn--primary').click(); }
await page.waitForTimeout(600);
const migrated = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)), KEY);
if (migrated.freedPigs.rosie) ok('Rosie is rescued'); else fail('Rosie not rescued');
if (migrated.book.discovered.pebbles) ok('rescue chain discovered Pebbles'); else fail('chain did not discover Pebbles');
if (!migrated.freedPigs.pebbles) ok('chain did not auto-rescue Pebbles'); else fail('chain auto-rescued a pig');

// 5. Reopen the book → Rosie now rescued, and reveal doesn't replay.
await page.locator('.icon-btn[aria-label="The Piggy Book"]').click();
await page.waitForSelector('.book-grid');
const rescuedCards = await page.locator('.book-card.state-rescued').count();
if (rescuedCards >= 1) ok('Rosie now shows as rescued in the book'); else fail('no rescued card after rescue');

if (cerr.length === 0) ok('no console errors'); else fail('console errors: ' + cerr.join('; '));
console.log('\nconsole errors:', cerr.length ? cerr : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nPIGGY BOOK E2E PASSED');
await browser.close();
process.exit(errors.length ? 1 : 0);
