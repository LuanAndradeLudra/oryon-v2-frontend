/**
 * Filtros da tela de Leads (/contacts) na URL — regra do PO: filtro, busca e
 * ordem sobrevivem ao F5, ao "voltar" da ficha e ao link colado. Mesmo
 * desenho de `filtrosDaInbox.ts`: `ler` da query, `escrever` sobre a query
 * atual (mantém `view`, `contact`, `voltarPara`…), `chave` estável.
 *
 * Nomes curtos em português. A ordenação padrão da tela (mais recentes
 * primeiro) não vai para a URL.
 */
import type { ContactFilters, ContactIntent, ContactSentiment, ContactSource } from '@/types'

export const ORDEM_PADRAO_CONTATOS = { sortBy: 'createdAt', sortDir: 'desc' } as const

type SortBy = NonNullable<ContactFilters['sortBy']>
const ORDEM_PARA_URL: Record<SortBy, string> = {
  createdAt: 'criacao',
  displayName: 'nome',
  leadScore: 'score',
  lastContactedAt: 'ultimoContato',
}
const ORDEM_DA_URL = Object.fromEntries(Object.entries(ORDEM_PARA_URL).map(([k, v]) => [v, k])) as Record<string, SortBy>

const SENTIMENTOS: readonly ContactSentiment[] = ['positive', 'neutral', 'negative', 'unknown']
const INTENCOES: readonly ContactIntent[] = ['low', 'medium', 'high', 'unknown']
const ORIGENS: readonly ContactSource[] = ['whatsapp', 'instagram', 'facebook', 'website', 'referral', 'campaign', 'manual', 'import', 'other', 'meta_ads']
const SCORES = ['high', 'medium', 'low'] as const
const ULTIMO_CONTATO = ['24h', '7d', '30d', 'none'] as const
export const SITUACOES = ['all', 'no_deal', 'open_deal', 'customer'] as const
export type Situacao = (typeof SITUACOES)[number]

/** Chaves que estes filtros ocupam — `escrever` só mexe nelas. */
export const CHAVES_FILTROS_CONTATOS = [
  'busca', 'etapa', 'etiqueta', 'origem', 'sentimento', 'intencao', 'optin', 'score', 'ultimoContato', 'ordem', 'direcao',
] as const

function umDe<T extends string>(lista: readonly T[], v: string | null): T | undefined {
  return v !== null && (lista as readonly string[]).includes(v) ? (v as T) : undefined
}
const lista = (v: string | null) => (v ? v.split(',').filter(Boolean) : undefined)

export function lerFiltrosDeContatos(sp: URLSearchParams): ContactFilters {
  const f: ContactFilters = {}
  const busca = sp.get('busca')?.trim()
  if (busca) f.search = busca
  const etapa = lista(sp.get('etapa'))
  if (etapa?.length) f.stage = etapa
  const etiqueta = lista(sp.get('etiqueta'))
  if (etiqueta?.length) f.tagId = etiqueta
  f.source = umDe(ORIGENS, sp.get('origem'))
  f.sentiment = umDe(SENTIMENTOS, sp.get('sentimento'))
  f.intent = umDe(INTENCOES, sp.get('intencao'))
  if (sp.get('optin') === '1') f.optIn = true
  else if (sp.get('optin') === '0') f.optIn = false
  f.leadScoreBand = umDe(SCORES, sp.get('score'))
  f.lastContact = umDe(ULTIMO_CONTATO, sp.get('ultimoContato'))
  const ordem = ORDEM_DA_URL[sp.get('ordem') ?? '']
  const direcao = umDe(['asc', 'desc'] as const, sp.get('direcao'))
  f.sortBy = ordem ?? ORDEM_PADRAO_CONTATOS.sortBy
  f.sortDir = direcao ?? ORDEM_PADRAO_CONTATOS.sortDir
  for (const k of Object.keys(f) as (keyof ContactFilters)[]) if (f[k] === undefined) delete f[k]
  return f
}

/** Aplica `f` sobre a query atual sem tocar nas chaves de outras coisas. */
export function escreverFiltrosDeContatos(prev: URLSearchParams, f: ContactFilters): URLSearchParams {
  const p = new URLSearchParams(prev)
  CHAVES_FILTROS_CONTATOS.forEach((k) => p.delete(k))
  const set = (k: string, v: string | undefined | null) => { if (v) p.set(k, v) }
  set('busca', f.search?.trim())
  set('etapa', f.stage?.length ? f.stage.join(',') : null)
  set('etiqueta', f.tagId?.length ? f.tagId.join(',') : null)
  set('origem', f.source)
  set('sentimento', f.sentiment)
  set('intencao', f.intent)
  if (f.optIn !== undefined) p.set('optin', f.optIn ? '1' : '0')
  set('score', f.leadScoreBand)
  set('ultimoContato', f.lastContact)
  const ehPadrao = (f.sortBy ?? ORDEM_PADRAO_CONTATOS.sortBy) === ORDEM_PADRAO_CONTATOS.sortBy
    && (f.sortDir ?? ORDEM_PADRAO_CONTATOS.sortDir) === ORDEM_PADRAO_CONTATOS.sortDir
  if (!ehPadrao && f.sortBy) {
    p.set('ordem', ORDEM_PARA_URL[f.sortBy])
    p.set('direcao', f.sortDir ?? ORDEM_PADRAO_CONTATOS.sortDir)
  }
  return p
}

/** Chave estável dos filtros (para memoizar o objeto lido da URL). */
export function chaveDosFiltrosDeContatos(sp: URLSearchParams): string {
  return CHAVES_FILTROS_CONTATOS.map((k) => `${k}=${sp.get(k) ?? ''}`).join('&')
}

export function lerSituacao(sp: URLSearchParams): Situacao {
  return umDe(SITUACOES, sp.get('situacao')) ?? 'all'
}
