// ─── Skill Status Badges ───────────────────────────────────────────────────
// Standard chip set for a skill row: enabled state, mutates flag, and the
// "template was disabled by Oryon" warning. Wrapped here so the look stays
// identical between the customer Skills tab, the admin assign flow, and
// (eventually) anywhere else we surface a skill instance.

import { ShieldAlert, AlertTriangle } from 'lucide-react'

interface Props {
  /** Per-instance toggle (agent_skills.enabled). */
  enabled: boolean
  /** Skill mutates external data (template.mutates). */
  mutates: boolean
  /** When false, the underlying template was disabled by Oryon — shown as
   *  a warning so the customer understands why the toggle is locked. */
  templateEnabled?: boolean
  /** Hide the enabled/paused chip (some surfaces show it via a Switch). */
  hideStateChip?: boolean
}

export function SkillStatusBadge({
  enabled,
  mutates,
  templateEnabled = true,
  hideStateChip = false,
}: Props) {
  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {!hideStateChip && (
        <Chip tone={enabled ? 'success' : 'muted'}>
          {enabled ? 'ativa' : 'pausada'}
        </Chip>
      )}
      {mutates && (
        <Chip tone="warning" icon={<ShieldAlert className="w-2.5 h-2.5" />}>
          destrutiva
        </Chip>
      )}
      {!templateEnabled && (
        <Chip tone="danger" icon={<AlertTriangle className="w-2.5 h-2.5" />}>
          desabilitada pela Oryon
        </Chip>
      )}
    </div>
  )
}

// ─── Internals ─────────────────────────────────────────────────────────────

type Tone = 'success' | 'muted' | 'warning' | 'danger'

// Cor "cheia" via --chip. O tom `muted` permanece neutro (surface).
const TONE_CHIP: Partial<Record<Tone, string>> = {
  success: 'var(--color-status-active)',
  warning: 'var(--color-status-pending)',
  danger:  'var(--color-danger)',
}

function Chip({
  tone,
  icon,
  children,
}: {
  tone: Tone
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  if (tone === 'muted') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-medium ring-1 bg-surface-800 text-surface-400 ring-surface-700">
        {icon}
        {children}
      </span>
    )
  }
  return (
    <span
      className="color-chip inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-medium border"
      style={{ ['--chip']: TONE_CHIP[tone] } as React.CSSProperties}
    >
      {icon}
      {children}
    </span>
  )
}
