// ─── Color palette + contrast helpers ──────────────────────────────────────
//
// Single source of truth for the entity-color UX (tags, setores, estágios).
// Before this, four components each carried their own PRESET_COLORS array of
// ~12 hexes; they drifted apart over time. Consolidated here so the curated
// swatches AND the readable-text-color logic live in one place and every
// surface stays consistent.

/**
 * Curated swatches offered in the ColorPicker before the user reaches for
 * the freeform hex picker. Chosen for:
 *   • Distinguishable hues at a glance in a dense list (no two near-identical
 *     blues).
 *   • Reasonable contrast as a solid background with white OR black text
 *     (the picker pairs each with getReadableTextColor at render time).
 * Values are Tailwind-500/600 anchors so they sit naturally next to the rest
 * of the UI palette.
 */
export const CURATED_PALETTE: readonly string[] = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#22c55e', // green
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#64748b', // slate
]

/** Default applied when no color is chosen — matches the historical
 *  `#6366f1` default the backend entities use. */
export const DEFAULT_ENTITY_COLOR = '#6366f1'

const HEX_RE = /^#[0-9a-f]{6}$/i

/** True for a strict `#rrggbb` string. Rejects shorthand (#abc), alpha
 *  (#rrggbbaa) and named colors — the backend column is varchar(7) so we
 *  keep the contract tight on the way in. */
export function isValidHex(value: string | null | undefined): boolean {
  return typeof value === 'string' && HEX_RE.test(value.trim())
}

/**
 * Pick black or white text for maximum legibility on top of `hex`, using the
 * perceptual luminance formula (ITU-R BT.601 weights). Returns '#ffffff' for
 * dark backgrounds, '#111111' for light ones. Falls back to white for any
 * malformed input so a bad value never throws in render.
 *
 * Threshold 0.6 (not 0.5) biases slightly toward black text, which reads
 * better on mid-tone brand colors like amber/lime where pure-white text
 * tends to glare.
 */
export function getReadableTextColor(hex: string | null | undefined): '#ffffff' | '#111111' {
  if (!isValidHex(hex)) return '#ffffff'
  const h = (hex as string).trim()
  const r = parseInt(h.slice(1, 3), 16) / 255
  const g = parseInt(h.slice(3, 5), 16) / 255
  const b = parseInt(h.slice(5, 7), 16) / 255
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 0.6 ? '#111111' : '#ffffff'
}

/** Normalise arbitrary user input toward a valid `#rrggbb`. Adds a leading
 *  `#`, lowercases, and returns the fallback when it still doesn't match.
 *  Used by the manual hex input so a paste of "6366F1" or "#6366f1 " works. */
export function normalizeHex(value: string, fallback = DEFAULT_ENTITY_COLOR): string {
  let v = value.trim().toLowerCase()
  if (v && !v.startsWith('#')) v = `#${v}`
  return isValidHex(v) ? v : fallback
}
