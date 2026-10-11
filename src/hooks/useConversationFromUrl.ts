import { useEffect, useRef } from 'react'
import type { Conversation } from '@/types'
import { descartarPreBusca, preBuscar, usarPreBusca } from '@/lib/preBusca'
import { messagesApi } from '@/services/api'
import { withRetry } from '@/lib/utils'

interface Options {
  /** `?id=` da URL (null = nenhum). */
  urlId: string | null
  conversations: Conversation[]
  /** Carga inicial da lista em andamento — espera antes de decidir que a conversa "não está na lista". */
  loading: boolean
  /** Conversa aberta agora. */
  activeId: string | null
  /** A conversa da URL está na lista carregada. */
  onFoundInList: (conversation: Conversation) => void
  /** Não estava na lista — foi buscada por id (`fetchById`). */
  onFetched: (conversation: Conversation) => void
  fetchById: (id: string) => Promise<Conversation>
}

/**
 * Revisão 11/10: a entrada `conversa:<id>` da pré-busca é consumida por quem a
 * usa por último (ou descartada quando ninguém mais vai usá-la) — antes ficava
 * 10 s no cache depois de usada.
 */
function buscarConversa(id: string, fetchById: (id: string) => Promise<Conversation>): Promise<Conversation> {
  return usarPreBusca<Conversation>(`conversa:${id}`) ?? fetchById(id)
}

/**
 * Mantém a conversa aberta em sincronia com `?id=` — a cada MUDANÇA do id, não só
 * no mount. Cobre: link externo, reload, e "Nova conversa"/"Abrir conversa" (que
 * navegam para `/conversations?id=<id>` estando JÁ nesta página, inclusive para
 * uma conversa recém-criada que a lista ainda não tem → busca por id).
 * Cada id é tratado uma vez (uma falha de busca não fica tentando de novo); ao
 * tirar o `?id=` o controle zera, então reabrir o mesmo id funciona.
 */
export function useConversationFromUrl({
  urlId, conversations, loading, activeId, onFoundInList, onFetched, fetchById,
}: Options) {
  const handledRef = useRef<string | null>(null)
  // Callbacks entram por ref: o efeito reage a dados, não à identidade das funções.
  const cbRef = useRef({ onFoundInList, onFetched, fetchById })
  useEffect(() => { cbRef.current = { onFoundInList, onFetched, fetchById } })
  // Revisão 03/10: a busca por id que volta depois de o usuário clicar em outra
  // conversa não pode tirá-lo de lá (nem limpar o filtro de datas).
  const urlAtual = useRef(urlId)
  useEffect(() => { urlAtual.current = urlId }, [urlId])

  // Homologação 06/10 (SCRUM-1253, desempenho): com `?id=`, a conversa e a 1ª
  // página de mensagens saem JÁ, em paralelo com a lista — antes esperavam a
  // lista chegar (3 etapas em série). Se a conversa chegar antes da lista, abre.
  const abertaCedo = useRef<string | null>(null)
  useEffect(() => {
    // Só enquanto a lista ainda carrega: com ela pronta, o caminho normal decide.
    if (!urlId || !loading || activeId === urlId || handledRef.current === urlId) return
    const pedido = urlId
    void preBuscar(`mensagens:${pedido}`, () => withRetry(() => messagesApi.list(pedido, 1, 50))).catch(() => {})
    preBuscar(`conversa:${pedido}`, () => cbRef.current.fetchById(pedido))
      .then((c) => {
        // O caminho normal já resolveu (ou o usuário saiu): ninguém mais usa a entrada.
        if (urlAtual.current !== pedido || handledRef.current === pedido) { descartarPreBusca(`conversa:${pedido}`); return }
        abertaCedo.current = pedido
        cbRef.current.onFoundInList(c)
      })
      .catch(() => { /* a busca normal, depois da lista, decide */ })
  }, [urlId, activeId, loading])

  useEffect(() => {
    if (!urlId) { handledRef.current = null; return }
    // Aberta cedo pela pré-busca: quando a lista chegar sem ela (fora do
    // período), ainda vale limpar o período, como na busca por id.
    if (activeId === urlId && abertaCedo.current === urlId && !loading) {
      abertaCedo.current = null
      handledRef.current = urlId
      const naLista = conversations.some((c) => c.id === urlId)
      if (naLista) descartarPreBusca(`conversa:${urlId}`)
      else {
        const pedido = urlId
        buscarConversa(pedido, cbRef.current.fetchById)
          .then((c) => { if (urlAtual.current === pedido) cbRef.current.onFetched(c) })
          .catch(() => {})
      }
      return
    }
    if (activeId === urlId) { if (abertaCedo.current !== urlId) handledRef.current = urlId; return }
    if (handledRef.current === urlId) return

    const match = conversations.find((c) => c.id === urlId)
    if (match) {
      handledRef.current = urlId
      descartarPreBusca(`conversa:${urlId}`)
      cbRef.current.onFoundInList(match)
      return
    }
    // Espera a carga inicial: buscar agora duplicaria trabalho com a lista ainda chegando.
    if (loading) return

    handledRef.current = urlId
    const pedido = urlId
    buscarConversa(pedido, cbRef.current.fetchById)
      .then((c) => { if (urlAtual.current === pedido) cbRef.current.onFetched(c) })
      .catch(() => { /* id inválido ou sem permissão — o estado vazio explica; não tenta de novo */ })
  }, [urlId, conversations, loading, activeId])
}
