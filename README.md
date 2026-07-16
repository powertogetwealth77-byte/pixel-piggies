# Pixel Piggies

A colorful, original color-matching launch puzzle. Choose a Piggy, choose a
lane, blast the matching pixel blocks, build combos, and reveal a hidden
picture — all while keeping your holding pens from overflowing. Restore the
Piggy Kingdom and rescue Mochi!

Built with **React + TypeScript + Vite**. No backend. All art (inline SVG /
CSS), sound (Web Audio synthesis), and levels are original and made from
scratch.

## Quick start

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
npm run typecheck
```

### Verification

```bash
npm run verify:levels   # prove all 15 levels are solvable (greedy solver)
npm run test:e2e        # browser E2E of the core loop (needs `npm run dev` running)
npm run test:campaign   # bot plays all 15 levels to a win through the real UI
```

The browser tests use `playwright-core`; if Chromium isn't auto-detected, point
`CHROMIUM_PATH` at a Chromium/Chrome binary.

## How to play (5 seconds)

1. **Choose a Piggy** in a holding pen.
2. **Choose a Lane** (tap one of the three columns).
3. **Blast matching pixels** — same-color blocks flood-clear and chain.
4. **Build a Combo** to raise the multiplier and fill the **Piggy Fever** meter.
5. **Reveal the picture** — clear every block to win.

Lose if the holding pens overflow (launch fast!). Win by clearing the board.

### The four Piggies

- **Pip** — Lane Drill: pops every pixel of his color in the lane, however deep.
- **Mochi** — Area Pop: bursts a 3×3 splash.
- **Blaze** — Combo Fire: color match that supercharges the combo.
- **Prism** — Wildcard: matches ANY color, once per level.

## Features

- 15 handcrafted, beatable levels with a gradual difficulty curve
- Three lanes, five pixel colors, chain reactions & combo multipliers
- Piggy Fever meter (10s of intensified play: stronger clears, x2 rewards, glow)
- Piggy queue + limited holding pens with real-time pressure
- Stars (1–3), coins, and Pigment currency
- First-Piggy rescue sequence (rescue Mochi after Level 5)
- Piggy Kingdom restoration (House, Bakery, Fountain) spent with Pigment
- Level selection, unlock progression, and local save (localStorage)
- Pause, restart, sound toggle, reduced-motion, and reset-progress controls
- Juicy feedback: squash/stretch piggies, particles, floating scores, screen
  shake on big hits, rising combo pitches, and haptics (`navigator.vibrate`)
- Responsive desktop + mobile layout with large touch targets
- **Developer tool**: Settings → "Verify levels solvable" runs an automated
  solver over every level and reports the results.

## Project structure

```
src/
  engine/       Game engine, types, and the level solver
  data/         Level definitions, piggy definitions, palette (pure data)
  audio/        Web Audio sound manager
  save/         localStorage save + progression system
  hooks/        useEngine real-time tick hook
  components/
    game/       GameScreen, Board, Pens (gameplay)
    kingdom/    Kingdom restoration screen
    screens/    Menu, level select, settings, rescue
    ui/         Reusable piggy avatar + stars
  index.css     Design system + all styling
```

Level and balance data live in `src/data/levels.ts` (pure data), fully separate
from rendering, so adding a level is just adding an entry.

## Notes

An earlier Godot prototype and an unrelated `Desktop/` folder were removed from
the working tree. Only `assets/` (original brand art) remains alongside the
Vite web app.

> ⚠️ **Security notice:** an unrelated project containing a `.env` file with
> Supabase credentials was previously committed to this repository. It has been
> deleted from the current tree, but **it still exists in git history**. Those
> Supabase keys must be treated as compromised and **rotated** in the Supabase
> dashboard. To purge them from history entirely, rewrite history (e.g.
> `git filter-repo --path Desktop --invert-paths`) and force-push, then have
> all collaborators re-clone.
