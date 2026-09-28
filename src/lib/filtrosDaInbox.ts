import type { ConversationFilters } from '@/types'

/**
 * Aba e filtros da inbox NA URL (28/09 — regra do PO: estado de tela vive na
 * URL e o "voltar" devolve o contexto). Antes tudo ficava em memória: recarregar
 * ou voltar de outra tela levava sempre para "Todas" sem filtro.
 *
 * Nomes legíveis e estáveis (um link colado abre a mesma lista). Só entra na
 * URL o que difere do padrão; `id` (a conversa aberta) e parâmetros de outras
 * telas (`deal`, `negocio`…) nunca são tocados aqui.
 */

/**
 * A aba "Fila" (28/09, decisão do PO) = conversas PENDENTES que ninguém
 * assumiu. "Pendente" já é, na operação, "precisa de atendimento humano" (a
 * IA marca ao encaminhar); a Fila é o recorte sem dono — um conceito só, sem
 * uma segunda regra para o operador aprender. Antes era "sem dono, de
 * qualquer status": 2.243 conversas no banco local, metade resolvidas.
 *
 * "Sem atribuição" (menu Equipe) continua existindo, de qualquer status —
 * agora distinto da Fila (na URL, `equipe=sem-dono`).
 */
export function ehFila(f: ConversationFilters): boolean {
  return f.assignedTo === 'unassigned' && f.status === 'pending'
}

export type AbaDaInbox = 'me' | 'unassigned' | 'all'

/** Qual aba do segmentado está marcada (nenhuma com "Sem atribuição" ou uma pessoa da equipe). */
export function abaAtiva(f: ConversationFilters): AbaDaInbox | null {
  if (f.assignedTo === 'me') return 'me'
  if (ehFila(f)) return 'unassigned'
  if (!f.assignedTo || f.assignedTo === 'all') return 'all'
  return null
}

/** Troca de aba: entrar na Fila fixa "pendente"; sair dela devolve o status a "todos". */
export function comAba(f: ConversationFilters, aba: AbaDaInbox): ConversationFilters {
  if (aba === 'unassigned') return { ...f, assignedTo: 'unassigned', status: 'pending' }
  return { ...f, assignedTo: aba, status: ehFila(f) ? 'all' : f.status }
}

const ABA_PARA_ASSIGNED: Record<string, ConversationFilters['assignedTo']> = {
  minhas: 'me',
  todas: 'all',
}
const ASSIGNED_PARA_ABA: Record<string, string> = { me: 'minhas', all: 'todas' }
const SEM_DONO = 'sem-dono'

const STATUS = new Set(['open', 'pending', 'resolved'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Todos os parâmetros que este módulo possui. */
export const PARAMS_DOS_FILTROS = [
  'aba', 'equipe', 'status', 'ia', 'naoLidas', 'aguardando', 'semEtiqueta',
  'verificar', 'etiqueta', 'contato', 'busca', 'linha', 'de', 'ate',
] as const

const sim = (v: string | null) => v === '1'

export function lerFiltros(sp: URLSearchParams): ConversationFilters {
  const f: ConversationFilters = { status: 'all' }
  const aba = sp.get('aba')
  const equipe = sp.get('equipe')
  if (equipe && UUID.test(equipe)) f.assignedTo = equipe
  else if (equipe === SEM_DONO) f.assignedTo = 'unassigned'
  else if (aba && ABA_PARA_ASSIGNED[aba]) f.assignedTo = ABA_PARA_ASSIGNED[aba]
  const status = sp.get('status')
  if (status && STATUS.has(status)) f.status = status as ConversationFilters['status']
  // A Fila fixa o status: `aba=fila` vence um `status` avulso na URL.
  if (aba === 'fila' && !f.assignedTo) {
    f.assignedTo = 'unassigned'
    f.status = 'pending'
  }
  const ia = sp.get('ia')
  if (ia === 'atendendo') f.aiHandling = 'active'
  else if (ia === 'pausada') f.aiHandling = 'paused'
  if (sim(sp.get('naoLidas'))) f.unreadOnly = true
  if (sim(sp.get('aguardando'))) f.awaitingReply = true
  if (sim(sp.get('semEtiqueta'))) f.untagged = true
  if (sim(sp.get('verificar'))) f.needsReview = true
  const etiqueta = sp.get('etiqueta')
  if (etiqueta) f.tagId = etiqueta
  const contato = sp.get('contato')
  if (contato) f.contactId = contato
  const busca = sp.get('busca')
  if (busca) f.search = busca
  const linha = sp.get('linha')
  if (linha) f.whatsappNumberId = linha
  const de = sp.get('de')
  const ate = sp.get('ate')
  if (de && ate && !Number.isNaN(Date.parse(de)) && !Number.isNaN(Date.parse(ate))) {
    f.startDate = de
    f.endDate = ate
  }
  return f
}

/** Devolve `prev` com os parâmetros dos filtros trocados pelos de `f` (o resto intacto). */
export function escreverFiltros(prev: URLSearchParams, f: ConversationFilters): URLSearchParams {
  const next = new URLSearchParams(prev)
  for (const p of PARAMS_DOS_FILTROS) next.delete(p)
  const a = f.assignedTo
  const fila = ehFila(f)
  if (fila) next.set('aba', 'fila')
  else if (a && a !== 'all') {
    if (ASSIGNED_PARA_ABA[a]) next.set('aba', ASSIGNED_PARA_ABA[a])
    else if (a === 'unassigned') next.set('equipe', SEM_DONO)
    else if (UUID.test(a)) next.set('equipe', a)
  }
  if (!fila && f.status && f.status !== 'all') next.set('status', f.status)
  if (f.aiHandling === 'active') next.set('ia', 'atendendo')
  else if (f.aiHandling === 'paused') next.set('ia', 'pausada')
  if (f.unreadOnly) next.set('naoLidas', '1')
  if (f.awaitingReply) next.set('aguardando', '1')
  if (f.untagged) next.set('semEtiqueta', '1')
  if (f.needsReview) next.set('verificar', '1')
  if (f.tagId) next.set('etiqueta', f.tagId)
  if (f.contactId) next.set('contato', f.contactId)
  if (f.search) next.set('busca', f.search)
  if (f.whatsappNumberId) next.set('linha', f.whatsappNumberId)
  if (f.startDate && f.endDate) {
    next.set('de', f.startDate)
    next.set('ate', f.endDate)
  }
  return next
}

/** Chave só dos filtros — muda quando um filtro muda, não quando a conversa aberta muda. */
export function chaveDosFiltros(sp: URLSearchParams): string {
  return PARAMS_DOS_FILTROS.map((p) => `${p}=${sp.get(p) ?? ''}`).join('&')
}

/**
 * "Limpar filtros" — UM comportamento para a barra e para o estado vazio
 * (28/09: o do estado vazio zerava também a busca e o filtro de linha da
 * TopBar; o da barra mantinha). Ficam a busca, o contato e a linha: cada um
 * tem controle próprio à vista.
 */
export function semFiltros(f: ConversationFilters): ConversationFilters {
  return { status: 'all', search: f.search, contactId: f.contactId, whatsappNumberId: f.whatsappNumberId }
}
