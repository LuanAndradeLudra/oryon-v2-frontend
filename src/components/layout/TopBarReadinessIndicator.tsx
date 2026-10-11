// ─── TopBar Readiness Indicator ──────────────────────────────────────────────
//
// Surfaces unmet workspace blockers in the topbar so the operator sees what's
// pending without the old full-width banner eating ~70px of chat surface on
// every page. Behavior is hybrid by issue count:
//
//   * 0 issues   → renders nothing.
//   * 1+ issues  → icon-button like the bell (neutral icon + amber dot) that
//                  opens a dropdown listing every issue (label, description,
//                  CTA). PO 01/10: the colored pill was removed.
//
// The component is fail-soft — if the readiness fetch errors out, the hook
// returns an empty snapshot and this widget renders nothing. Same contract as
// the inline WorkspaceReadinessBanner it replaces (which still exists for the
// Home checklist mode).

import { useEffect, useRef, useState } from 'react'
import { LinkComVolta } from '@/components/ui/LinkComVolta'
import { AlertTriangle, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { topBarHoverProps, TopBarHoverBloom, TopBarHoverIcon } from './topBarHover'
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

  // PO 01/10: sem chip colorido — botão só de ícone, igual ao sino ao lado,
  // com um ponto âmbar de pendência. O clique abre a lista com o atalho.
  const rotulo = issues.length === 1 ? '1 configuração pendente' : `${issues.length} configurações pendentes`
  return (
    <div ref={wrapperRef} className="relative">
      <motion.button
        {...topBarHoverProps}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={rotulo}
        aria-label={rotulo}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'relative flex items-center justify-center w-7 h-7 rounded-[6px] text-surface-400 [html:not([data-theme=light])_&]:text-[#E3EBEB] hover:text-surface-200 transition-colors',
          open && 'text-surface-200',
        )}
      >
        {/* SCRUM-1253: hover animado (fundo floresce + pulo do alerta). */}
        <TopBarHoverBloom forceOn={open} />
        <TopBarHoverIcon fx="alert">
          <AlertTriangle className="w-4 h-4" />
        </TopBarHoverIcon>
        <span aria-hidden className="absolute top-1 right-1 w-[7px] h-[7px] rounded-full bg-[#F59E0B] ring-2 ring-[var(--color-topbar)]" />
      </motion.button>

      {open && (
        <div className="overlay-scrim z-40" aria-hidden onMouseDown={() => setOpen(false)} />
      )}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[360px] overlay-surface overlay-vidro border rounded-[10px] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-100">
                {rotulo}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Fechar"
              className="w-6 h-6 rounded-[6px] flex items-center justify-center text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors"
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
    <div className="rounded-[10px] border border-surface-700 bg-[var(--sf2)] p-3 flex items-start gap-3">
      <span aria-hidden className="mt-1.5 w-[7px] h-[7px] rounded-full bg-[#F59E0B] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug text-surface-200">{issue.label}</p>
        <p className="text-[11px] mt-0.5 leading-relaxed text-surface-500">{issue.description}</p>
        {issue.cta && (
          <LinkComVolta
            to={issue.cta.href}
            onClick={onAction}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-colors border bg-[#0F766E] bg-(image:--primario-img) shadow-(--primario-realce) border-transparent [background-origin:border-box] text-white hover:bg-[#115E59] hover:bg-(image:--primario-img-hover)"
          >
            {issue.cta.label}
            <ChevronRight className="w-3 h-3" />
          </LinkComVolta>
        )}
      </div>
    </div>
  )
}
