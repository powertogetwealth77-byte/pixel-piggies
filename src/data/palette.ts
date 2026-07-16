import type { ColorId } from '../engine/types';

/** The five playable pixel colors (block colors). */
export const BLOCK_COLORS: Record<ColorId, { base: string; light: string; dark: string; label: string }> = {
  coral: { base: '#ff6478', light: '#ff96a5', dark: '#d43f56', label: 'Coral' },
  sunny: { base: '#ffc83d', light: '#ffe08a', dark: '#e0a01f', label: 'Sunny' },
  mint: { base: '#57d99a', light: '#8ff0c0', dark: '#2fae72', label: 'Mint' },
  sky: { base: '#4bb8f0', light: '#8fd6fa', dark: '#2a90cc', label: 'Sky' },
  grape: { base: '#9d7bff', light: '#c4b0ff', dark: '#734fd4', label: 'Grape' },
};

/** Char -> block color for level parsing. */
export const BLOCK_CHAR: Record<string, ColorId> = {
  c: 'coral',
  s: 'sunny',
  m: 'mint',
  b: 'sky',
  g: 'grape',
};

/**
 * Color-blind support: a distinct symbol per block color, shown when the
 * "color symbols" accessibility setting is enabled.
 */
export const COLOR_SYMBOLS: Record<ColorId, string> = {
  coral: '♥',
  sunny: '★',
  mint: '▲',
  sky: '●',
  grape: '◆',
};

/** Extended palette used only for revealed hidden pictures. */
export const PICTURE_CHAR: Record<string, string> = {
  '.': 'transparent',
  c: '#ff6478',
  s: '#ffc83d',
  m: '#57d99a',
  b: '#4bb8f0',
  g: '#9d7bff',
  w: '#fff7ef', // white
  k: '#2b2144', // navy
  o: '#ff9d4d', // orange
  p: '#ffb3d1', // pink
  r: '#e8465e', // red
  n: '#7a5230', // brown
  l: '#bff0ff', // pale
  e: '#ffe9a8', // cream
};
