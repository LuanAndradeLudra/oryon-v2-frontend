// ─── AI Credits Indicator ────────────────────────────────────────────────────
// Rodapé da NavSidebar (SCRUM-1100 · handoff 3.12 "Consumo sempre visível").
// Configurações e avatar saíram da sidebar (foram para o menu do usuário na
// TopBar — ver TopBar.tsx); o rodapé agora é só isto: o anel de consumo de
// créditos de IA, sempre visível, sem precisar entrar em Configurações.
//
// Dado real: `useCreditGate`/`useBilling` (src/hooks/usePlanGate.ts e
// useBilling.ts) já leem o snapshot de billing do backend
// (GET /settings/billing) — a mesma fonte usada pelo gate de crédito do
// Copilot e pela aba Plano & Faturamento. Não há mock aqui: se o backend não
// tiver snapshot (erro/indisponível), mostramos um estado neutro em vez de
// inventar números.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/ui/sidebar'
import { useLayer } from '@/contexts/LayerContext'
import { useBilling } from '@/hooks/useBilling'
import { useCreditGate } from '@/hooks/usePlanGate'
import { formatCredits } from '@/config/plans'

// Cores literais do handoff (3.12) — não são os tokens semânticos
// --color-warning/--color-danger de uso geral (que têm outros valores no
// design system): a "faixa amber" pedida aqui é especificamente #FBBF24.
// Mesmo hardcode intencional que a sidebar já faz para o item ativo.
const ACCENT = '#2DD4BF'
const AMBER = '#FBBF24'
const DANGER = '#EF4444'
const TRACK_COLOR = '#243333'

// r=9 ⇒ circunferência 2πr ≈ 56.5 (valor exato do handoff).
const RING_R = 9
const RING_CIRC = 56.5

function tierColor(pct: number): string {
  // Mesma semântica de risco do ProgressBar (src/components/ui/ProgressBar.tsx):
  // >=90% perigo, >=70% aviso, abaixo disso ok — só a paleta muda aqui.
  if (pct >= 0.9) return DANGER
  if (pct >= 0.7) return AMBER
  return ACCENT
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.round(ms / 86_400_000))
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
/** "01 out" — data de renovação como no canvas 6b. */
function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`
}

/** Anel de progresso — mesma geometria em qualquer tamanho: o SVG usa sempre
 *  o viewBox 24x24 do handoff (r=9, stroke-width=2.5, dasharray=56.5) e só o
 *  `width`/`height` renderizado muda (24 colapsada, 22 expandida, 36 popover),
 *  o que escala o desenho inteiro sem recalcular a matemática do arco. */
function CreditRing({ size, pct, color, track = TRACK_COLOR }: { size: number; pct: number; color: string; track?: string }) {
  const offset = RING_CIRC * (1 - Math.min(1, Math.max(0, pct)))
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden>
      <circle cx="12" cy="12" r={RING_R} fill="none" stroke={track} strokeWidth={2.5} />
      <circle
        cx="12"
        cy="12"
        r={RING_R}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={RING_CIRC}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
        style={{ transition: 'stroke-dashoffset 400ms ease-out, stroke 200ms ease-out' }}
      />
    </svg>
  )
}

export function AiCreditsIndicator() {
  const { open, animate } = useSidebar()
  const navigate = useNavigate()
  const { billing } = useBilling()
  const { used, total, percentUsed, loading } = useCreditGate()
  const prefersReducedMotion = useReducedMotion()

  const expanded = !animate || open

  const [hovered, setHovered] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)

  const close = useCallback(() => setHovered(false), [])
  const { zIndex } = useLayer(hovered, close)

  const pct = (percentUsed ?? 0) / 100
  const color = tierColor(pct)
  const pctLabel = Math.round(pct * 100)
  const days = daysUntil(billing?.planResetsAt)

  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setHovered(false), 150)
  }
  const handleEnter = () => {
    cancelClose()
    const el = anchorRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      const popoverWidth = 300
      const margin = 12
      setPos({
        left: Math.min(rect.left, window.innerWidth - popoverWidth - margin),
        bottom: window.innerHeight - rect.top + 8,
      })
    }
    setHovered(true)
  }

  useEffect(() => () => cancelClose(), [])

  const goBilling = () => {
    setHovered(false)
    navigate('/settings/billing')
  }

  // Sem snapshot de billing ainda (nem em cache) — nem carregando, nem com
  // dado: falha do backend. Mostra um estado neutro (sem inventar número),
  // mas mantém o layout do rodapé estável.
  const noData = !billing && !loading

  return (
    <div
      className="relative mt-1"
      onMouseEnter={handleEnter}
      onMouseLeave={scheduleClose}
    >
      {/* SHELL-SIDEBAR-04/09: expandida = hairline largura total + pt 8;
          colapsada = traço 20×1 centrado. */}
      <div className={expanded ? 'mb-2 border-t border-surface-700' : 'w-5 h-px mx-auto mb-2 bg-surface-700'} />

      <button
        ref={anchorRef}
        type="button"
        onClick={goBilling}
        disabled={noData}
        aria-label={noData ? 'Créditos de IA indisponíveis' : `Créditos de IA: ${pctLabel}% usados`}
        className={cn(
          // SHELL-CREDITS-01/02: raio 6 e fundo .06 em REPOUSO (não só no hover).
          'w-full flex items-center gap-2.5 mx-1.5 rounded-[6px] transition-colors text-left',
          'bg-white/[0.06] hover:bg-white/[0.1] disabled:cursor-default disabled:bg-transparent disabled:hover:bg-transparent',
          expanded ? 'h-10 px-2' : 'h-9 px-2 justify-center mx-auto',
        )}
        style={{ width: expanded ? 'calc(100% - 12px)' : 36 }}
      >
        {loading && !billing ? (
          <span
            className="rounded-full bg-white/10 animate-pulse flex-shrink-0"
            style={{ width: expanded ? 22 : 24, height: expanded ? 22 : 24 }}
          />
        ) : (
          <CreditRing size={expanded ? 22 : 24} pct={noData ? 0 : pct} color={noData ? '#4B5D5D' : color} />
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col min-w-0 overflow-hidden flex-1"
            >
              <span className="text-xs font-semibold text-white truncate whitespace-pre">
                Créditos de IA
              </span>
              {/* Canvas 6b (3 faixas): <70% "renova em N d" (tx3); >=70% âmbar "acaba
                  antes do ciclo"; >=90% vermelho "agentes pausam em N" + "Comprar". */}
              <span
                className="text-[10.5px] text-surface-500 truncate whitespace-pre"
                style={!noData && pct >= 0.7 ? { color } : undefined}
              >
                {noData
                  ? 'Indisponível'
                  : `${formatCredits(used)} / ${total ? formatCredits(total) : '∞'}${
                      pct >= 0.9
                        ? days !== null ? ` · agentes pausam em ${days}` : ' · no limite'
                        : pct >= 0.7
                          ? ' · acaba antes do ciclo'
                          : days !== null ? ` · renova em ${days} d` : ''
                    }`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {expanded && !noData && pct >= 0.9 && (
          <span className="text-[10.5px] font-bold flex-shrink-0" style={{ color: ACCENT }}>Comprar</span>
        )}
      </button>

      {hovered && pos && !noData && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none' }}>
          <motion.div
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            style={{ position: 'fixed', left: pos.left, bottom: pos.bottom, width: 300, pointerEvents: 'auto' }}
            className="overlay-surface border rounded-lg p-3.5 flex flex-col gap-2.5 text-[12.5px]"
          >
            {/* Canvas 6b: coluna única, padding 14, gap 10, 12.5px. Anel 36 com trilha --bd. */}
            <div className="flex items-center gap-2.5">
              <CreditRing size={36} pct={pct} color={pct >= 0.9 ? 'var(--color-danger)' : pct >= 0.7 ? 'var(--color-warning)' : 'var(--color-brand-500)'} track="var(--bd)" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-surface-100 truncate">
                  Créditos de IA{billing?.plan.displayName ? ` · ${billing.plan.displayName}` : ''}
                </p>
                <p className="text-surface-400">
                  {days !== null
                    ? `Renova em ${days} ${days === 1 ? 'dia' : 'dias'}${shortDate(billing?.planResetsAt) ? ` · ${shortDate(billing?.planResetsAt)}` : ''}`
                    : 'Ciclo em andamento'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {/* Canvas 6b: o % não tem cor própria (usa --tx); cor só nas faixas de risco,
                    por token — o hex da sidebar (sempre escura) não serve no popover claro. */}
                <div className={cn(
                  'text-base font-extrabold tabular-nums tracking-[-0.02em] leading-[1.1]',
                  pct >= 0.9 ? 'text-danger' : pct >= 0.7 ? 'text-warning' : 'text-surface-100',
                )}>
                  {pctLabel}%
                </div>
                <div className="text-2xs text-surface-500">usado</div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 pt-2 border-t border-surface-700 tabular-nums">
              <span className="text-surface-400">Usados</span>
              <span className="font-semibold text-surface-100 text-right">{formatCredits(used)}</span>
              <span className="text-surface-400">Disponíveis</span>
              <span className="font-semibold text-surface-100 text-right">
                {total ? formatCredits(Math.max(total - used, 0)) : '∞'}
              </span>
              <span className="text-surface-400">Ritmo</span>
              {/* Ritmo: aproximação (usados ÷ dias já passados de um ciclo
                  assumido de 30 dias) — o backend expõe só a data de
                  RENOVAÇÃO (planResetsAt), não a de início do ciclo. "sobra" /
                  "acaba antes" vem da projeção desse mesmo ritmo até a renovação. */}
              <span className="font-semibold text-surface-100 text-right">
                {days !== null ? (() => {
                  const rate = used / Math.max(1, 30 - days)
                  const fits = !total || used + rate * days <= total
                  return (
                    <>
                      {`≈ ${rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/dia `}
                      <span className={fits ? 'text-success' : 'text-warning'}>{fits ? '· sobra' : '· acaba antes'}</span>
                    </>
                  )
                })() : '—'}
              </span>
            </div>

            <div className="flex gap-1.5 pt-2 border-t border-surface-700">
              <button
                type="button"
                onClick={goBilling}
                className="inline-flex items-center h-[26px] px-[9px] rounded-[6px] border border-[var(--bd2)] text-[11.5px] font-semibold text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
              >
                Ver faturamento
              </button>
              <button
                type="button"
                onClick={goBilling}
                className="inline-flex items-center h-[26px] px-[9px] rounded-[6px] text-[11.5px] font-semibold text-accent-dark hover:bg-[var(--rowhover)] transition-colors"
              >
                Comprar créditos
              </button>
            </div>
          </motion.div>
        </div>,
        document.body,
      )}
    </div>
  )
}
