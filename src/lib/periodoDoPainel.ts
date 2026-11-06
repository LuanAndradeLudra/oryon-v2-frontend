import type { DateRange } from '@/types/dashboard'

/**
 * Período da aba Relatórios do Dashboard (28/09; períodos novos em 05/11).
 *
 * O backend aceita `?range=today|7d|30d|month` em `/home/stats` e
 * `/home/snapshot` (A-71). Nem tudo segue o período, porém — parte da tela é
 * estado atual, janela fixa ou histórico inteiro, e isso não se resolve no
 * frontend. Em vez de fingir que filtra, cada cartão diz o próprio recorte
 * (`ESCOPO`); o que segue o período não precisa de etiqueta: vale o seletor.
 *
 * SCRUM-1216 (05/11): além dos quatro, "Últimos 90 dias", "Mês anterior" e um
 * intervalo "De … até …" (até 400 dias, no máximo até hoje), e a comparação
 * com o período anterior (padrão) ou com o mesmo período do ano anterior.
 * O dia é o de Brasília, como no backend (`dashboard-periodo.util.ts`).
 * Tudo vive na URL (`?periodo=`, `?de=`, `?ate=`, `?comparar=`).
 */

export const PERIODOS: ReadonlyArray<{ value: DateRange; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês anterior' },
]

/** Com quem o período é comparado nas variações dos cards. */
export type Comparacao = 'anterior' | 'ano_anterior'

export type Periodo =
  | { tipo: 'fixo'; valor: DateRange; comparar: Comparacao }
  /** `de` e `ate` em `AAAA-MM-DD` (dia de Brasília), os dois inclusos. */
  | { tipo: 'personalizado'; de: string; ate: string; comparar: Comparacao }

export const PERIODO_PADRAO_VALOR: DateRange = '7d'
export const PERIODO_PADRAO: Periodo = { tipo: 'fixo', valor: PERIODO_PADRAO_VALOR, comparar: 'anterior' }

/** Teto do intervalo personalizado (o mesmo do backend). */
export const MAX_DIAS_PERSONALIZADO = 400

const FUSO = 'America/Sao_Paulo'
const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/
const DIA_MS = 24 * 60 * 60 * 1000

/** Hoje no dia de Brasília (`AAAA-MM-DD`). */
export function hojeEmBrasilia(agora: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora)
}

/** `AAAA-MM-DD` → número de dias desde a época (sem fuso: é só o calendário). */
function diaComoNumero(dia: string): number | null {
  if (!DIA_ISO.test(dia)) return null
  const [y, m, d] = dia.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  const volta = new Date(t)
  // 2026-02-31 não é um dia.
  if (volta.getUTCFullYear() !== y || volta.getUTCMonth() !== m - 1 || volta.getUTCDate() !== d) return null
  return Math.round(t / DIA_MS)
}

/** Quantos dias o intervalo cobre, contando os dois extremos. */
export function diasDoIntervalo(de: string, ate: string): number | null {
  const a = diaComoNumero(de)
  const b = diaComoNumero(ate)
  return a === null || b === null ? null : b - a + 1
}

/** Dias atrás de hoje (para o valor inicial do "De … até …"). */
export function diaMenos(dia: string, dias: number): string {
  const n = diaComoNumero(dia)
  if (n === null) return dia
  return new Date((n - dias) * DIA_MS).toISOString().slice(0, 10)
}

/**
 * Valida o "De … até …". `null` = válido; senão, a mensagem para quem escolhe.
 * Regras: datas reais, início ≤ fim, fim no máximo hoje, até 400 dias.
 */
export function validarIntervalo(de: string, ate: string, agora: Date = new Date()): string | null {
  if (!de || !ate) return 'Escolha as duas datas.'
  const a = diaComoNumero(de)
  const b = diaComoNumero(ate)
  if (a === null || b === null) return 'Data inválida.'
  if (a > b) return 'A data inicial precisa ser antes da final.'
  const hoje = diaComoNumero(hojeEmBrasilia(agora))!
  if (b > hoje) return 'O período vai no máximo até hoje.'
  if (b - a + 1 > MAX_DIAS_PERSONALIZADO) return `O período pode ter no máximo ${MAX_DIAS_PERSONALIZADO} dias (este tem ${b - a + 1}).`
  return null
}

function lerComparacao(v: string | null): Comparacao {
  return v === 'ano' ? 'ano_anterior' : 'anterior'
}

/**
 * Lê o período da URL. Aceita a string antiga (`lerPeriodo('30d')`) ou os
 * parâmetros da tela. Qualquer coisa inválida — inclusive um personalizado
 * que deixou de valer (datas impossíveis, mais de 400 dias, fim no futuro) —
 * cai no padrão, mantendo a comparação escolhida. Nunca devolve um período
 * que o backend recusaria.
 */
export function lerPeriodo(entrada: URLSearchParams | string | null, agora: Date = new Date()): Periodo {
  const params = entrada instanceof URLSearchParams ? entrada : new URLSearchParams(entrada === null ? '' : `periodo=${encodeURIComponent(entrada)}`)
  const v = params.get('periodo')
  const comparar = lerComparacao(params.get('comparar'))
  if (v === 'personalizado') {
    const de = params.get('de') ?? ''
    const ate = params.get('ate') ?? ''
    if (validarIntervalo(de, ate, agora) === null) return { tipo: 'personalizado', de, ate, comparar }
    return { ...PERIODO_PADRAO, comparar }
  }
  const fixo = PERIODOS.find((p) => p.value === v)
  return { tipo: 'fixo', valor: fixo ? fixo.value : PERIODO_PADRAO_VALOR, comparar }
}

/** Grava o período nos parâmetros da URL (o padrão não ocupa a URL). */
export function escreverPeriodo(prev: URLSearchParams, p: Periodo): URLSearchParams {
  const next = new URLSearchParams(prev)
  next.delete('de')
  next.delete('ate')
  if (p.tipo === 'personalizado') {
    next.set('periodo', 'personalizado')
    next.set('de', p.de)
    next.set('ate', p.ate)
  } else if (p.valor === PERIODO_PADRAO_VALOR) {
    next.delete('periodo')
  } else {
    next.set('periodo', p.valor)
  }
  if (p.comparar === 'ano_anterior') next.set('comparar', 'ano')
  else next.delete('comparar')
  return next
}

/** Identificador estável (igualdade, cache, "qual período está à vista"). */
export function chaveDoPeriodo(p: Periodo): string {
  const base = p.tipo === 'personalizado' ? `${p.de}..${p.ate}` : p.valor
  return p.comparar === 'ano_anterior' ? `${base}:ano` : base
}

/** "01/10" (ou "01/10/2025" quando não é do ano corrente). */
function diaCurto(dia: string, anoCorrente: string): string {
  const [y, m, d] = dia.split('-')
  return y === anoCorrente ? `${d}/${m}` : `${d}/${m}/${y}`
}

/** Texto da pílula do seletor: "7 dias", "Mês anterior", "01/10 – 15/10". */
export function rotuloDoPeriodo(p: Periodo, agora: Date = new Date()): string {
  if (p.tipo === 'fixo') return PERIODOS.find((x) => x.value === p.valor)?.label ?? p.valor
  const ano = hojeEmBrasilia(agora).slice(0, 4)
  return p.de === p.ate ? diaCurto(p.de, ano) : `${diaCurto(p.de, ano)} – ${diaCurto(p.ate, ano)}`
}

/** "hoje" · "nos últimos 7 dias" · "no mês anterior" · "de 01/10 a 15/10" — para frases. */
export function periodoPorExtenso(p: Periodo | DateRange, agora: Date = new Date()): string {
  const per: Periodo = typeof p === 'string' ? { tipo: 'fixo', valor: p, comparar: 'anterior' } : p
  if (per.tipo === 'personalizado') {
    const ano = hojeEmBrasilia(agora).slice(0, 4)
    return per.de === per.ate ? `em ${diaCurto(per.de, ano)}` : `de ${diaCurto(per.de, ano)} a ${diaCurto(per.ate, ano)}`
  }
  switch (per.valor) {
    case 'today': return 'hoje'
    case '7d': return 'nos últimos 7 dias'
    case '30d': return 'nos últimos 30 dias'
    case '90d': return 'nos últimos 90 dias'
    case 'month': return 'neste mês'
    case 'last_month': return 'no mês anterior'
  }
}

/** Com quem os cards comparam: "período anterior" ou "mesmo período do ano anterior". */
export function comparacaoPorExtenso(c: Comparacao): string {
  return c === 'ano_anterior' ? 'mesmo período do ano anterior' : 'período anterior'
}

/** O recorte de quem NÃO segue o período. */
export const ESCOPO = {
  agora: 'agora',
  historico: 'todo o histórico',
  seteDias: 'últimos 7 dias',
  quatroHoras: 'últimas 4 h',
} as const

/**
 * K11/K9 (release 2026-09-29): o backend manda o volume já no período pedido e
 * em dias de Brasília — o front não recorta nem escolhe balde.
 */
export function volumeSeguePeriodo(p: Periodo | DateRange): boolean {
  void p
  return true
}

/**
 * Parâmetros das rotas do app (`/home/stats`, `/home/snapshot`, `/home/metrics`
 * e a lista do "Quais são?") para um período — contrato SCRUM-1216 de 05/11
 * (`backend/src/modules/dashboard/periodo-do-app.ts`):
 *  - `range=today|7d|30d|month|90d|last_month`;
 *  - ou `from`/`to` (`AAAA-MM-DD`, dia de Brasília), sem `range` junto;
 *  - `compare=1` (período anterior, o de sempre) ou `compare=previous_year`.
 *
 * `comparar`: `'sempre'` nas rotas que sempre comparam (stats e snapshot);
 * `'ano'` nas que só mudam a comparação quando é o ano anterior (métricas do
 * negócio); sem nada, nenhum `compare` (a lista do "Quais são?").
 * Sem período novo, os parâmetros são exatamente os de antes.
 */
export function paramsDoPeriodo(p: Periodo, opts: { comparar?: 'sempre' | 'ano' } = {}): Record<string, string | number> {
  const base: Record<string, string | number> = p.tipo === 'personalizado' ? { from: p.de, to: p.ate } : { range: p.valor }
  const ano = p.comparar === 'ano_anterior'
  if (opts.comparar === 'sempre') return { ...base, compare: ano ? 'previous_year' : 1 }
  if (opts.comparar === 'ano' && ano) return { ...base, compare: 'previous_year' }
  return base
}

/**
 * Eco do período na resposta (`period`), só quando o pedido usou um parâmetro
 * novo (90d, last_month, from/to ou compare=previous_year). É a fonte do
 * rótulo: o backend diz qual janela calculou.
 */
export interface EcoDoPeriodo {
  id: DateRange | 'custom'
  /** Primeiro e último dia (inclusive), `AAAA-MM-DD` no dia de Brasília. */
  from: string
  to: string
  start: string
  end: string
  complete: boolean
  timezone: string
  compare: 'previous_period' | 'previous_year' | null
  previous: { from: string; to: string; start: string; end: string } | null
  /** Ano anterior de antes de a conta existir: sem comparação. */
  previousReason: 'before_account' | null
}

const IDS_FIXOS: ReadonlySet<string> = new Set(PERIODOS.map((p) => p.value))

/** O período que o backend diz ter calculado (para rótulos), ou `null` sem eco válido. */
export function periodoDoEco(eco: unknown): Periodo | null {
  if (!eco || typeof eco !== 'object') return null
  const e = eco as Partial<EcoDoPeriodo>
  const comparar: Comparacao = e.compare === 'previous_year' ? 'ano_anterior' : 'anterior'
  if (e.id === 'custom') {
    if (typeof e.from !== 'string' || typeof e.to !== 'string' || !DIA_ISO.test(e.from) || !DIA_ISO.test(e.to)) return null
    return { tipo: 'personalizado', de: e.from, ate: e.to, comparar }
  }
  if (typeof e.id === 'string' && IDS_FIXOS.has(e.id)) return { tipo: 'fixo', valor: e.id as DateRange, comparar }
  return null
}

/**
 * Tempo real (06/11): o período ainda pode mudar? Os que terminam hoje sim
 * (today, 7d, 30d, month, 90d e um personalizado até hoje); o mês anterior e
 * um personalizado no passado nunca mudam — o evento de métricas é ignorado.
 */
export function periodoIncluiHoje(p: Periodo, agora: Date = new Date()): boolean {
  if (p.tipo === 'personalizado') return p.ate === hojeEmBrasilia(agora)
  return p.valor !== 'last_month'
}
