// ─── Skill Status Badges ───────────────────────────────────────────────────
// Standard chip set for a skill row: enabled state, mutates flag, and the
// "template was disabled by Oryon" warning. Wrapped here so the look stays
// identical between the customer Skills tab, the admin assign flow, and
// (eventually) anywhere else we surface a skill instance.

import { ShieldAlert, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-status-active-bg text-status-active ring-status-active-border',
  muted:   'bg-surface-800 text-surface-400 ring-surface-700',
  warning: 'bg-status-pending-bg text-status-pending ring-status-pending-border',
  danger:  'bg-danger/10 text-danger ring-danger/30',
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
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-medium ring-1',
        TONE_CLASSES[tone],
      )}
    >
      {icon}
      {children}
    </span>
  )
}
