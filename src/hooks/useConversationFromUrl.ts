import { useEffect, useRef } from 'react'
import type { Conversation } from '@/types'

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

  useEffect(() => {
    if (!urlId) { handledRef.current = null; return }
    if (activeId === urlId) { handledRef.current = urlId; return }
    if (handledRef.current === urlId) return

    const match = conversations.find((c) => c.id === urlId)
    if (match) {
      handledRef.current = urlId
      cbRef.current.onFoundInList(match)
      return
    }
    // Espera a carga inicial: buscar agora duplicaria trabalho com a lista ainda chegando.
    if (loading) return

    handledRef.current = urlId
    const pedido = urlId
    cbRef.current.fetchById(pedido)
      .then((c) => { if (urlAtual.current === pedido) cbRef.current.onFetched(c) })
      .catch(() => { /* id inválido ou sem permissão — o estado vazio explica; não tenta de novo */ })
  }, [urlId, conversations, loading, activeId])
}
