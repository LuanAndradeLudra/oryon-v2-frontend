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
import { Button } from '@/components/ui/Button'

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

/** Anel de progresso — mesma geometria em qualquer tamanho: o SVG usa sempre
 *  o viewBox 24x24 do handoff (r=9, stroke-width=2.5, dasharray=56.5) e só o
 *  `width`/`height` renderizado muda (24 colapsada, 22 expandida, 36 popover),
 *  o que escala o desenho inteiro sem recalcular a matemática do arco. */
function CreditRing({ size, pct, color }: { size: number; pct: number; color: string }) {
  const offset = RING_CIRC * (1 - Math.min(1, Math.max(0, pct)))
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden>
      <circle cx="12" cy="12" r={RING_R} fill="none" stroke={TRACK_COLOR} strokeWidth={2.5} />
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
      <div className="mx-3 mb-1.5 border-t border-surface-800/60" />

      <button
        ref={anchorRef}
        type="button"
        onClick={goBilling}
        disabled={noData}
        aria-label={noData ? 'Créditos de IA indisponíveis' : `Créditos de IA: ${pctLabel}% usados`}
        className={cn(
          'w-full flex items-center gap-2.5 mx-1.5 rounded-xl transition-colors text-left',
          'hover:bg-white/[0.06] disabled:cursor-default disabled:hover:bg-transparent',
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
              <span className="text-[10.5px] text-surface-500 truncate whitespace-pre">
                {noData
                  ? 'Indisponível'
                  : `${formatCredits(used)} / ${total ? formatCredits(total) : '∞'}${days !== null ? ` · renova em ${days} d` : ''}`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
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
            className="overlay-surface border rounded-lg overflow-hidden"
          >
            <div className="p-3.5 flex items-center gap-3 border-b border-surface-800">
              <CreditRing size={36} pct={pct} color={color} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-surface-100 truncate">
                  Créditos de IA{billing?.plan.displayName ? ` · ${billing.plan.displayName}` : ''}
                </p>
                <p className="text-2xs text-surface-500">
                  {days !== null ? `Renova em ${days} ${days === 1 ? 'dia' : 'dias'}` : 'Ciclo em andamento'}
                </p>
              </div>
              <span className="text-base font-extrabold tabular-nums flex-shrink-0" style={{ color }}>
                {pctLabel}%
              </span>
            </div>

            {pct >= 0.7 && (
              <div
                className={cn(
                  'px-3.5 py-2 text-2xs font-medium flex items-center gap-2',
                  pct >= 0.9 ? 'text-danger bg-danger/10' : 'text-warning bg-warning/10',
                )}
              >
                <span className="flex-1">
                  {pct >= 0.9
                    ? days !== null
                      ? `Agentes pausam em ${days} ${days === 1 ? 'dia' : 'dias'}`
                      : 'Créditos no limite — agentes serão pausados'
                    : 'Acaba antes do ciclo'}
                </span>
                {pct >= 0.9 && (
                  <button type="button" onClick={goBilling} className="underline font-semibold flex-shrink-0">
                    Comprar
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 px-3.5 py-3 text-center border-b border-surface-800">
              <div>
                <p className="text-xs font-semibold text-surface-100 tabular-nums">{formatCredits(used)}</p>
                <p className="text-3xs text-surface-500 mt-0.5">Usados</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-surface-100 tabular-nums">
                  {total ? formatCredits(Math.max(total - used, 0)) : '∞'}
                </p>
                <p className="text-3xs text-surface-500 mt-0.5">Disponíveis</p>
              </div>
              <div>
                {/* Ritmo: aproximação (usados ÷ dias já passados de um ciclo
                    assumido de 30 dias) — o backend expõe só a data de
                    RENOVAÇÃO (planResetsAt), não a de início do ciclo, então
                    não há como calcular o ritmo real sem esse dado. */}
                <p className="text-xs font-semibold text-surface-100 tabular-nums">
                  {days !== null ? formatCredits(Math.round(used / Math.max(1, 30 - days))) : '—'}
                </p>
                <p className="text-3xs text-surface-500 mt-0.5">Ritmo/dia</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5">
              <Button variant="neutral" size="sm" className="flex-1" onClick={goBilling}>
                Ver faturamento
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-accent-dark" onClick={goBilling}>
                Comprar créditos
              </Button>
            </div>
          </motion.div>
        </div>,
        document.body,
      )}
    </div>
  )
}
