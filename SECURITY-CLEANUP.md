# Security Cleanup — Pixel Piggies

_Last audited: release-hardening sprint. No secret values appear in this file._

## Summary of findings

- **Working tree:** clean. No Supabase keys, tokens, or credentials exist in any
  tracked source, config, or build file. Pixel Piggies has **no backend** and
  makes **no network calls** — it does not use Supabase at all.
- **Git history:** a single unrelated project directory
  (`Desktop/…/scripture-dreams-main/.env`) was committed once (added in
  `30a98fd`, deleted in `59fd8b5`). It contained only these variable **names**:
  - `SUPABASE_URL`, `VITE_SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
- **Key classification:** these are the **publishable / anon** client key and the
  project URL/ID. A Supabase *publishable/anon* key is **designed to be exposed**
  in client apps and is protected by Row-Level Security (RLS). **No
  `service_role` or other privileged secret was ever committed.**
- **Production bundle:** verified — the built `dist/` contains no Supabase
  strings, no JWT-shaped tokens, and no credentials.

## Release-blocker status

**Not a privileged-secret release blocker for Pixel Piggies.** No service-role
or private key was exposed, and the game does not depend on the leaked values.
The item below is **hygiene**, and it concerns the *other* (scripture-dreams)
project that owns those keys.

## Remediation steps

Perform these for the **scripture-dreams** project that owns the keys (Pixel
Piggies itself needs none of them):

1. **Rotate credentials.** In the Supabase dashboard for that project, rotate
   the anon/publishable key as good hygiene (it was committed unintentionally).
   There is no service-role key to rotate here — if one exists elsewhere, rotate
   it immediately.
2. **Confirm RLS.** Ensure Row-Level Security is enabled and correctly scoped on
   every table, since the anon key is public by design.
3. **Use environment variables.** Keep all keys in `.env` (git-ignored) and read
   them via `import.meta.env` — never inline them in source.
4. **Update deployment config** with the rotated key.
5. **Purge from git history** (optional for a public anon key, recommended for
   cleanliness):
   ```bash
   # Back up first, then rewrite history to drop the whole Desktop/ import:
   git clone --mirror <repo> repo-backup.git
   git filter-repo --path "Desktop/" --invert-paths
   ```
6. **Force-push only after a backup** and after coordinating with collaborators
   (everyone must re-clone). For this repo the branch is
   `claude/pixel-piggies-game-v2oew5`.
7. **Invalidate old credentials** once deployments use the rotated key.
8. **Run a secret scanner** before/after (e.g. `gitleaks detect` or
   `trufflehog git file://.`).
9. **Verify the production bundle** has no secret:
   ```bash
   npm run build && grep -RniE "supabase|service_role|eyJ[A-Za-z0-9_-]{10}" dist/ || echo "clean"
   ```
10. **Document key exposure policy.**

## Which keys are safe to expose

- ✅ **Supabase anon / publishable key** — safe to ship in a client bundle **when
  RLS is enabled**. It only permits what RLS policies allow.
- ✅ **Supabase project URL / project ID** — public identifiers.
- ❌ **`service_role` key** — **never** expose; it bypasses RLS. (None is present
  in this repository's history.)
- ❌ Database connection strings, JWT signing secrets, API secrets — never
  expose. (None present.)

## Pixel Piggies specifics

- No Supabase client, no `.env`, no network calls in the working tree.
- Telemetry, feedback, and diagnostics are **local-only** (localStorage) and
  contain no personal data — see the privacy notes in `src/playtest/playtest.ts`.
- Diagnostic exports are filtered and unit-tested to exclude secret-shaped
  strings and the full user-agent (`devcheck.ts` → "LIVING SANCTUARY" block).
