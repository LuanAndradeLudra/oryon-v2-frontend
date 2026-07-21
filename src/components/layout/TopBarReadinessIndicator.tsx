// ─── TopBar Readiness Indicator ──────────────────────────────────────────────
//
// Surfaces unmet workspace blockers in the topbar so the operator sees what's
// pending without the old full-width banner eating ~70px of chat surface on
// every page. Behavior is hybrid by issue count:
//
//   * 0 issues   → renders nothing.
//   * 1 issue    → renders a compact pill: `[⚠ Setor pendente · Criar setor →]`.
//                  Direct one-click access to the CTA, no extra interaction.
//   * 2+ issues  → renders an icon-button with a count badge (`[⚠ 3]`) that
//                  opens a dropdown listing every issue as a rounded card
//                  (label, description, CTA). Scales gracefully as the
//                  number of setup checks grows.
//
// The component is fail-soft — if the readiness fetch errors out, the hook
// returns an empty snapshot and this widget renders nothing. Same contract as
// the inline WorkspaceReadinessBanner it replaces (which still exists for the
// Home checklist mode).

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  unmetChecks,
  useWorkspaceReadiness,
  type WorkspaceCheck,
} from '@/hooks/useWorkspaceReadiness'

export function TopBarReadinessIndicator() {
  const { snapshot, loading } = useWorkspaceReadiness()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click. Same pattern used elsewhere in the topbar
  // (notifications, search). Mousedown rather than click so the dropdown
  // dismisses before the underlying button click can race.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (loading) return null
  const issues = unmetChecks(snapshot).filter((c) => c.severity === 'blocker')
  if (issues.length === 0) return null

  // ── Single issue → compact pill with inline CTA ─────────────────────────
  if (issues.length === 1) {
    const issue = issues[0]
    return (
      <div
        className="hidden md:inline-flex items-center gap-2 h-8 pl-2 pr-1 rounded-lg border max-w-[360px] color-chip"
        style={{ ['--chip']: 'var(--color-warning)' } as React.CSSProperties}
      >
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-[11px] font-medium truncate" title={issue.description}>
          {issue.label}
        </span>
        {issue.cta && (
          <Link
            to={issue.cta.href}
            className="inline-flex items-center gap-0.5 h-6 px-1.5 rounded-md text-[11px] font-semibold transition-colors flex-shrink-0 border border-white/25 bg-white/15 hover:bg-white/25"
          >
            {issue.cta.label}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    )
  }

  // ── Multiple issues → icon-button + dropdown ────────────────────────────
  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${issues.length} configurações pendentes`}
        aria-label={`${issues.length} configurações pendentes`}
        className={cn(
          'flex items-center gap-1.5 h-8 px-2 rounded-lg border transition-all color-chip',
          open ? 'brightness-110' : 'hover:brightness-110',
        )}
        style={{ ['--chip']: 'var(--color-warning)' } as React.CSSProperties}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold">{issues.length}</span>
      </button>

      {open && (
        <div className="overlay-scrim z-40" aria-hidden onMouseDown={() => setOpen(false)} />
      )}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[360px] overlay-surface border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h3 className="text-sm font-semibold text-surface-100">
                {issues.length} configurações pendentes
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Fechar"
              className="w-6 h-6 rounded-md flex items-center justify-center text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1.5">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} onAction={() => setOpen(false)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function IssueCard({ issue, onAction }: { issue: WorkspaceCheck; onAction: () => void }) {
  return (
    <div className="rounded-xl border border-surface-800 bg-surface-900/40 p-3 flex items-start gap-3">
      <span
        className="mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 color-chip border"
        style={{ ['--chip']: 'var(--color-warning)' } as React.CSSProperties}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug text-surface-200">{issue.label}</p>
        <p className="text-[11px] mt-0.5 leading-relaxed text-surface-500">{issue.description}</p>
        {issue.cta && (
          <Link
            to={issue.cta.href}
            onClick={onAction}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors border text-warning hover:text-white hover:bg-warning border-warning/40"
          >
            {issue.cta.label}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
