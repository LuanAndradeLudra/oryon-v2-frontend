// ─── Category Icon (Skills) ────────────────────────────────────────────────
// Maps a skill template's `category` field to a lucide icon, rendered inside
// a neutral circle. Used by both the customer-facing SkillsTab and the
// admin-facing template list / assign / pills, so categories feel consistent
// across the product. Colour stays mono on purpose — Oryon's design system
// is grayscale; differentiation comes from the icon shape itself.

import {
  Stethoscope, Users, Calendar, Sparkles, CreditCard, ShoppingCart,
  LayoutGrid, ClipboardList, KanbanSquare, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type SkillCategoryKey =
  | 'clinic' | 'crm' | 'calendar' | 'custom'
  // SCRUM-1071 — biblioteca de conectores (2026-09-14): categorias além do
  // universo original de Skills (clinic/crm/calendar/custom).
  | 'payments' | 'ecommerce' | 'productivity' | 'forms' | 'tasks'
  | string

const ICON_MAP: Record<string, LucideIcon> = {
  clinic:       Stethoscope,
  crm:          Users,
  calendar:     Calendar,
  custom:       Sparkles,
  payments:     CreditCard,
  ecommerce:    ShoppingCart,
  productivity: LayoutGrid,
  forms:        ClipboardList,
  tasks:        KanbanSquare,
}

/** Resolve the icon component for a category key, with Sparkles as the
 *  fall-back so unknown categories still render something sensible. */
export function getCategoryIcon(category: SkillCategoryKey): LucideIcon {
  return ICON_MAP[category] ?? Sparkles
}

/** Accent color per category — used ONLY by the connector catalog's logo
 *  fallback chip (ConnectorLogo), never by the grayscale Skills UI
 *  elsewhere. The catalog intentionally breaks from the app's usual
 *  grayscale-only rule (P: differentiation via icon shape) because it shows
 *  real brand logos, which are inherently colorful — a monochrome fallback
 *  chip needs a matching splash of color to not look broken next to them. */
const ACCENT_MAP: Record<string, string> = {
  clinic:       'var(--color-accent-cyan)',
  crm:          'var(--color-accent-blue)',
  calendar:     'var(--color-accent-amber)',
  payments:     'var(--color-accent-green)',
  ecommerce:    'var(--color-accent-rose)',
  productivity: 'var(--color-accent-violet)',
  forms:        'var(--color-accent-blue)',
  tasks:        'var(--color-accent-violet)',
}

export function getCategoryAccent(category: SkillCategoryKey): string {
  return ACCENT_MAP[category] ?? 'var(--color-accent-cyan)'
}

interface Props {
  category: SkillCategoryKey
  /** `active`/`muted` are the original grayscale tones (Skills UI).
   *  `accent` is SCRUM-1071's connector-catalog-only addition — a soft
   *  category-colored chip, used as the fallback when a connector has no
   *  real logo (or its logo fails to load). Never used by the Skills UI. */
  tone?: 'active' | 'muted' | 'accent'
  /** Outer circle diameter in px. Icon scales to ~50% of this. */
  size?: number
  className?: string
}

export function CategoryIcon({
  category,
  tone = 'muted',
  size = 40,
  className,
}: Props) {
  const Icon = getCategoryIcon(category)
  const iconSize = Math.round(size * 0.5)
  const accent = tone === 'accent' ? getCategoryAccent(category) : undefined
  return (
    <div
      style={accent ? { width: size, height: size, color: accent, backgroundColor: 'color-mix(in srgb, currentColor 14%, transparent)' } : { width: size, height: size }}
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 ring-1',
        tone === 'active' && 'bg-surface-800 ring-surface-700 text-surface-100',
        tone === 'muted' && 'bg-surface-900 ring-surface-800 text-surface-500',
        tone === 'accent' && 'ring-transparent',
        className,
      )}
    >
      <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={1.75} />
    </div>
  )
}
