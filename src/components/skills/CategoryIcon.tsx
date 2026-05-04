// ─── Category Icon (Skills) ────────────────────────────────────────────────
// Maps a skill template's `category` field to a lucide icon, rendered inside
// a neutral circle. Used by both the customer-facing SkillsTab and the
// admin-facing template list / assign / pills, so categories feel consistent
// across the product. Colour stays mono on purpose — Oryon's design system
// is grayscale; differentiation comes from the icon shape itself.

import { Stethoscope, Users, Calendar, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SkillCategoryKey = 'clinic' | 'crm' | 'calendar' | 'custom' | string

const ICON_MAP: Record<string, LucideIcon> = {
  clinic:   Stethoscope,
  crm:      Users,
  calendar: Calendar,
  custom:   Sparkles,
}

/** Resolve the icon component for a category key, with Sparkles as the
 *  fall-back so unknown categories still render something sensible. */
export function getCategoryIcon(category: SkillCategoryKey): LucideIcon {
  return ICON_MAP[category] ?? Sparkles
}

interface Props {
  category: SkillCategoryKey
  /** `active` highlights the icon (used when the skill is enabled). */
  tone?: 'active' | 'muted'
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
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 ring-1',
        tone === 'active'
          ? 'bg-surface-800 ring-surface-700 text-surface-100'
          : 'bg-surface-900 ring-surface-800 text-surface-500',
        className,
      )}
    >
      <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={1.75} />
    </div>
  )
}
