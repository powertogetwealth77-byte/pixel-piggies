// Release-hardening — runs against the PRODUCTION preview (4173) so dev-only
// behavior is accurate. Verifies: production hides the playtest badge, the flag
// enables it, the dashboard + feedback work, save import validates, and a
// corrupt primary save recovers from a backup instead of wiping progress.
import { chromium } from 'playwright-core';
const BASE = 'http://localhost:4173';
const errors = [];
const fail = (m) => { errors.push(m); console.log('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, hasTouch: true });
const page = await ctx.newPage();
const cerr = [];
page.on('console', (m) => { if (m.type() === 'error') cerr.push(m.text()); });
page.on('pageerror', (e) => cerr.push('pageerror: ' + e.message));
const KEY = 'pixel-piggies-save-v1';

const seed = () => page.evaluate((KEY) => {
  const s = { version: 1, unlockedLevel: 8, levels: {}, coins: 500, pigment: 0, rescueTokens: 3, freedPigs: { rosie: true }, kingdom: { house: 0, bakery: 0, fountain: 0 }, mochiRescued: true, rescued: { mochi: true }, dailyDone: null, items: {}, freeUsed: {}, settings: { muted: true, reducedMotion: false } };
  for (let i = 1; i <= 7; i++) s.levels[i] = { stars: 2, bestScore: 900, bestCombo: 5, cleared: true };
  localStorage.setItem(KEY, JSON.stringify(s));
  // Seed telemetry with some per-level play so the dashboard table has rows.
  localStorage.setItem('pixel-piggies-telemetry-v1', JSON.stringify({
    version: 1, sessions: 2,
    levels: { 3: { attempts: 5, wins: 1, losses: 4, retries: 3, fizzles: 1, bestTimeMs: 40000 }, 1: { attempts: 2, wins: 2, losses: 0, retries: 0, fizzles: 0, bestTimeMs: 20000 } },
    events: { invalid_action_feedback: 3, smart_hint_offered: 1, smart_hint_used: 1, piggy_book_opened: 2 },
  }));
}, KEY);

// 1. Production (no flag) hides the playtest badge + dev controls.
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await seed();
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
if (await page.locator('.playtest-badge').count() === 0) ok('production hides the PLAYTEST badge'); else fail('badge visible in production');

// 2. ?playtest=1 enables Playtest Mode (persists across navigation).
await page.goto(`${BASE}/?playtest=1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
if (await page.locator('.playtest-badge--fab').count()) ok('?playtest=1 shows the badge'); else fail('badge missing with flag');

// 3. Dashboard: summary + per-level table render.
await page.locator('.playtest-badge--fab').click();
await page.waitForSelector('.pt-stats');
ok('playtest dashboard opens with a summary');
if (await page.locator('.pt-table').count()) ok('per-level table renders'); else fail('no per-level table');
if (await page.getByText(/all data stays on this device/i).count()) ok('privacy note shown'); else fail('no privacy note');

// 4. Feedback persists locally.
await page.locator('.fb-star').nth(3).click(); // 4 stars
await page.locator('.fb-input').first().fill('the pens were a little confusing');
await page.getByRole('button', { name: /save feedback/i }).click();
await page.waitForTimeout(300);
const fb = await page.evaluate(() => JSON.parse(localStorage.getItem('pixel-piggies-feedback') || '[]'));
if (fb.length >= 1 && fb[0].rating === 4) ok('feedback saved locally'); else fail('feedback not saved: ' + JSON.stringify(fb));

// 5. Save import: invalid rejected, valid previews.
await page.evaluate(() => { const d = document.querySelector('.save-manager details'); if (d) d.open = true; });
await page.locator('.save-paste').fill('{ not valid json');
await page.getByRole('button', { name: /check paste/i }).click();
await page.waitForTimeout(200);
if (await page.locator('.import-err').count()) ok('invalid import is rejected with a message'); else fail('invalid import not rejected');
const validSave = await page.evaluate((KEY) => localStorage.getItem(KEY), KEY);
await page.locator('.save-paste').fill(validSave);
await page.getByRole('button', { name: /check paste/i }).click();
await page.waitForTimeout(200);
if (await page.locator('.import-preview').count()) ok('valid import shows a restore preview'); else fail('valid import no preview');

// 6. Corrupt primary save recovers from a backup (no silent wipe).
// First force a persist so a validated backup snapshot exists, then corrupt main.
await page.locator('button[aria-label="Back"]').click().catch(() => {});
await page.waitForTimeout(200);
await page.goto(`${BASE}/?playtest=1`, { waitUntil: 'networkidle' }); // back to menu
await page.getByRole('button', { name: /settings|⚙/i }).first().click().catch(async () => { await page.locator('.icon-btn').last().click(); });
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Toggle 🔊 Sound/i }).click().catch(() => {}); // persist → writes a snapshot
await page.waitForTimeout(300);
const snapExists = await page.evaluate(() => !!(localStorage.getItem('pixel-piggies-save-snap-a') || localStorage.getItem('pixel-piggies-save-snap-b')));
if (snapExists) ok('a recovery snapshot is written on save'); else fail('no recovery snapshot written');
await page.evaluate((KEY) => localStorage.setItem(KEY, '{ corrupt ]'), KEY);
await page.goto(`${BASE}/?playtest=1`, { waitUntil: 'networkidle' });
const recoveryToast = await page.getByText(/Recovered your progress/i).count().catch(() => 0);
// The recovery toast fires ~400ms after load; poll briefly.
let sawToast = recoveryToast > 0;
for (let i = 0; i < 12 && !sawToast; i++) { await page.waitForTimeout(120); sawToast = (await page.getByText(/Recovered your progress/i).count()) > 0; }
if (sawToast) ok('corrupt primary save recovers from a backup (no silent wipe)'); else fail('no recovery from corrupt save');

if (cerr.length === 0) ok('no console errors'); else fail('console errors: ' + cerr.join('; '));
console.log('\nconsole errors:', cerr.length ? cerr : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nPLAYTEST HARDENING E2E PASSED');
await browser.close();
process.exit(errors.length ? 1 : 0);
