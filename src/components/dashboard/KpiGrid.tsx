import { useState, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import { formatKpiValue } from './utils'
import type { KpiId, KpiMetric } from '@/types/dashboard'
import { KPI_CATALOG, DEFAULT_KPI_SLOTS } from '@/types/dashboard'
import { KpiCustomizerDrawer } from './KpiCustomizerDrawer'
import { ValorComUnidade } from './ValorComUnidade'
import {
  identidadeDo, agruparPorGrupo, NOME_DO_GRUPO, estadoDaMeta, COR_DO_ESTADO, ROTULO_DO_ESTADO, DESTAQUE_MAX, type Densidade,
} from './kpiIdentidade'

const LS_KEY = 'oryon:dashboard:kpi-slots'
const LS_DENSIDADE = 'oryon:dashboard:kpi-densidade'
const LS_DESTAQUE = 'oryon:dashboard:kpi-destaque'


function lerLocal<T>(chave: string, ler: (v: unknown) => T | null, padrao: T): T {
  try {
    const raw = localStorage.getItem(chave)
    if (raw) {
      const v = ler(JSON.parse(raw))
      if (v !== null) return v
    }
  } catch { /* ignore */ }
  return padrao
}
const lerDensidade = (v: unknown): Densidade | null => (v === 'compacta' || v === 'detalhada' ? v : null)
const lerDestaque = (v: unknown): KpiId[] | null =>
  Array.isArray(v) ? (v.filter((id) => KPI_CATALOG.some((d) => d.id === id)) as KpiId[]).slice(0, DESTAQUE_MAX) : null

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

/**
 * DC-5: variação contra o período anterior de mesma duração, ao lado do
 * número. Verde/vermelho só quando o indicador tem um lado bom
 * (`trendIsGood`); nos neutros (mensagens recebidas…) fica cinza.
 */
export function Variacao({ metric }: { metric: KpiMetric }) {
  const t = metric.trend
  if (t === null || t === undefined || !Number.isFinite(t)) return null
  const pp = metric.trendUnit === 'pp'
  const sufixo = pp ? ' p.p.' : '%'
  const abs = Math.abs(t)
  const numero = !pp && abs >= 1000 ? '>999' : abs.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  const bom = (t > 0 && metric.trendIsGood === 'up') || (t < 0 && metric.trendIsGood === 'down')
  const ruim = (t > 0 && metric.trendIsGood === 'down') || (t < 0 && metric.trendIsGood === 'up')
  const seta = t > 0 ? '↑' : t < 0 ? '↓' : '='
  const texto = t === 0 ? 'estável' : `${numero}${sufixo}`
  const extenso = t === 0
    ? 'estável em relação ao período anterior'
    : `${t > 0 ? 'subiu' : 'caiu'} ${numero}${pp ? ' pontos percentuais' : '%'} em relação ao período anterior`
  return (
    <span
      data-testid="kpi-variacao"
      title="Comparado ao período anterior de mesma duração"
      className={cn(
        'inline-flex items-center gap-0.5 text-[11.5px] font-semibold tabular-nums whitespace-nowrap',
        bom ? 'text-online' : ruim ? 'text-danger' : 'text-surface-500',
      )}
    >
      <span aria-hidden>{seta}</span>
      <span aria-hidden>{texto}</span>
      <span className="sr-only">{extenso}</span>
    </span>
  )
}

/** DC-5: linha de tendência por dia do período (só desenho, sem eixo). */
export function Sparkline({ pontos, alto = 22 }: { pontos: number[]; alto?: number }) {
  if (pontos.length < 2) return null
  const max = Math.max(...pontos)
  const min = Math.min(...pontos)
  const faixa = max - min || 1
  const coords = pontos
    .map((v, i) => `${((i / (pontos.length - 1)) * 100).toFixed(2)},${(alto - 2 - ((v - min) / faixa) * (alto - 4)).toFixed(2)}`)
    .join(' ')
  return (
    <svg
      data-testid="kpi-sparkline"
      viewBox={`0 0 100 ${alto}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: alto }}
      aria-hidden
    >
      <polyline points={coords} fill="none" stroke="var(--color-accent-dark)" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function KpiStripCell({ metric, support, detalhada = false, grande = false }: {
  metric: KpiMetric
  support?: Apoio
  detalhada?: boolean
  grande?: boolean
}) {
  const { aoVivo, destino } = identidadeDo(metric)
  const estado = estadoDaMeta(metric)
  const valor = formatKpiValue(metric.value, metric.unit)
  const comSerie = (detalhada || grande) && metric.sparkline.length >= 2
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

      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
        <span className={cn(
          'font-extrabold tabular-nums tracking-[-0.02em] leading-[1.15] font-display text-surface-100',
          grande ? 'text-[34px]' : 'text-[26px]',
        )}>
          <ValorComUnidade texto={valor} />
          {metric.unit === 'csat_score' && (
            <span className="font-normal text-surface-400 ml-1 font-sans text-sm">/ 5</span>
          )}
        </span>
        <Variacao metric={metric} />
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

      {comSerie && (
        <span className="mt-auto pt-2 block">
          <Sparkline pontos={metric.sparkline} alto={grande ? 36 : 22} />
        </span>
      )}
    </>
  )

  // Divisória fina à direita e embaixo de cada cartão (a margem negativa da
  // grade esconde as da última coluna/linha) — o PO pediu separação clara.
  const base = cn('flex flex-col min-w-0 border-r border-b border-surface-700', grande ? 'px-4 py-3.5' : 'px-3.5 py-3')
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

function CartaoDoGrupo({ titulo, largura, children }: { titulo: string; largura: number; children: ReactNode }) {
  return (
    <section
      aria-label={titulo}
      className="min-w-0 flex flex-col bg-surface-800 border border-surface-700 rounded-lg overflow-hidden"
      style={{ flexGrow: largura, flexBasis: `${largura * CELULA_MIN}px` }}
    >
      <h3 className="flex items-center h-8 px-3.5 bg-[var(--sf2)] border-b border-surface-700 text-[11px] font-bold uppercase tracking-[0.08em] text-surface-300">
        {titulo}
      </h3>
      <div className="grid flex-1 -mr-px -mb-px" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${CELULA_MIN}px, 1fr))` }}>
        {children}
      </div>
    </section>
  )
}

function KpiStrip({ metrics, queued, densidade = 'compacta', destaque = [] }: {
  metrics: KpiMetric[]
  queued: number
  densidade?: Densidade
  destaque?: KpiId[]
}) {
  // Um CARTÃO por categoria, separados pelo mesmo espaço dos outros blocos do
  // Dashboard (pedido do PO, 01/10: as categorias se misturavam numa faixa
  // única). Cada cartão cresce na proporção de quantos indicadores tem e
  // quebra de linha naturalmente — categoria com 1 indicador vira um cartão
  // pequeno, sem linha vazia. Dentro do cartão: cabeçalho em faixa própria e
  // divisória fina entre os indicadores (a margem negativa esconde as da
  // última coluna/linha).
  //
  // DC-5: os em destaque saem dos grupos e sobem para uma linha própria,
  // maiores e com a linha de tendência — cada um no cartão do seu grupo.
  const emDestaque = destaque
    .map((id) => metrics.find((m) => m.id === id))
    .filter(Boolean) as KpiMetric[]
  const grupos = agruparPorGrupo(metrics.filter((m) => !destaque.includes(m.id)))
  const detalhada = densidade === 'detalhada'
  return (
    <div className="flex flex-col gap-3.5" data-testid="faixa-kpi" data-densidade={densidade}>
      {emDestaque.length > 0 && (
        <div className="flex flex-wrap gap-3.5" data-testid="kpi-destaques">
          {emDestaque.map((metric) => (
            <CartaoDoGrupo key={metric.id} titulo={NOME_DO_GRUPO[metric.category]} largura={2}>
              <KpiStripCell metric={metric} support={apoioDo(metric, queued)} grande />
            </CartaoDoGrupo>
          ))}
        </div>
      )}
      {grupos.length > 0 && (
        <div className="flex flex-wrap gap-3.5">
          {grupos.map(({ grupo, itens }) => (
            <CartaoDoGrupo key={grupo} titulo={NOME_DO_GRUPO[grupo]} largura={itens.length}>
              {itens.map((metric) => (
                <KpiStripCell key={metric.id} metric={metric} support={apoioDo(metric, queued)} detalhada={detalhada} />
              ))}
            </CartaoDoGrupo>
          ))}
        </div>
      )}
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
  podeEditarMetas = false,
  onMetasSalvas,
}: {
  metrics: KpiMetric[]
  customizerOpen: boolean
  onCustomizerClose: () => void
  /** DC-6: só administradores definem as metas da empresa. */
  podeEditarMetas?: boolean
  onMetasSalvas?: () => void
}) {
  const [slots, setSlots] = useState<KpiId[]>(loadSlots)
  const [densidade, setDensidade] = useState<Densidade>(() => lerLocal(LS_DENSIDADE, lerDensidade, 'compacta'))
  const [destaque, setDestaque] = useState<KpiId[]>(() => lerLocal(LS_DESTAQUE, lerDestaque, []))

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(slots)) } catch { /* ignore */ }
  }, [slots])
  useEffect(() => {
    try { localStorage.setItem(LS_DENSIDADE, JSON.stringify(densidade)) } catch { /* ignore */ }
  }, [densidade])
  useEffect(() => {
    try { localStorage.setItem(LS_DESTAQUE, JSON.stringify(destaque)) } catch { /* ignore */ }
  }, [destaque])

  const activeMetrics = slots
    .map((id) => metrics.find((m) => m.id === id))
    .filter(Boolean) as KpiMetric[]

  return (
    <div>
      <KpiStrip
        metrics={activeMetrics}
        queued={metrics.find((m) => m.id === 'queued')?.value ?? 0}
        densidade={densidade}
        destaque={destaque.filter((id) => slots.includes(id))}
      />

      <KpiCustomizerDrawer
        open={customizerOpen}
        onClose={onCustomizerClose}
        slots={slots}
        defaults={DEFAULT_KPI_SLOTS}
        densidade={densidade}
        destaque={destaque}
        onSave={(r) => { setSlots(r.slots); setDensidade(r.densidade); setDestaque(r.destaque) }}
        podeEditarMetas={podeEditarMetas}
        onMetasSalvas={onMetasSalvas}
      />
    </div>
  )
}
