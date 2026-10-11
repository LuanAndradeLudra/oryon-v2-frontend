/**
 * Pré-busca de curta duração (homologação 06/10, SCRUM-1253 — desempenho de
 * Conversas). Ao recarregar com `?id=`, a lista, a conversa e as mensagens
 * saíam em SÉRIE (lista → só então a conversa → só então as mensagens); com a
 * latência real cada etapa custa uma ida e volta. Aqui a página dispara a
 * conversa e a 1ª página de mensagens logo no início, e quem precisa delas
 * (useConversationFromUrl, useMessages) reaproveita a mesma promessa.
 *
 * Cada entrada vale poucos segundos e é usada UMA vez — depois disso tudo volta
 * a buscar normalmente (tempo real, paginação, troca de conversa).
 *
 * Revisão 11/10: o cache é da SESSÃO — some no logout (lib/limpezaDaSessao),
 * senão uma conta nova podia receber, dentro dos 10 s, a conversa pré-buscada
 * pela anterior.
 */
import { aoSairDaSessao } from '@/lib/limpezaDaSessao'

const VALIDADE_MS = 10_000

const cache = new Map<string, { promessa: Promise<unknown>; em: number }>()

export function preBuscar<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
  const atual = cache.get(chave)
  if (atual && Date.now() - atual.em < VALIDADE_MS) return atual.promessa as Promise<T>
  const promessa = buscar()
  // Falhou: some do cache, para quem vier depois buscar de novo — mas só se a
  // entrada ainda for ESTA promessa (uma pré-busca mais nova da mesma chave
  // não pode ser apagada pela falha da antiga; mesma regra de compartilharEmVoo).
  promessa.catch(() => { if (cache.get(chave)?.promessa === promessa) cache.delete(chave) })
  cache.set(chave, { promessa, em: Date.now() })
  return promessa
}

/** Pega (e consome) uma pré-busca ainda válida; null se não houver. */
export function usarPreBusca<T>(chave: string): Promise<T> | null {
  const atual = cache.get(chave)
  cache.delete(chave)
  if (!atual || Date.now() - atual.em >= VALIDADE_MS) return null
  return atual.promessa as Promise<T>
}

/** Descarta a pré-busca de `chave` (quem a usava terminou sem precisar consumi-la). */
export function descartarPreBusca(chave: string): void {
  cache.delete(chave)
}

const emVoo = new Map<string, { promessa: Promise<unknown>; em: number }>()
/** Só junta pedidos que começaram praticamente juntos — um pedido que já estava
 *  em voo ANTES de uma ação (ex.: pausar a IA) não pode responder por um feito
 *  depois dela. */
const JANELA_EM_VOO_MS = 150

/**
 * Pedidos IGUAIS ao mesmo tempo viram um só (homologação 06/10, SCRUM-1253):
 * na carga de Conversas, o histórico de eventos, as linhas de WhatsApp e o
 * token do socket saíam 2× — cada componente pedia o seu. Só junta enquanto o
 * pedido está em voo; terminou, o próximo busca de novo (nada fica velho).
 */
export function compartilharEmVoo<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
  const atual = emVoo.get(chave)
  if (atual && Date.now() - atual.em <= JANELA_EM_VOO_MS) return atual.promessa as Promise<T>
  const promessa = buscar().finally(() => { if (emVoo.get(chave)?.promessa === promessa) emVoo.delete(chave) })
  emVoo.set(chave, { promessa, em: Date.now() })
  return promessa
}

aoSairDaSessao(() => { cache.clear(); emVoo.clear() })
