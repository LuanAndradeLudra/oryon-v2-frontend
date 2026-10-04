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
import { LinkComVolta } from '@/components/ui/LinkComVolta'
import { AlertTriangle, AlertCircle, CheckCircle, ChevronRight, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Banner } from '@/components/ui/Banner'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
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
          {/* Eixo 10: sem cor fixa — Banner é suave (12% da cor semântica) e
              currentColor herda o --chip do próprio Banner; border-white/
              bg-white/text-white ficavam sem contraste nenhum sobre um fundo
              quase transparente no claro (mesma família do achado em
              Departments.tsx). */}
          {primary.cta && (
            <LinkComVolta
              to={primary.cta.href}
              className="inline-flex items-center gap-1 text-[11px] font-semibold border border-current/25 bg-current/10 hover:bg-current/20 text-current px-2.5 py-1 rounded-md transition-colors"
            >
              {primary.cta.label}
              <ChevronRight className="w-3 h-3" />
            </LinkComVolta>
          )}
          {remaining > 0 && (
            <Link
              to="/home"
              className="text-[11px] text-current opacity-80 hover:opacity-100 underline underline-offset-2"
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
  // Revisão final 04/10: os passos (criar setor, conectar agente, funil) são
  // de administrador. O atendente via botões que levavam a telas que ele não
  // abre — agora vê a lista como informação, sem ação.
  const { user } = useAuth()
  const podeAgir = isAdminTier(user?.role)
  const blockers = checks.filter((c) => c.severity === 'blocker')
  const warnings = checks.filter((c) => c.severity === 'warning')
  const hasBlockers = blockers.length > 0

  // Contraste 01/10: o título contava só os obrigatórios ("Faltam 1 passo")
  // enquanto a lista mostrava também os recomendados.
  const plural = (n: number, um: string, varios: string) => `${n} ${n > 1 ? varios : um}`
  const title = hasBlockers
    ? `Falta${blockers.length > 1 ? 'm' : ''} ${plural(blockers.length, 'passo obrigatório', 'passos obrigatórios')}${
        warnings.length > 0 ? ` e ${plural(warnings.length, 'recomendado', 'recomendados')}` : ''}`
    : `${warnings.length} sugest${warnings.length > 1 ? 'ões' : 'ão'} pendente${warnings.length > 1 ? 's' : ''}`
  const description = !podeAgir
    ? 'Peça a um administrador da empresa para concluir estes passos.'
    : hasBlockers
      ? 'Resolva os itens abaixo para destravar o uso completo do CRM.'
      : 'Estes itens não bloqueiam o uso, mas melhoram a experiência.'
  const list = (
    <ul className="space-y-2 mt-3">
      {[...blockers, ...warnings].map((c) => (
        <ChecklistItem key={c.id} check={c} podeAgir={podeAgir} />
      ))}
    </ul>
  )

  // Fundo neutro nos dois casos — só o ícone e a borda carregam o acento de
  // cor (danger/neutro). Um card cheio de vermelho sólido pra um checklist de
  // setup rotineiro é saturação demais; cada item já tem seu próprio chip de
  // severidade, que basta como sinal.
  return (
    <div
      className={cn(
        'rounded-lg border p-5 bg-[#1A2424] border-[#2E4040]',
        // PO 01/10 (2G, bordas só neutras): cinza-azulado + borda cinza (claro).
        '[[data-theme=light]_&]:bg-[#F1F5F9] [[data-theme=light]_&]:border-[#CBD5E1]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Claro (2G): guia de configuração, não erro — lista em quadrado teal sólido. */}
        <span className="flex w-9 h-9 rounded-lg items-center justify-center flex-shrink-0 bg-[#0F766E] text-white">
          <ClipboardList className="w-5 h-5" />
        </span>
        {hasBlockers ? (
          <span
            className="hidden w-9 h-9 rounded-lg items-center justify-center flex-shrink-0 color-chip-soft border"
            style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
          >
            <AlertTriangle className="w-5 h-5" />
          </span>
        ) : (
          <div className="hidden w-9 h-9 rounded-lg items-center justify-center flex-shrink-0 bg-surface-800 text-surface-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-surface-100">{title}</h3>
          <p className="text-xs text-surface-400 mt-0.5">{description}</p>
        </div>
      </div>
      {list}
    </div>
  )
}

function ChecklistItem({ check, podeAgir = true }: { check: WorkspaceCheck; podeAgir?: boolean }) {
  const isBlocker = check.severity === 'blocker'
  return (
    // Eixo 10: surface-900 no claro é quase idêntico ao branco do card por
    // trás (bg-surface-800) — a 40% de opacidade a linha some. --sf2 tem
    // valor dedicado nos dois temas.
    <li className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-surface-800 border border-[#2E4040] [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:border-[#C9CFDA]">
      <span
        className="hidden mt-0.5 w-5 h-5 rounded items-center justify-center flex-shrink-0 color-chip border"
        style={{ ['--chip']: isBlocker ? 'var(--color-danger)' : 'var(--color-warning)' } as React.CSSProperties}
      >
        {isBlocker ? <AlertTriangle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-surface-200 flex items-center gap-2 flex-wrap">
          {check.label}
          {/* Claro (4D): selo neutro + ponto na cor da severidade. */}
          <span className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded-[5px] border border-[#3A4D4D] bg-surface-900 text-[10.5px] font-semibold text-surface-200 [[data-theme=light]_&]:border-[#C9CFDA] [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-[#1F2937]">
            <span aria-hidden className={cn('w-1.5 h-1.5 rounded-full', isBlocker ? 'bg-[#DC2626]' : 'bg-[#F59E0B]')} />
            {isBlocker ? 'Obrigatório' : 'Recomendado'}
          </span>
        </p>
        <p className="text-[11px] text-surface-500 mt-0.5">{check.description}</p>
      </div>
      {check.cta && podeAgir && (
        <LinkComVolta
          to={check.cta.href}
          className={cn(
            'flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors border',
            isBlocker
              ? 'bg-[linear-gradient(135deg,#0F766E_0%,#134E4A_100%)] border-transparent [background-origin:border-box] text-white hover:bg-[linear-gradient(135deg,#115E59_0%,#0B3B38_100%)] [[data-theme=light]_&]:bg-[linear-gradient(135deg,#0F766E_0%,#134E4A_100%)] [[data-theme=light]_&]:border-transparent [[data-theme=light]_&]:[background-origin:border-box] [[data-theme=light]_&]:text-white [[data-theme=light]_&]:hover:bg-[linear-gradient(135deg,#115E59_0%,#0B3B38_100%)]'
              : 'text-surface-200 hover:text-surface-100 bg-surface-900 hover:bg-surface-700 border-[#3A4D4D] [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:border-[#C9CFDA] [[data-theme=light]_&]:text-[#1F2937] [[data-theme=light]_&]:hover:bg-[#F1F5F9]',
          )}
        >
          {check.cta.label}
          <ChevronRight className="w-3 h-3" />
        </LinkComVolta>
      )}
    </li>
  )
}
