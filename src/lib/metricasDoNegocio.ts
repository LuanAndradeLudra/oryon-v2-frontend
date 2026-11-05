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
 *  - moeda vem em centavos → reais UMA vez, aqui (valor, série e quebra);
 *  - a variação sai do valor cru, só com `comparavel` (regra G11/G13);
 *  - `null` é "sem dado" ("—"), nunca zero;
 *  - a métrica com o mesmo id de um card fixo (`appointments_*`) o substitui;
 *  - se `/home/metrics` falhar, os ids do catálogo aparecem em ERRO — nunca o
 *    card fixo de antes, com outra fórmula (A2).
 */

export type EstadoDoServidor = Exclude<DadosDoNegocio['estado'], 'carregando'>

export interface MetricaDoCatalogo {
  chave: string
  rotulo: string
  grupo: string
  unidade: 'count' | 'percent' | 'currency'
  sentido: 'up' | 'down' | 'neutral'
  ajuda: string | null
  selos: DadosDoNegocio['selos']
  deEstado?: boolean
  versao: number
  publicadaEm: string | null
}

export interface MetricaDoServidor extends MetricaDoCatalogo {
  estado: EstadoDoServidor
  valor: number | null
  anterior: number | null
  comparavel: boolean
  partes: Record<string, number>
  quebra: DadosDoNegocio['quebra']
  serie: { granularidade: 'dia' | 'semana'; pontos: Array<{ data: string; valor: number | null }> } | null
  /** Na conversão: as datas da coorte que o número cobre. */
  janela?: { inicio: string; fim: string } | null
  desde: string | null
  explicacao: string
}

export interface RespostaDasMetricas {
  escopo: 'empresa' | 'minhas'
  metricas: MetricaDoServidor[]
}

export interface RespostaDoCatalogo {
  escopo: 'empresa' | 'minhas'
  metricas: MetricaDoCatalogo[]
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
  /** Por que o preço é nulo (A22). */
  motivo?: 'sem_especialidade' | 'sem_preco'
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
const ddmm = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })

/** Partes que nunca podem sumir do cartão (G1, G7, G12): dentro do prazo, sem ligação, sem preço, sem detalhe. */
function partesVisiveis(p: Record<string, number>): string[] {
  const out: string[] = []
  const prazo = numero(p.dentroDoPrazo)
  if (prazo) out.push(plural(prazo, 'dentro do prazo', 'dentro do prazo'))
  const semLigacao = numero(p.semLigacao)
  if (semLigacao) out.push(plural(semLigacao, 'sem contato', 'sem contato'))
  const semPreco = numero(p.semPreco)
  if (semPreco) out.push(plural(semPreco, 'sem preço', 'sem preço'))
  const semDetalhe = (numero(p.semDetalhe) ?? 0) + (numero(p.semEspecialidade) ?? 0)
  if (semDetalhe) out.push(plural(semDetalhe, 'sem detalhe', 'sem detalhe'))
  return out
}

/** Linha de apoio do cartão: o estado e as partes. "Estimado" e "pela IA" ficam no selo, não aqui. */
export function apoioDoNegocio(m: Pick<MetricaDoServidor, 'estado' | 'partes' | 'janela'>): string | null {
  const p = m.partes ?? {}
  switch (m.estado) {
    case 'erro':
      return 'não foi possível calcular agora'
    case 'tempo_esgotado':
      return 'o cálculo demorou demais — tente de novo'
    case 'sem_dado':
      return 'sem dado ainda'
    case 'periodo_curto':
      return 'precisa de 7 dias ou mais'
    default:
      break
  }
  const out: string[] = []
  // A6: a coorte da conversão com prazo fixo é deslocada — o cartão diz de quando é.
  if (m.janela) out.push(`pedidos de ${ddmm(m.janela.inicio)} a ${ddmm(new Date(new Date(m.janela.fim).getTime() - 1).toISOString())}`)
  const base = numero(p.base)
  const conv = numero(p.convertidos)
  if (base !== null && conv !== null) out.push(m.estado === 'base_pequena' ? `${conv} de ${base} · base pequena para %` : `${conv} de ${base}`)
  else if (m.estado === 'base_pequena') out.push('base pequena para %')
  out.push(...partesVisiveis(p))
  return out.length ? out.join(' · ') : null
}

/** Uma métrica do servidor → o cartão do painel. */
export function kpiDoServidor(m: MetricaDoServidor): KpiMetric {
  const unit: KpiUnit = m.unidade
  const value = emReais(unit, numero(m.valor))
  const anterior = m.comparavel ? emReais(unit, numero(m.anterior)) : null
  const pontos = m.serie?.pontos.map((x) => emReais(unit, numero(x.valor))) ?? []
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
    detail: apoioDoNegocio(m),
    meta: null,
    ...(m.estado === 'ok' ? variacao(value, anterior, unit) : { trend: null }),
    // Série só sem buraco (semana sem base mínima e dia antes do 1º dado vêm `null`).
    sparkline: pontos.length >= 2 && pontos.every((v) => v !== null) ? (pontos as number[]) : [],
    negocio: {
      estado: m.estado,
      partes: m.partes ?? {},
      // Na mesma unidade do cartão (reais), para ninguém dividir de novo (A42).
      quebra: (Array.isArray(m.quebra) ? m.quebra : []).map((q) => ({ ...q, valor: emReais(unit, numero(q.valor)) })),
      explicacao: m.explicacao ?? '',
      selos: m.selos ?? [],
      deEstado: m.deEstado === true,
      janela: m.janela ?? null,
      desde: m.desde ?? null,
      versao: m.versao,
      publicadaEm: m.publicadaEm ?? null,
    },
  }
}

/** Card do catálogo sem valor: em erro (o cálculo falhou) ou carregando (ainda não chegou). */
export function kpiSemValor(c: MetricaDoCatalogo, estado: 'erro' | 'carregando'): KpiMetric {
  return {
    id: c.chave,
    label: c.rotulo,
    category: c.grupo,
    unit: c.unidade,
    trendIsGood: c.sentido,
    hasData: true,
    help: c.ajuda ?? undefined,
    value: null,
    detail: estado === 'erro' ? 'indisponível agora' : 'carregando…',
    meta: null,
    trend: null,
    sparkline: [],
    negocio: {
      estado, partes: {}, quebra: [], explicacao: '', selos: c.selos ?? [], deEstado: c.deEstado === true,
      janela: null, desde: null, versao: c.versao, publicadaEm: c.publicadaEm ?? null,
    },
  }
}

/**
 * Junta as métricas do negócio aos cards fixos: a de mesmo id substitui o fixo
 * no lugar dele (o slot salvo continua valendo); as demais entram no fim.
 * Sem valores (falhou ou ainda não chegou), os ids do CATÁLOGO entram no
 * `estado` dado — nunca o card fixo com a fórmula antiga (A2). Sem catálogo
 * (atendente, cliente sem métrica), ficam os fixos.
 */
export function juntarMetricasDoNegocio(
  fixos: KpiMetric[],
  resposta: RespostaDasMetricas | null | undefined,
  catalogo: MetricaDoCatalogo[] = [],
  semValor: 'erro' | 'carregando' = 'erro',
): KpiMetric[] {
  const lista = resposta && Array.isArray(resposta.metricas) ? resposta.metricas : null
  const doServidor = new Map<string, KpiMetric>()
  if (lista) for (const m of lista) doServidor.set(m.chave, kpiDoServidor(m))
  else for (const c of catalogo) doServidor.set(c.chave, kpiSemValor(c, semValor))
  if (doServidor.size === 0) return fixos
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
      // Só a data veio do sistema da clínica (gravada às 23:59:59): mostra só o dia (A18).
      const soDia = atributos?.hora_conhecida === false
      out.push({
        rotulo,
        valor: new Date(v).toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', ...(soDia ? {} : { hour: '2-digit', minute: '2-digit' }),
        }),
      })
    } else out.push({ rotulo, valor: String(v) })
  }
  return out
}
