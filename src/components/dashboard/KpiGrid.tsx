import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Settings2, X, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatKpiValue } from './utils'
import type { KpiId, KpiMetric } from '@/types/dashboard'
import { KPI_CATALOG, DEFAULT_KPI_SLOTS } from '@/types/dashboard'

const CATEGORY_COLORS: Record<string, string> = {
  Atendimento: 'var(--color-accent-blue)',
  Velocidade:  'var(--color-accent-amber)',
  Qualidade:   'var(--color-accent-green)',
  Volume:      'var(--color-accent-cyan)',
  Bot:         'var(--color-accent-violet)',
  Equipe:      'var(--color-status-muted)',
  Disparos:    'var(--color-warning)',
  Marketing:   '#1877f2',
  Clínica:     'var(--color-accent-rose)',
}


const LS_KEY = 'oryon:dashboard:kpi-slots'

function loadSlots(): KpiId[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as KpiId[]
  } catch { /* ignore */ }
  return DEFAULT_KPI_SLOTS
}

// ── Faixa de KPI (hero) — card único dividido por hairlines ───────────────────
// SCRUM-1104 (tela 1b): os primeiros slots deixam de ser N cards soltos e
// passam a ser células de um único card, separadas por `border-right` (linha
// vira `border-bottom` no empilhamento mobile). Sem ícone — só rótulo, valor
// e linha de apoio (delta + contexto).

function KpiStripCell({ metric, support }: { metric: KpiMetric; support?: { text: string; tone: 'warn' } }) {
  const isGood =
    (metric.trend > 0 && metric.trendIsGood === 'up') ||
    (metric.trend < 0 && metric.trendIsGood === 'down')
  const isBad =
    (metric.trend > 0 && metric.trendIsGood === 'down') ||
    (metric.trend < 0 && metric.trendIsGood === 'up')
  const trendColor = isGood ? 'text-online' : isBad ? 'text-danger' : 'text-surface-500'

  return (
    <div data-spotlight-target="kpi-cell" className="flex flex-col px-3.5 py-3 min-w-0">
      <span className="text-[11px] font-medium text-surface-400 truncate">{metric.label}</span>
      <div className="font-extrabold tabular-nums tracking-[-0.02em] leading-[1.15] font-display text-[26px] text-surface-100">
        {formatKpiValue(metric.value, metric.unit)}
        {metric.unit === 'csat_score' && (
          <span className="font-normal text-surface-400 ml-1 font-sans text-sm">/ 5</span>
        )}
      </div>
      {metric.trend !== 0 ? (
        <div className={cn('flex items-center gap-1.5 font-semibold text-[11.5px]', trendColor)}>
          {/* TrendingDown não tem versão desenhada da casa (só TrendingUp
              tem, em lib/icons.tsx) — strokeWidth explícito (DECISOES #18). */}
          {metric.trend > 0
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" strokeWidth={1.75} />}
          <span>{metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1).replace('.', ',')}%</span>
          <span className="text-surface-500 font-normal truncate">vs. período anterior</span>
        </div>
      ) : support ? (
        // R2-DASH-02: linha de apoio com dado real que o snapshot já traz
        // (ex.: "12 aguardando" = fila `pending`), no lugar da linha vazia.
        <span className={cn('text-[11.5px] font-semibold truncate', support.tone === 'warn' ? 'text-status-pending' : 'text-surface-500')}>{support.text}</span>
      ) : (
        <span className="text-[11.5px] text-surface-500">&nbsp;</span>
      )}
    </div>
  )
}

// R2-DASH-07 (mock 1b, DASH-KPI-01/02): TODOS os KPIs escolhidos vivem em UM
// card `--sf/--bd/raio 8`, em linhas de 5 células separadas por hairline
// (sem tile de ícone, sem card por KPI).
const STRIP_COLS = 5

function KpiStrip({ metrics, queued }: { metrics: KpiMetric[]; queued: number }) {
  const rows: KpiMetric[][] = []
  for (let i = 0; i < metrics.length; i += STRIP_COLS) rows.push(metrics.slice(i, i + STRIP_COLS))
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg overflow-hidden">
      {rows.map((row, ri) => (
        <div
          key={ri}
          className={cn(
            'grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-surface-700',
            ri > 0 && 'border-t border-surface-700',
          )}
        >
          {row.map((metric) => (
            <KpiStripCell
              key={metric.id}
              metric={metric}
              support={metric.id === 'active_conversations' && queued > 0 ? { text: `${queued} aguardando`, tone: 'warn' } : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Customizer (simple modal-style overlay) ───────────────────────────────────

function CustomizerPanel({
  open, onClose, activeSlots, onToggle, onReset,
}: {
  open: boolean
  onClose: () => void
  activeSlots: KpiId[]
  onToggle: (id: KpiId) => void
  onReset: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const count = activeSlots.length
  const MIN = 4; const MAX = 20
  const categories = [...new Set(KPI_CATALOG.map((d) => d.category))]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="kpi-customizer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            // Eixo 10: scrim do token (--color-scrim-soft), não bg-black/50.
            className="fixed inset-0 bg-[var(--color-scrim-soft)] z-40"
            onClick={onClose}
          />
          <motion.div
            key="kpi-customizer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-surface-950 border-l overlay-frame z-50 flex flex-col"
          >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <div>
            <p className="text-sm font-semibold text-surface-100">Personalizar KPIs</p>
            <p className="text-xs text-surface-400 mt-0.5">{count} de {MAX} selecionados (mín. {MIN})</p>
          </div>
          {/* Eixo 10 (tema claro): painel é surface-950 (#FAFAFC), hover
              mirava surface-800 (#FFFFFF) — diferença de ~1% de luminância,
              quase imperceptível. --rowhover garante contraste real. */}
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: CATEGORY_COLORS[cat] ?? 'var(--color-status-muted)' }}>
                {cat}
              </p>
              <div className="flex flex-col gap-1">
                {KPI_CATALOG.filter((d) => d.category === cat).map((def) => {
                  const isActive = activeSlots.includes(def.id)
                  // PL-C2-FAR-3 (P14): hasData === false fica em 0 pra sempre
                  // (sem fonte no backend hoje) — não deixa ADICIONAR como se
                  // fosse um KPI de verdade. Quem já tinha salvo antes desta
                  // leva continua podendo tirar (senão prende a seleção).
                  const noData = def.hasData === false
                  const disabled = noData ? (isActive ? count <= MIN : true) : (isActive ? count <= MIN : count >= MAX)
                  return (
                    <button
                      key={def.id}
                      onClick={() => !disabled && onToggle(def.id)}
                      disabled={disabled}
                      title={noData ? 'Sem dado no backend ainda — fica em 0' : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors',
                        isActive
                          ? disabled
                            ? 'border-transparent bg-brand-600/40 text-white/60 cursor-not-allowed'
                            : 'border-transparent bg-brand-600 text-white hover:bg-brand-500'
                          : disabled
                            ? 'border-surface-700 text-surface-600 cursor-not-allowed'
                            // Eixo 10 (tema claro): mesmo achado do botão
                            // fechar acima — hover:bg-surface-900/50 contra
                            // o painel surface-950 é quase imperceptível.
                            : 'border-surface-700 text-surface-300 hover:border-surface-700 hover:bg-[var(--rowhover)]',
                      )}
                    >
                      <span className={cn(
                        'w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0',
                        isActive ? 'bg-brand-950 border-black/40' : 'border-surface-600',
                      )}>
                        {isActive && <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
                      </span>
                      <span className="text-xs font-medium flex-1">{def.label}</span>
                      {noData && (
                        <span className="text-[9.5px] font-semibold uppercase tracking-wide text-surface-500 flex-shrink-0">
                          Sem dado
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

            <div className="px-5 py-4 border-t border-surface-700">
              <button onClick={onReset} className="flex items-center gap-2 text-xs text-surface-400 hover:text-surface-200 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
                Redefinir padrão
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── KPI Grid ──────────────────────────────────────────────────────────────────

export function KpiGrid({
  metrics,
}: {
  metrics: KpiMetric[]
}) {
  const [slots, setSlots] = useState<KpiId[]>(loadSlots)
  const [customizerOpen, setCustomizerOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(slots)) } catch { /* ignore */ }
  }, [slots])

  const toggle = (id: KpiId) => {
    setSlots((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  }

  const activeMetrics = slots
    .map((id) => metrics.find((m) => m.id === id))
    .filter(Boolean) as KpiMetric[]

  return (
    <div>
      {/* flex-wrap (SCRUM-1070): sem isto, em ~375px a soma de label + seletor
          de período + "Personalizar" excedia a largura e o container pai
          (overflow-hidden) cortava o botão fora da tela em vez de rolar. */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <div className="flex-1 min-w-0" />
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Eixo 10 (tema claro): border-surface-700/60 (opacidade
              arbitrária) -> --bd2 sólido, mesma borda de input/botão do
              resto do app. Settings2 sem versão desenhada da casa ->
              strokeWidth explícito (DECISOES #18). Altura h-8 não mexida
              (não fazia parte do achado, fora do escopo desta leva). */}
          <button
            onClick={() => setCustomizerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-[var(--bd2)] hover:border-surface-600 bg-surface-800 text-xs text-surface-400 hover:text-surface-200 transition-colors shrink-0"
          >
            <Settings2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            Personalizar
          </button>
        </div>
      </div>

      {/* Hierarquia visual: os 5 primeiros KPIs da seleção do usuário formam a
          faixa (card único, hairlines); o restante fica compacto abaixo em
          cards soltos. A ordem dos slots continua sendo a do usuário —
          reordenar no customizer muda o que é destaque. */}
      <KpiStrip metrics={activeMetrics} queued={metrics.find((m) => m.id === 'queued')?.value ?? 0} />

      <CustomizerPanel
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        activeSlots={slots}
        onToggle={toggle}
        onReset={() => setSlots(DEFAULT_KPI_SLOTS)}
      />
    </div>
  )
}
