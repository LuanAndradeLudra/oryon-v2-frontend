import type { DadosDoNegocio, KpiMetric, KpiUnit } from '@/types/dashboard'
import { variacao } from '@/lib/snapshotDoPainel'

/**
 * SCRUM-1465 (épico SCRUM-1457) — métricas do negócio no painel.
 *
 * O backend (`GET /home/metrics?range=`) devolve, para cada métrica publicada
 * para o cliente, o valor CRU do período, o do período anterior (só quando a
 * comparação é honesta), as partes e a explicação. Aqui isso vira o mesmo
 * `KpiMetric` dos cards fixos — sem rede, testável:
 *
 *  - moeda vem em centavos → reais (o `formatKpiValue` formata reais);
 *  - a variação sai do valor cru, só com `comparavel` (regra G11/G13);
 *  - `null` é "sem dado" ("—"), nunca zero;
 *  - a métrica com o mesmo id de um card fixo (`appointments_*`) o substitui.
 */

export type EstadoDoServidor = DadosDoNegocio['estado']

export interface MetricaDoServidor {
  chave: string
  rotulo: string
  grupo: string
  unidade: 'count' | 'percent' | 'currency'
  sentido: 'up' | 'down' | 'neutral'
  ajuda: string | null
  selos: DadosDoNegocio['selos']
  versao: number
  publicadaEm: string | null
  estado: EstadoDoServidor
  valor: number | null
  anterior: number | null
  comparavel: boolean
  partes: Record<string, number>
  quebra: DadosDoNegocio['quebra']
  serie: { granularidade: 'dia' | 'semana'; pontos: Array<{ data: string; valor: number | null }> } | null
  desde: string | null
  explicacao: string
}

export interface RespostaDasMetricas {
  escopo: 'empresa' | 'minhas'
  metricas: MetricaDoServidor[]
}

export interface ItemDaListaDaMetrica {
  chave: string
  contatoId: string | null
  contatoNome: string | null
  conversaId: string | null
  em: string
  atributos: Record<string, unknown>
  convertido?: boolean
  precoCents?: number | null
}

export interface PaginaDaListaDaMetrica {
  total: number
  pagina: number
  limite: number
  itens: ItemDaListaDaMetrica[]
}

const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const emReais = (unidade: KpiUnit, v: number | null) => (v !== null && unidade === 'currency' ? v / 100 : v)
const plural = (q: number, um: string, varios: string) => `${q.toLocaleString('pt-BR')} ${q === 1 ? um : varios}`

/** Linha de apoio do cartão: os estados e as partes que nunca podem sumir (G7, G12, G1). */
export function apoioDoNegocio(m: Pick<MetricaDoServidor, 'estado' | 'partes' | 'selos'>): { texto: string | null; alerta: boolean } {
  const p = m.partes ?? {}
  switch (m.estado) {
    case 'erro':
      return { texto: 'não foi possível calcular agora', alerta: true }
    case 'tempo_esgotado':
      return { texto: 'o cálculo demorou demais — tente de novo', alerta: true }
    case 'sem_dado':
      return { texto: 'sem dado ainda', alerta: false }
    case 'periodo_curto':
      return { texto: 'precisa de 7 dias ou mais', alerta: false }
    case 'base_pequena': {
      const base = numero(p.base)
      const conv = numero(p.convertidos)
      return { texto: base !== null && conv !== null ? `${conv} de ${base} · base pequena para %` : 'base pequena para %', alerta: false }
    }
    default:
      break
  }
  const partes: string[] = []
  if (m.selos?.includes('estimado')) partes.push('estimado')
  const base = numero(p.base)
  const conv = numero(p.convertidos)
  if (base !== null && conv !== null) partes.push(`${conv} de ${base}`)
  const prazo = numero(p.dentroDoPrazo)
  if (prazo) partes.push(`${plural(prazo, 'dentro do prazo', 'dentro do prazo')}`)
  const semPreco = numero(p.semPreco)
  if (semPreco) partes.push(`${plural(semPreco, 'sem preço', 'sem preço')}`)
  const semDetalhe = (numero(p.semDetalhe) ?? 0) + (numero(p.semEspecialidade) ?? 0)
  if (semDetalhe) partes.push(`${plural(semDetalhe, 'sem detalhe', 'sem detalhe')}`)
  return { texto: partes.length ? partes.join(' · ') : null, alerta: false }
}

/** Uma métrica do servidor → o cartão do painel. */
export function kpiDoServidor(m: MetricaDoServidor): KpiMetric {
  const unit: KpiUnit = m.unidade
  const value = emReais(unit, numero(m.valor))
  const anterior = m.comparavel ? emReais(unit, numero(m.anterior)) : null
  const pontos = m.serie?.pontos.map((x) => emReais(unit, numero(x.valor))) ?? []
  const apoio = apoioDoNegocio(m)
  const ajuda = [m.ajuda, m.explicacao ? `Como calculamos: ${m.explicacao}` : null].filter(Boolean).join('\n\n')
  return {
    id: m.chave,
    label: m.rotulo,
    category: m.grupo,
    unit,
    trendIsGood: m.sentido,
    hasData: true,
    help: ajuda || undefined,
    value,
    detail: apoio.texto,
    meta: null,
    ...(m.estado === 'ok' ? variacao(value, anterior, unit) : { trend: null }),
    // Série só sem buraco (semana sem base mínima vem `null`).
    sparkline: pontos.length >= 2 && pontos.every((v) => v !== null) ? (pontos as number[]) : [],
    negocio: {
      estado: m.estado,
      partes: m.partes ?? {},
      quebra: Array.isArray(m.quebra) ? m.quebra : [],
      explicacao: m.explicacao ?? '',
      selos: m.selos ?? [],
      desde: m.desde ?? null,
      versao: m.versao,
      publicadaEm: m.publicadaEm ?? null,
    },
  }
}

/**
 * Junta as métricas do negócio aos cards fixos: a de mesmo id substitui o fixo
 * no lugar dele (o slot salvo continua valendo); as demais entram no fim, na
 * ordem do servidor. Sem resposta (falhou ou atendente), fica o fixo.
 */
export function juntarMetricasDoNegocio(fixos: KpiMetric[], resposta: RespostaDasMetricas | null | undefined): KpiMetric[] {
  const lista = resposta && Array.isArray(resposta.metricas) ? resposta.metricas : []
  if (lista.length === 0) return fixos
  const doServidor = new Map(lista.map((m) => [m.chave, kpiDoServidor(m)]))
  const out = fixos.map((k) => doServidor.get(k.id) ?? k)
  const ja = new Set(fixos.map((k) => k.id))
  for (const [id, k] of doServidor) if (!ja.has(id)) out.push(k)
  return out
}

/** Rótulo dos atributos que aparecem na lista "Quais são?". */
const ROTULO_DO_ATRIBUTO: Record<string, string> = {
  especialidade_canonica: 'Especialidade',
  havia_horario: 'Havia horário',
  data_consulta: 'Consulta',
}

/** Atributos legíveis de um item (só os conhecidos; ids internos ficam de fora). */
export function atributosLegiveis(atributos: Record<string, unknown>): Array<{ rotulo: string; valor: string }> {
  const out: Array<{ rotulo: string; valor: string }> = []
  for (const [chave, rotulo] of Object.entries(ROTULO_DO_ATRIBUTO)) {
    const v = atributos?.[chave]
    if (v === undefined || v === null || v === '') continue
    if (typeof v === 'boolean') out.push({ rotulo, valor: v ? 'sim' : 'não' })
    else if (chave === 'data_consulta' && typeof v === 'string' && !Number.isNaN(Date.parse(v))) {
      out.push({ rotulo, valor: new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) })
    } else out.push({ rotulo, valor: String(v) })
  }
  return out
}
