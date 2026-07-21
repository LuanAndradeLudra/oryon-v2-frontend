// ─── Workspace Readiness Banner (Phase 29) ───────────────────────────────────
//
// Two visual modes:
//
//   1. **inline** (default) — compact banner shown above page content. Use
//      on operational pages (Conversations, Campaigns) to surface ONLY the
//      blockers that gate that page's flows. Auto-hides when nothing is
//      unmet.
//
//   2. **checklist** — expanded card listing every unmet check with CTAs.
//      Use on Home so the operator sees the full setup status in one
//      glance. Hides when allBlockersOk AND there are no warnings either.
//
// The component is fail-soft: if the readiness fetch fails, both modes
// render nothing — readiness is a nudge, not a hard gate.

import { Link } from 'react-router-dom'
import { AlertTriangle, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Banner } from '@/components/ui/Banner'
import {
  unmetBlockersAffecting,
  unmetChecks,
  useWorkspaceReadiness,
  type WorkspaceCheck,
  type WorkspaceCheckAffects,
} from '@/hooks/useWorkspaceReadiness'

interface InlineProps {
  mode?: 'inline'
  /** Show only blockers gating these flows. */
  flows: WorkspaceCheckAffects[]
  className?: string
}

interface ChecklistProps {
  mode: 'checklist'
  className?: string
}

type Props = InlineProps | ChecklistProps

export function WorkspaceReadinessBanner(props: Props) {
  const { snapshot, loading } = useWorkspaceReadiness()

  if (loading) return null

  if (props.mode === 'checklist') {
    const items = unmetChecks(snapshot)
    if (items.length === 0) return null
    return <ChecklistCard checks={items} className={props.className} />
  }

  const blockers = unmetBlockersAffecting(snapshot, props.flows)
  if (blockers.length === 0) return null
  return <InlineBanner checks={blockers} className={props.className} />
}

// ─── Inline (compact) ────────────────────────────────────────────────────────

function InlineBanner({ checks, className }: { checks: WorkspaceCheck[]; className?: string }) {
  // Surface the FIRST blocker prominently with its CTA. If multiple, show
  // a small "+N pendentes" hint linking to Home where the full checklist
  // lives. Avoids stacking 3 different banners that compete for attention.
  const primary = checks[0]
  const remaining = checks.length - 1

  return (
    <Banner
      variant="danger"
      className={cn('rounded-none border-x-0 border-t-0', className)}
      action={
        <div className="flex items-center gap-2">
          {primary.cta && (
            <Link
              to={primary.cta.href}
              className="inline-flex items-center gap-1 text-[11px] font-semibold border border-white/25 bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-md transition-colors"
            >
              {primary.cta.label}
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {remaining > 0 && (
            <Link
              to="/home"
              className="text-[11px] text-white/80 hover:text-white underline underline-offset-2"
              title="Ver lista completa de pendências na Home"
            >
              +{remaining} pendente{remaining > 1 ? 's' : ''}
            </Link>
          )}
        </div>
      }
    >
      <p className="text-xs font-semibold truncate">{primary.label}</p>
      <p className="text-[11px] opacity-90 line-clamp-2">{primary.description}</p>
    </Banner>
  )
}

// ─── Checklist (Home) ────────────────────────────────────────────────────────

function ChecklistCard({ checks, className }: { checks: WorkspaceCheck[]; className?: string }) {
  const blockers = checks.filter((c) => c.severity === 'blocker')
  const warnings = checks.filter((c) => c.severity === 'warning')
  const hasBlockers = blockers.length > 0

  const title = hasBlockers
    ? `Faltam ${blockers.length} passo${blockers.length > 1 ? 's' : ''} para sua plataforma estar 100%`
    : `${warnings.length} sugest${warnings.length > 1 ? 'ões' : 'ão'} pendente${warnings.length > 1 ? 's' : ''}`
  const description = hasBlockers
    ? 'Resolva os itens abaixo para destravar o uso completo do CRM.'
    : 'Estes itens não bloqueiam o uso, mas melhoram a experiência.'
  const list = (
    <ul className="space-y-2 mt-3">
      {[...blockers, ...warnings].map((c) => (
        <ChecklistItem key={c.id} check={c} />
      ))}
    </ul>
  )

  if (hasBlockers) {
    return (
      <Banner variant="danger" className={className}>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs opacity-90 mt-0.5">{description}</p>
        {list}
      </Banner>
    )
  }

  return (
    <div className={cn('rounded-xl border border-surface-700 bg-surface-900/40 p-5', className)}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface-800 text-surface-400">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-surface-100">{title}</h3>
          <p className="text-xs text-surface-400 mt-0.5">{description}</p>
        </div>
      </div>
      {list}
    </div>
  )
}

function ChecklistItem({ check }: { check: WorkspaceCheck }) {
  const isBlocker = check.severity === 'blocker'
  return (
    <li className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-surface-900/40 border border-surface-800">
      <span
        className="mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 color-chip border"
        style={{ ['--chip']: isBlocker ? 'var(--color-danger)' : 'var(--color-warning)' } as React.CSSProperties}
      >
        {isBlocker ? <AlertTriangle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-surface-200">{check.label}</p>
        <p className="text-[11px] text-surface-500 mt-0.5">{check.description}</p>
      </div>
      {check.cta && (
        <Link
          to={check.cta.href}
          className={cn(
            'flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors border',
            isBlocker
              ? 'text-danger hover:text-white hover:bg-danger border-danger/40'
              : 'text-surface-300 hover:text-white bg-surface-800 hover:bg-surface-700 border-surface-700',
          )}
        >
          {check.cta.label}
          <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </li>
  )
}
