import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import { formatKpiValue } from './utils'
import type { KpiId, KpiMetric } from '@/types/dashboard'
import { KPI_CATALOG, DEFAULT_KPI_SLOTS } from '@/types/dashboard'
import { KpiCustomizerDrawer } from './KpiCustomizerDrawer'
import {
  identidadeDo, agruparPorGrupo, NOME_DO_GRUPO, estadoDaMeta, COR_DO_ESTADO, ROTULO_DO_ESTADO,
} from './kpiIdentidade'

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

// ── Faixa de KPI ──────────────────────────────────────────────────────────────
// Pedido do PO (01/10): diferenciar os indicadores batendo o olho, num visual
// B2B minimalista (sem ícones — a tentativa com ícone colorido por indicador
// ficou genérica). A diferença vem de:
//  - GRUPOS com cabeçalho discreto (Atendimento, Velocidade, IA…);
//  - o formato do dado: barra nas taxas, referência ao lado dos tempos, a
//    unidade menor e mais leve que o número;
//  - cor só com significado: estado da meta, ponto "ao vivo", barra da taxa.
// O cartão leva à lista que compõe o número, quando existe uma.

type Apoio = { text: string; tone: 'warn' | 'muted' }

/** "10h 20m" / "39,0%": a unidade menor e mais leve que o número. */
function Valor({ texto }: { texto: string }) {
  const partes = texto.split(/([a-z%]+)/i).filter(Boolean)
  return (
    <>
      {partes.map((p, i) =>
        /^[a-z%]+$/i.test(p)
          ? <span key={i} className="text-[0.58em] font-semibold text-surface-400 ml-[1px] mr-[3px] tracking-normal">{p}</span>
          : <span key={i}>{p.trim()}</span>,
      )}
    </>
  )
}

function KpiStripCell({ metric, support }: { metric: KpiMetric; support?: Apoio }) {
  const { aoVivo, destino } = identidadeDo(metric)
  const estado = estadoDaMeta(metric)
  const isGood =
    (metric.trend > 0 && metric.trendIsGood === 'up') ||
    (metric.trend < 0 && metric.trendIsGood === 'down')
  const isBad =
    (metric.trend > 0 && metric.trendIsGood === 'down') ||
    (metric.trend < 0 && metric.trendIsGood === 'up')
  const trendColor = isGood ? 'text-online' : isBad ? 'text-danger' : 'text-surface-500'
  const valor = formatKpiValue(metric.value, metric.unit)
  const barra = metric.unit === 'percent' && metric.value !== null ? Math.max(0, Math.min(100, metric.value)) : null

  const conteudo = (
    <>
      <span className="flex items-start gap-1.5 min-w-0">
        {/* Rótulo em até 2 linhas — "Tempo de Resp…" cortava em telas médias. */}
        <span className="flex-1 min-w-0 text-[11.5px] leading-[1.3] font-medium text-surface-400 line-clamp-2">
          {metric.label}
        </span>
        {aoVivo && (
          <span className="pt-[4px] flex-shrink-0" title="Agora — não segue o período">
            <span className="block w-1.5 h-1.5 rounded-full bg-online animate-pulse" aria-hidden />
            <span className="sr-only">agora</span>
          </span>
        )}
        {/* Revisão 30/09: todo indicador diz o que conta. */}
        {metric.help && (
          <span className="pt-[1px] flex-shrink-0" onClick={(e) => e.preventDefault()}>
            <Tooltip content={metric.help} side="top" wide>
              <HelpCircle className="w-3 h-3 text-surface-600 hover:text-surface-400 transition-colors" aria-label={`O que é ${metric.label}`} />
            </Tooltip>
          </span>
        )}
      </span>

      <div className="mt-1 font-extrabold tabular-nums tracking-[-0.02em] leading-[1.15] font-display text-[26px] text-surface-100">
        <Valor texto={valor} />
        {metric.unit === 'csat_score' && (
          <span className="font-normal text-surface-400 ml-1 font-sans text-sm">/ 5</span>
        )}
      </div>

      {barra !== null && (
        <span className="mt-1.5 block h-[3px] rounded-full bg-surface-700 overflow-hidden" aria-hidden>
          <span className="block h-full rounded-full bg-[var(--color-accent-dark)]" style={{ width: `${barra}%` }} />
        </span>
      )}

      <div className="mt-1 min-h-[17px]">
        {estado ? (
          <span className="flex items-center gap-1.5 text-[11.5px] min-w-0" title={support?.text}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: COR_DO_ESTADO[estado] }} aria-hidden />
            <span className="font-semibold flex-shrink-0" style={{ color: COR_DO_ESTADO[estado] }}>{ROTULO_DO_ESTADO[estado]}</span>
            <span className="text-surface-500 truncate">· meta {formatKpiValue(metric.meta!.alvo, metric.unit)}</span>
          </span>
        ) : metric.trend !== 0 ? (
          <span className={cn('flex items-center gap-1.5 font-semibold text-[11.5px]', trendColor)}>
            {metric.trend > 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" strokeWidth={1.75} />}
            <span>{metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1).replace('.', ',')}%</span>
            <span className="text-surface-500 font-normal truncate">vs. período anterior</span>
          </span>
        ) : support ? (
          // R2-DASH-02: linha de apoio com dado real; o texto inteiro vai no title.
          <span
            title={support.text}
            className={cn('block text-[11.5px] truncate', support.tone === 'warn' ? 'font-semibold text-status-pending' : 'text-surface-500')}
          >
            {support.text}
          </span>
        ) : null}
      </div>
    </>
  )

  // Divisória fina à direita e embaixo de cada cartão (a margem negativa da
  // grade esconde as da última coluna/linha) — o PO pediu separação clara.
  const base = 'flex flex-col px-3.5 py-3 min-w-0 border-r border-b border-surface-700'
  if (!destino) {
    return <div data-spotlight-target="kpi-cell" className={base}>{conteudo}</div>
  }
  return (
    <Link
      to={destino.para}
      data-spotlight-target="kpi-cell"
      aria-label={`${metric.label}: ${valor}. ${destino.rotulo}`}
      title={destino.rotulo}
      className={cn(
        base,
        'transition-colors hover:bg-[var(--rowhover)]',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500',
      )}
    >
      {conteudo}
    </Link>
  )
}

// 28/09: KPIs que NÃO seguem o período dizem o próprio recorte na linha de
// apoio (os demais seguem o seletor e não precisam de etiqueta).
const KPI_ESCOPO: Partial<Record<KpiId, string>> = {
  active_conversations: 'agora',
  queued: 'agora',
  agents_online: 'agora',
}

function apoioDo(metric: KpiMetric, queued: number): Apoio | undefined {
  if (metric.id === 'active_conversations' && queued > 0) return { text: `agora · ${queued} na fila`, tone: 'warn' }
  const escopo = KPI_ESCOPO[metric.id]
  if (escopo) return { text: escopo, tone: 'muted' }
  // Revisão 30/09: o detalhe real do número (média, sem resposta, base da taxa…).
  return metric.detail ? { text: metric.detail, tone: 'muted' } : undefined
}

/** Largura mínima de um indicador; o grupo cresce na proporção de quantos tem. */
const CELULA_MIN = 168

function KpiStrip({ metrics, queued }: { metrics: KpiMetric[]; queued: number }) {
  // Um CARTÃO por categoria, separados pelo mesmo espaço dos outros blocos do
  // Dashboard (pedido do PO, 01/10: as categorias se misturavam numa faixa
  // única). Cada cartão cresce na proporção de quantos indicadores tem e
  // quebra de linha naturalmente — categoria com 1 indicador vira um cartão
  // pequeno, sem linha vazia. Dentro do cartão: cabeçalho em faixa própria e
  // divisória fina entre os indicadores (a margem negativa esconde as da
  // última coluna/linha).
  const grupos = agruparPorGrupo(metrics)
  return (
    <div className="flex flex-wrap gap-3.5" data-testid="faixa-kpi">
      {grupos.map(({ grupo, itens }) => (
        <section
          key={grupo}
          aria-label={NOME_DO_GRUPO[grupo]}
          className="min-w-0 flex flex-col bg-surface-800 border border-surface-700 rounded-lg overflow-hidden"
          style={{ flexGrow: itens.length, flexBasis: `${itens.length * CELULA_MIN}px` }}
        >
          <h3 className="flex items-center h-8 px-3.5 bg-[var(--sf2)] border-b border-surface-700 text-[11px] font-bold uppercase tracking-[0.08em] text-surface-300">
            {NOME_DO_GRUPO[grupo]}
          </h3>
          <div className="grid flex-1 -mr-px -mb-px" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${CELULA_MIN}px, 1fr))` }}>
            {itens.map((metric) => (
              <KpiStripCell key={metric.id} metric={metric} support={apoioDo(metric, queued)} />
            ))}
          </div>
        </section>
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
