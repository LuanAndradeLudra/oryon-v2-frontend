import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import { formatKpiValue } from './utils'
import type { KpiId, KpiMetric } from '@/types/dashboard'
import { KPI_CATALOG, DEFAULT_KPI_SLOTS } from '@/types/dashboard'
import { KpiCustomizerDrawer } from './KpiCustomizerDrawer'

const LS_KEY = 'oryon:dashboard:kpi-slots'

function loadSlots(): KpiId[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const ids = (JSON.parse(raw) as KpiId[]).filter((id) => KPI_CATALOG.some((d) => d.id === id))
      if (ids.length > 0) return ids
    }
  } catch { /* ignore */ }
  return DEFAULT_KPI_SLOTS
}

// ── Faixa de KPI (hero) — card único dividido por hairlines ───────────────────
// SCRUM-1104 (tela 1b): os primeiros slots deixam de ser N cards soltos e
// passam a ser células de um único card, separadas por `border-right` (linha
// vira `border-bottom` no empilhamento mobile). Sem ícone — só rótulo, valor
// e linha de apoio (delta + contexto).

function KpiStripCell({ metric, support }: { metric: KpiMetric; support?: { text: string; tone: 'warn' | 'muted' } }) {
  const isGood =
    (metric.trend > 0 && metric.trendIsGood === 'up') ||
    (metric.trend < 0 && metric.trendIsGood === 'down')
  const isBad =
    (metric.trend > 0 && metric.trendIsGood === 'down') ||
    (metric.trend < 0 && metric.trendIsGood === 'up')
  const trendColor = isGood ? 'text-online' : isBad ? 'text-danger' : 'text-surface-500'

  return (
    <div data-spotlight-target="kpi-cell" className="flex flex-col px-3.5 py-3 min-w-0">
      <span className="flex items-center gap-1 min-w-0">
        <span className="text-[11px] font-medium text-surface-400 truncate">{metric.label}</span>
        {/* Revisão 30/09: todo indicador diz o que conta. */}
        {metric.help && (
          <Tooltip content={metric.help} side="top" wide>
            <HelpCircle className="w-3 h-3 flex-shrink-0 text-surface-600 hover:text-surface-400 transition-colors" aria-label={`O que é ${metric.label}`} />
          </Tooltip>
        )}
      </span>
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
        <span className={cn('text-[11.5px] truncate', support.tone === 'warn' ? 'font-semibold text-status-pending' : 'text-surface-500')}>{support.text}</span>
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

// 28/09: KPIs que NÃO seguem o período dizem o próprio recorte na linha de
// apoio (os demais seguem o seletor e não precisam de etiqueta).
const KPI_ESCOPO: Partial<Record<KpiId, string>> = {
  active_conversations: 'agora',
  queued: 'agora',
  agents_online: 'agora',
}

function apoioDo(metric: KpiMetric, queued: number): { text: string; tone: 'warn' | 'muted' } | undefined {
  if (metric.id === 'active_conversations' && queued > 0) return { text: `agora · ${queued} na fila`, tone: 'warn' }
  const escopo = KPI_ESCOPO[metric.id]
  if (escopo) return { text: escopo, tone: 'muted' }
  // Revisão 30/09: o detalhe real do número (média, sem resposta, base da taxa…).
  return metric.detail ? { text: metric.detail, tone: 'muted' } : undefined
}

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
              support={apoioDo(metric, queued)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── KPI Grid ──────────────────────────────────────────────────────────────────

/**
 * O botão "Personalizar" mora na linha da aba (ao lado do período, pedido do
 * PO 28/09) — quem abre é a aba; aqui fica a faixa e o drawer.
 */
export function KpiGrid({
  metrics,
  customizerOpen,
  onCustomizerClose,
}: {
  metrics: KpiMetric[]
  customizerOpen: boolean
  onCustomizerClose: () => void
}) {
  const [slots, setSlots] = useState<KpiId[]>(loadSlots)

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(slots)) } catch { /* ignore */ }
  }, [slots])

  const activeMetrics = slots
    .map((id) => metrics.find((m) => m.id === id))
    .filter(Boolean) as KpiMetric[]

  return (
    <div>
      {/* Hierarquia visual: os 5 primeiros KPIs da seleção do usuário formam a
          faixa (card único, hairlines); o restante fica compacto abaixo em
          cards soltos. A ordem dos slots continua sendo a do usuário —
          reordenar no customizer muda o que é destaque. */}
      <KpiStrip metrics={activeMetrics} queued={metrics.find((m) => m.id === 'queued')?.value ?? 0} />

      <KpiCustomizerDrawer
        open={customizerOpen}
        onClose={onCustomizerClose}
        slots={slots}
        defaults={DEFAULT_KPI_SLOTS}
        onSave={setSlots}
      />
    </div>
  )
}
