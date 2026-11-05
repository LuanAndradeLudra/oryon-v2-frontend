import { useState, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import { formatKpiValue } from './utils'
import type { DateRange, KpiId, KpiIdFixo, KpiMetric } from '@/types/dashboard'
import { KPI_CATALOG, DEFAULT_KPI_SLOTS } from '@/types/dashboard'
import { KpiCustomizerDrawer } from './KpiCustomizerDrawer'
import { ListaDaMetrica } from './ListaDaMetrica'
import { ValorComUnidade } from './ValorComUnidade'
import {
  identidadeDo, agruparPorGrupo, nomeDoGrupo, estadoDaMeta, COR_DO_ESTADO, ROTULO_DO_ESTADO, DESTAQUE_MAX, type Densidade,
} from './kpiIdentidade'
import { classeDaGrade } from '@/components/dashboard/gradeDeIndicadores'

const LS_KEY = 'oryon:dashboard:kpi-slots'
const LS_DENSIDADE = 'oryon:dashboard:kpi-densidade'
const LS_DESTAQUE = 'oryon:dashboard:kpi-destaque'


/**
 * SCRUM-1465: os ids escolhidos dependem do cliente (as métricas do negócio
 * são de cada um) e de quem olha (o atendente não recebe as métricas do
 * negócio — A20), então a faixa e o destaque ficam guardados POR TENANT E
 * USUÁRIO. Sem eles, vale a chave antiga (global) — e ela semeia a nova na 1ª vez.
 */
function chaveDoTenant(base: string, tenantId?: string | null, userId?: string | null): string {
  return tenantId ? `${base}:${tenantId}${userId ? `:${userId}` : ''}` : base
}

/** A chave do usuário; sem ela, a do tenant (antes de 04/11); sem ela, a global (antes do épico). */
function lerBruto(chave: string, base: string): string | null {
  const proprio = localStorage.getItem(chave)
  if (proprio !== null || chave === base) return proprio
  const doTenant = chave.split(':').length > base.split(':').length + 1 ? localStorage.getItem(chave.slice(0, chave.lastIndexOf(':'))) : null
  return doTenant ?? localStorage.getItem(base)
}

function lerLocal<T>(chave: string, ler: (v: unknown) => T | null, padrao: T, base = chave): T {
  try {
    const raw = lerBruto(chave, base)
    if (raw) {
      const v = ler(JSON.parse(raw))
      if (v !== null) return v
    }
  } catch { /* ignore */ }
  return padrao
}
const lerDensidade = (v: unknown): Densidade | null => (v === 'compacta' || v === 'detalhada' ? v : null)
const idsSalvos = (v: unknown): KpiId[] =>
  Array.isArray(v) ? [...new Set(v.filter((id): id is string => typeof id === 'string' && id.length > 0))] : []
const lerDestaque = (v: unknown): KpiId[] | null => (Array.isArray(v) ? idsSalvos(v).slice(0, DESTAQUE_MAX) : null)

/**
 * A faixa salva. Id fora do catálogo de agora NÃO é apagado: pode ser uma
 * métrica do negócio que não carregou desta vez (o servidor falhou) — só não
 * aparece. Se nenhum id salvo é conhecido, volta ao padrão.
 */
function loadSlots(chave: string, conhecidos: ReadonlySet<string>): KpiId[] {
  try {
    const raw = lerBruto(chave, LS_KEY)
    if (raw) {
      const ids = idsSalvos(JSON.parse(raw))
      if (ids.some((id) => conhecidos.has(id))) return ids
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
        'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums whitespace-nowrap',
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

function KpiStripCell({ metric, support, detalhada = false, grande = false, onAbrirLista }: {
  metric: KpiMetric
  support?: Apoio
  detalhada?: boolean
  grande?: boolean
  /** SCRUM-1465: métrica do negócio abre o "Quais são?" em vez de navegar. */
  onAbrirLista?: (m: KpiMetric) => void
}) {
  const identidade = identidadeDo(metric)
  const destino = identidade.destino
  // A17: a métrica do negócio de estado (interessados em aberto) é "agora", como a fila.
  const aoVivo = identidade.aoVivo || metric.negocio?.deEstado === true
  const estimado = metric.negocio?.selos.includes('estimado') ?? false
  // G20 (A42): o número conta o que a IA fez — quem marcou por telefone não está nele.
  const pelaIa = metric.negocio?.selos.includes('pela_ia') ?? false
  const estado = estadoDaMeta(metric)
  const valor = formatKpiValue(metric.value, metric.unit)
  const comSerie = (detalhada || grande) && metric.sparkline.length >= 2
  const barra = metric.unit === 'percent' && metric.value !== null ? Math.max(0, Math.min(100, metric.value)) : null

  const conteudo = (
    <>
      <span className="flex items-start gap-1.5 min-w-0">
        {/* Rótulo em até 2 linhas — "Tempo de Resp…" cortava em telas médias. */}
        <span className="flex-1 min-w-0 text-xs leading-[1.3] font-medium text-surface-400 line-clamp-2">
          {metric.label}
        </span>
        {estimado && (
          <span className="pt-[1px] flex-shrink-0 text-2xs font-semibold text-surface-500" title="Estimativa: preço de tabela, sem descontar convênio">estimado</span>
        )}
        {pelaIa && !estimado && (
          <span className="pt-[1px] flex-shrink-0 text-2xs font-semibold text-surface-500" title="Conta só o que a IA fez pelo WhatsApp">pela IA</span>
        )}
        {aoVivo && (
          <span className="pt-[4px] flex-shrink-0" title="Agora — não segue o período">
            <span className="block w-1.5 h-1.5 rounded-full bg-online animate-pulse" aria-hidden />
            <span className="sr-only">agora</span>
          </span>
        )}
        {/* Revisão 30/09: todo indicador diz o que conta. */}
        {metric.help && (
          // O ⓘ explica; não abre o "Quais são?" (que é auditado e tem dado de saúde — A21).
          <span className="pt-[1px] flex-shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
            <Tooltip content={metric.help} side="top" wide>
              <HelpCircle className="w-3 h-3 text-surface-600 hover:text-surface-400 transition-colors" aria-label={`O que é ${metric.label}`} />
            </Tooltip>
          </span>
        )}
      </span>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
        <span className={cn(
          'font-semibold tabular-nums tracking-[-0.01em] leading-[1.15] text-surface-100',
          grande ? 'text-3xl' : 'text-xl',
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
          <span className="flex items-center gap-1.5 text-xs min-w-0" title={support?.text}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: COR_DO_ESTADO[estado] }} aria-hidden />
            <span className="font-semibold flex-shrink-0" style={{ color: COR_DO_ESTADO[estado] }}>{ROTULO_DO_ESTADO[estado]}</span>
            <span className="text-surface-500 truncate">· meta {formatKpiValue(metric.meta!.alvo, metric.unit)}</span>
          </span>
        ) : support ? (
          // R2-DASH-02: linha de apoio com dado real; o texto inteiro vai no title.
          <span
            title={support.text}
            className={cn('block text-xs line-clamp-2', support.tone === 'warn' ? 'font-semibold text-status-pending' : 'text-surface-500')}
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
  if (metric.negocio && onAbrirLista && metric.negocio.estado !== 'carregando') {
    return (
      <button
        type="button"
        onClick={() => onAbrirLista(metric)}
        data-spotlight-target="kpi-cell"
        aria-label={`${metric.label}: ${valor}. Ver quais são`}
        title="Ver quais são"
        className={cn(base, 'text-left transition-colors hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500')}
      >
        {conteudo}
      </button>
    )
  }
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
const KPI_ESCOPO: Partial<Record<KpiIdFixo, string>> = {
  active_conversations: 'agora',
  queued: 'agora',
  agents_online: 'agora',
}

function apoioDo(metric: KpiMetric, queued: number): Apoio | undefined {
  if (metric.id === 'active_conversations' && queued > 0) return { text: `agora · ${queued} na fila`, tone: 'warn' }
  const escopo = KPI_ESCOPO[metric.id as KpiIdFixo] ?? (metric.negocio?.deEstado ? 'agora' : undefined)
  if (escopo && metric.negocio?.deEstado && metric.detail) return { text: `agora · ${metric.detail}`, tone: 'muted' }
  if (escopo) return { text: escopo, tone: 'muted' }
  // SCRUM-1465: erro ou tempo esgotado da métrica do negócio é aviso, não apoio.
  const falhou = metric.negocio?.estado === 'erro' || metric.negocio?.estado === 'tempo_esgotado'
  if (falhou && metric.detail) return { text: metric.detail, tone: 'warn' }
  // Revisão 30/09: o detalhe real do número (média, sem resposta, base da taxa…).
  return metric.detail ? { text: metric.detail, tone: 'muted' } : undefined
}

/** Largura mínima de um indicador; o grupo cresce na proporção de quantos tem. */
const CELULA_MIN = 168

function CartaoDoGrupo({ titulo, largura, colunas = largura, children }: { titulo: string; largura: number; colunas?: number; children: ReactNode }) {
  return (
    <section
      aria-label={titulo}
      className={cn('min-w-0 flex flex-col bg-surface-800 border border-surface-700 rounded-[10px] overflow-hidden', '@container')}
      style={{ flexGrow: largura, flexBasis: `${largura * CELULA_MIN}px` }}
    >
      <h3 className="flex items-center h-8 px-3.5 bg-[var(--sf2)] border-b border-surface-700 text-2xs font-semibold uppercase tracking-[0.08em] text-surface-300">
        {titulo}
      </h3>
      {/* Colunas que dividem a quantidade (SCRUM-1253): nada de 4º item sozinho. */}
      {/* `colunas` ≠ `largura`: o destaque ocupa o espaço de 2 células, mas
          tem 1 indicador só — com 2 colunas ele ficava na metade do cartão. */}
      <div className={cn('grid flex-1 -mr-px -mb-px', classeDaGrade(colunas))}>{children}</div>
    </section>
  )
}

function KpiStrip({ metrics, queued, densidade = 'compacta', destaque = [], onAbrirLista }: {
  metrics: KpiMetric[]
  queued: number
  densidade?: Densidade
  destaque?: KpiId[]
  onAbrirLista?: (m: KpiMetric) => void
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
            <CartaoDoGrupo key={metric.id} titulo={nomeDoGrupo(metric.category)} largura={2} colunas={1}>
              <KpiStripCell metric={metric} support={apoioDo(metric, queued)} grande onAbrirLista={onAbrirLista} />
            </CartaoDoGrupo>
          ))}
        </div>
      )}
      {grupos.length > 0 && (
        <div className="flex flex-wrap gap-3.5">
          {grupos.map(({ grupo, itens }) => (
            <CartaoDoGrupo key={grupo} titulo={nomeDoGrupo(grupo)} largura={itens.length}>
              {itens.map((metric) => (
                <KpiStripCell key={metric.id} metric={metric} support={apoioDo(metric, queued)} detalhada={detalhada} onAbrirLista={onAbrirLista} />
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
  tenantId,
  userId,
  periodo = '7d',
  catalogoPronto = true,
}: {
  metrics: KpiMetric[]
  customizerOpen: boolean
  onCustomizerClose: () => void
  /** DC-6: só administradores definem as metas da empresa. */
  podeEditarMetas?: boolean
  onMetasSalvas?: () => void
  /** SCRUM-1465: a faixa salva é do cliente e de quem olha (A20). */
  tenantId?: string | null
  userId?: string | null
  /** O catálogo das métricas do negócio respondeu: antes disso a faixa salva não é regravada (A20). */
  catalogoPronto?: boolean
  /** Período à vista — o "Quais são?" lista o mesmo recorte do número. */
  periodo?: DateRange
}) {
  const chaveSlots = chaveDoTenant(LS_KEY, tenantId, userId)
  const chaveDestaque = chaveDoTenant(LS_DESTAQUE, tenantId, userId)
  const conhecidos = () => new Set([...KPI_CATALOG.map((d) => d.id), ...metrics.map((m) => m.id)])
  const [slots, setSlots] = useState<KpiId[]>(() => loadSlots(chaveSlots, conhecidos()))
  // Montou antes do catálogo: quando ele chega, relê a faixa salva (os ids do negócio agora são conhecidos).
  const [lidoComCatalogo, setLidoComCatalogo] = useState(catalogoPronto)
  if (catalogoPronto && !lidoComCatalogo) {
    setLidoComCatalogo(true)
    setSlots(loadSlots(chaveSlots, conhecidos()))
  }
  const [densidade, setDensidade] = useState<Densidade>(() => lerLocal(LS_DENSIDADE, lerDensidade, 'compacta'))
  const [destaque, setDestaque] = useState<KpiId[]>(() => lerLocal(chaveDestaque, lerDestaque, [], LS_DESTAQUE))
  const [lista, setLista] = useState<KpiMetric | null>(null)

  useEffect(() => {
    // Só depois do catálogo: antes, um padrão provisório apagaria a escolha salva (A20).
    if (!catalogoPronto) return
    try { localStorage.setItem(chaveSlots, JSON.stringify(slots)) } catch { /* ignore */ }
  }, [slots, chaveSlots, catalogoPronto])
  useEffect(() => {
    try { localStorage.setItem(LS_DENSIDADE, JSON.stringify(densidade)) } catch { /* ignore */ }
  }, [densidade])
  useEffect(() => {
    if (!catalogoPronto) return
    try { localStorage.setItem(chaveDestaque, JSON.stringify(destaque)) } catch { /* ignore */ }
  }, [destaque, chaveDestaque, catalogoPronto])

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
        onAbrirLista={setLista}
      />

      {/* Valor atualizado do período à vista (a lista acompanha o recarregar). */}
      <ListaDaMetrica metric={lista ? metrics.find((m) => m.id === lista.id) ?? lista : null} periodo={periodo} onClose={() => setLista(null)} />

      <KpiCustomizerDrawer
        open={customizerOpen}
        onClose={onCustomizerClose}
        slots={slots}
        defaults={DEFAULT_KPI_SLOTS}
        catalogo={metrics}
        densidade={densidade}
        destaque={destaque}
        onSave={(r) => { setSlots(r.slots); setDensidade(r.densidade); setDestaque(r.destaque) }}
        podeEditarMetas={podeEditarMetas}
        onMetasSalvas={onMetasSalvas}
      />
    </div>
  )
}
