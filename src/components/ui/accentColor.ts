// ─── Accent color map ──────────────────────────────────────────────────────
// Mapa compartilhado entre RingProgress, StackedBar e InsightCard: nome de
// acento categórico (mesmo `TabAccent` já usado por `ui/Tabs.tsx`) → valor de
// cor via CSS custom property, nunca hex cru (CARTA-DE-PADROES.md §7). Um
// `color'brand'` extra cobre os casos onde a cor deve ser a cor da marca em
// vez de uma categoria (ex.: anel "Resolvido pela IA", cartão "Sugestão da IA").
import type { TabAccent } from './Tabs'

export type Accent = TabAccent | 'brand'

const ACCENT_VAR: Record<Accent, string> = {
  brand:  'var(--color-brand-cta)',
  blue:   'var(--color-accent-blue)',
  green:  'var(--color-accent-green)',
  violet: 'var(--color-accent-violet)',
  amber:  'var(--color-accent-amber)',
  rose:   'var(--color-accent-rose)',
  cyan:   'var(--color-accent-cyan)',
}

export function accentColor(accent: Accent): string {
  return ACCENT_VAR[accent]
}

/** Tinta translúcida de uma cor de acento — mesmo padrão de `HandoffRuleBuilder.tsx` (`softTint`). */
export function tint(accent: Accent, pct: number): string {
  return `color-mix(in srgb, ${accentColor(accent)} ${pct}%, transparent)`
}
