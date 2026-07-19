// Single source of truth for app + save versioning. Displayed in Settings and
// the Playtest Summary, and embedded in save exports and diagnostic reports.

/** Human-facing semantic version of the game. */
export const APP_VERSION = '1.4.0';

/**
 * Build identifier. Vite replaces `import.meta.env` at build time; we fall back
 * to a dev marker. Kept short and non-sensitive (a commit-style tag only).
 */
export const BUILD_ID: string =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string> }).env?.VITE_BUILD_ID) ||
  'dev';

/** Schema version of the localStorage save (see save.ts `version`). */
export const SAVE_SCHEMA_VERSION = 1;

/** A compact, non-sensitive version string for display. */
export const versionLabel = (): string => `v${APP_VERSION} · ${BUILD_ID}`;
