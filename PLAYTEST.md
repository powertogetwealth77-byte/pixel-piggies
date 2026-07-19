# Pixel Piggies — Playtest Script (20–30 min)

A practical moderated test for ~10 external players. Everything the game records
is **local to the player's device** (no accounts, no network, no personal data).

## Setup

1. Open the game with **`?playtest=1`** appended to the URL (enables the PLAYTEST
   badge, quick check-ins, the dashboard, and the perf monitor).
2. Optional: add **`?dev=1`** for the observer's own device to enable
   skip-to-level. Never give players the `dev` link.
3. Use a fresh browser profile (or clear the site's storage) so each player
   starts clean. Progress lives in `localStorage`.

## Observer instructions

- **Do not coach** unless the player is completely stuck for >60s.
- Record where they **hesitate** and any **wrong taps**.
- Note **spoken confusion** verbatim ("wait, what do I do?").
- Record whether they **visit the Sanctuary voluntarily** (without being told).
- Record **which pig names** they mention or remember.
- Record **where they stop** or ask to quit, and why.
- After the session, tap the **PLAYTEST badge → Export report** to save a JSON
  diagnostic, and **Copy summary** for a quick paste into notes / a bug report.

## Player tasks

1. Start the game with **no instructions**. (Watch the first 45 seconds closely.)
2. Complete the **first three levels**.
3. Open the **world map** (the Adventure Map).
4. **Rescue one pig** (clear a level, then spend coins in the Sanctuary).
5. **Visit the Sanctuary** and look around.
6. Open **The Piggy Book**.
7. **Complete one personal quest** (tap a pig's request bubble in the Sanctuary).
8. Keep playing until they **naturally want to stop**.
9. Submit the **feedback form** (PLAYTEST badge → Feedback, or Settings →
   Playtest dashboard).

## Key things to watch (first 10 minutes)

- Do they understand the **first objective** from the objective card?
- Is the **first valid action** (pick a piggy, tap a matching lane) obvious?
- Do they understand the **holding pens** filling up?
- Do they know **how a level is won** (clear the board / reveal the picture)?
- After a **first loss**, does the reason make sense to them?
- Is the **world map** legible (locked vs. unlocked, chapters)?
- Do they find the **first rescue** without help?

## Questions afterward

1. What was the **goal** of the game?
2. What **confused** you?
3. Which part felt **best**?
4. Which **pig** do you remember?
5. What would make you **play again tomorrow**?
6. Was anything **too slow**?
7. Did anything feel **unfair**?
8. Would you **recommend** it to a friend?
9. Would you **download** it from an app store?

## After all sessions

- Collect each device's **Export report** JSON (PLAYTEST badge → Export report)
  and the **feedback** entries (included in the report).
- Compare per-level **completion rates** in the dashboard's Per-level table;
  levels highlighted red (`<40%` completion after ≥2 attempts) are the ones to
  rebalance.
- Note the **one-tap answers** to the quick check-ins (understood L1? clear why
  you lost? rescue rewarding? come back to Sanctuary? keep playing after L5?).

## Privacy

The report contains: app version, device category / viewport / browser family
(no full user-agent), settings, aggregated metrics, recent event names, feedback
text the player chose to write, and any captured errors. It contains **no**
name, email, location, contacts, advertising IDs, or credentials.
