import { conversationsApi, messagesApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import { ehFila, lerFiltros } from '@/lib/filtrosDaInbox'
import { preBuscar } from '@/lib/preBusca'
import type { ConversationFilters } from '@/types'

/** Tamanhos de página da lista — os mesmos de useConversations. */
export const LISTA_POR_PAGINA = 50
export const FILA_POR_PAGINA = 100

/** A chave de uma página da lista: os filtros (em ordem fixa) + página + limite. */
export function chaveDaLista(filtros: ConversationFilters, pagina: number, limite: number): string {
  const ordenado = Object.keys(filtros).sort()
    .filter((k) => filtros[k as keyof ConversationFilters] !== undefined)
    .map((k) => `${k}=${String(filtros[k as keyof ConversationFilters])}`)
  return `lista:${ordenado.join('&')}:${pagina}:${limite}`
}

/**
 * Homologação 06/10 (SCRUM-1253, desempenho — proposta D): ao abrir o app
 * direto em /conversations, a 1ª página da lista (e, com `?id=`, a conversa e
 * as mensagens dela) sai JÁ no boot, em paralelo com o `auth/me` e com o
 * download da tela — antes esperava os dois. Quem precisa delas reaproveita a
 * mesma promessa (lib/preBusca); se o filtro mudar antes, a chave não bate e a
 * busca normal acontece.
 */
export function preBuscarConversasDaUrl(): void {
  if (typeof window === 'undefined' || window.location.pathname !== '/conversations') return
  const sp = new URLSearchParams(window.location.search)
  const filtros = lerFiltros(sp)
  const limite = ehFila(filtros) ? FILA_POR_PAGINA : LISTA_POR_PAGINA
  void preBuscar(chaveDaLista(filtros, 1, limite), () => withRetry(() => conversationsApi.list(filtros, 1, limite))).catch(() => {})
  const id = sp.get('id')
  if (id) {
    void preBuscar(`conversa:${id}`, () => conversationsApi.get(id).then((r) => r.data)).catch(() => {})
    void preBuscar(`mensagens:${id}`, () => withRetry(() => messagesApi.list(id, 1, 50))).catch(() => {})
  }
}
