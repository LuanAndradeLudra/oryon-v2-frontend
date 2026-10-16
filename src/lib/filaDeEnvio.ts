import { useSyncExternalStore } from 'react'
import { messagesApi } from '@/services/api'
import { inferMessageType } from '@/lib/inferMessageType'
import type { Message, SendMessageDto } from '@/types'

/**
 * Fila de envio do operador, por conversa (SCRUM-1161, PO 15/10).
 *
 * Antes, cada envio era um POST independente: um texto mandado enquanto um
 * documento ainda subia chegava ANTES ao paciente, e o anexo em envio ficava
 * no campo (um novo Enter o reenviava). Aqui cada conversa tem uma fila: um
 * POST por vez, na ordem em que o atendente enviou. O POST espera a Meta
 * aceitar, então a ordem de chegada ao paciente é a ordem da fila.
 *
 * Falha segura: se uma mensagem falha, as seguintes da mesma conversa ficam
 * RETIDAS ("Aguardando a mensagem anterior") até o atendente tentar de novo
 * ou descartar a que falhou — o paciente não recebe "segue acima" sem o
 * documento.
 *
 * Vive fora do React (módulo): trocar de conversa não interrompe a fila; ao
 * voltar, `useMessages` repõe as bolhas pendentes. Vale para esta aba —
 * outra aba ou outro atendente seguem independentes (a fila no servidor é a
 * fase 2, card próprio).
 */

export type EstadoNaFila = 'na_fila' | 'enviando' | 'falhou' | 'retida'

/** Motivo mostrado quando o envio não teve resposta do servidor. */
export const SEM_CONFIRMACAO = 'sem confirmação do servidor; confira se chegou antes de tentar de novo'

interface ItemDaFila {
  id: string
  conversationId: string
  dto: SendMessageDto
  mensagem: Message
  estado: EstadoNaFila
  objectUrl: string | null
  aoFalhar?: (err: unknown) => void
}

export type EventoDaFila =
  | { tipo: 'mudou'; conversationId: string; mensagem: Message }
  | { tipo: 'confirmado'; conversationId: string; tempId: string; mensagem: Message; clientThumbnailUrl?: string }
  | { tipo: 'removido'; conversationId: string; tempId: string }

type Enviar = (conversationId: string, dto: SendMessageDto) => Promise<{ data: Message }>

export function criarFilaDeEnvio(enviar: Enviar) {
  const filas = new Map<string, ItemDaFila[]>()
  const rodando = new Set<string>()
  const ouvintes = new Set<(e: EventoDaFila) => void>()
  // Versão por item, para `useSyncExternalStore` (re-render só de quem mudou).
  const versoes = new Map<string, EstadoNaFila | undefined>()
  const ouvintesDeEstado = new Set<() => void>()

  const emitir = (e: EventoDaFila) => {
    for (const fn of ouvintes) fn(e)
    for (const fn of ouvintesDeEstado) fn()
  }
  const itens = (c: string) => filas.get(c) ?? []
  const achar = (id: string) => {
    for (const lista of filas.values()) {
      const item = lista.find((i) => i.id === id)
      if (item) return item
    }
    return undefined
  }
  const mudar = (item: ItemDaFila, estado: EstadoNaFila, mensagem?: Partial<Message>) => {
    item.estado = estado
    if (mensagem) item.mensagem = { ...item.mensagem, ...mensagem }
    versoes.set(item.id, estado)
    emitir({ tipo: 'mudou', conversationId: item.conversationId, mensagem: item.mensagem })
  }
  const remover = (item: ItemDaFila) => {
    filas.set(item.conversationId, itens(item.conversationId).filter((i) => i !== item))
    versoes.delete(item.id)
  }
  /** Retidas voltam para a fila (depois de tentar de novo ou descartar). */
  const liberarRetidas = (c: string) => {
    for (const i of itens(c)) if (i.estado === 'retida') mudar(i, 'na_fila')
  }

  async function processar(c: string) {
    if (rodando.has(c)) return
    rodando.add(c)
    try {
      for (;;) {
        const lista = itens(c)
        const idx = lista.findIndex((i) => i.estado === 'na_fila')
        if (idx < 0) return
        if (lista.slice(0, idx).some((i) => i.estado === 'falhou')) {
          for (const i of lista.slice(idx)) if (i.estado === 'na_fila') mudar(i, 'retida')
          return
        }
        const item = lista[idx]
        mudar(item, 'enviando')
        try {
          const { data } = await enviar(c, item.dto)
          remover(item)
          if (item.objectUrl) URL.revokeObjectURL(item.objectUrl)
          emitir({ tipo: 'confirmado', conversationId: c, tempId: item.id, mensagem: data, clientThumbnailUrl: item.dto.clientThumbnailUrl })
        } catch (err) {
          // O backend grava a linha `failed` e a devolve em `failedMessage`:
          // aproveita o motivo (a bolha segue com o id local, para as ações).
          const resposta = (err as { response?: { data?: { failedMessage?: Message } } })?.response
          const falha = resposta?.data?.failedMessage
          mudar(item, 'falhou', {
            status: 'failed',
            errorCode: falha?.errorCode,
            // Sem resposta (tempo limite, rede caiu): o servidor pode ter
            // enviado mesmo assim — avisa antes de um Tentar de novo duplicar.
            errorTitle: falha?.errorTitle ?? (resposta ? undefined : SEM_CONFIRMACAO),
            deliveryError: falha?.deliveryError,
            failedAt: falha?.failedAt,
          })
          item.aoFalhar?.(err)
        }
      }
    } finally {
      rodando.delete(c)
    }
  }

  let avisoInstalado = false
  const instalarAvisoDeSaida = () => {
    if (avisoInstalado || typeof window === 'undefined') return
    avisoInstalado = true
    // Fechar/recarregar a aba com mensagem ainda não enviada a perderia.
    // As que falharam não contam: o atendente já viu a falha (e o redirect
    // para o login, com a sessão expirada, não pode travar num diálogo).
    window.addEventListener('beforeunload', (e) => {
      if (!emTransito()) return
      e.preventDefault()
      e.returnValue = ''
    })
  }

  function temPendentes() {
    for (const lista of filas.values()) if (lista.length) return true
    return false
  }

  function emTransito() {
    for (const lista of filas.values()) if (lista.some((i) => i.estado !== 'falhou')) return true
    return false
  }

  return {
    /** Põe a mensagem na fila e devolve a bolha otimista (status `sending`). */
    enfileirar(conversationId: string, dto: SendMessageDto, aoFalhar?: (err: unknown) => void): Message {
      const id = `pending-${crypto.randomUUID()}`
      // blob: local do arquivo — a bolha mostra a mídia na hora (ver mediaUrls.ts).
      const objectUrl = dto.file ? URL.createObjectURL(dto.file) : null
      const agora = new Date().toISOString()
      const mensagem: Message = {
        id,
        conversationId,
        direction: 'outbound',
        type: dto.file ? inferMessageType(dto.file.type) : 'text',
        status: 'sending',
        body: dto.body,
        mediaUrl: objectUrl ?? undefined,
        mediaCaption: dto.mediaCaption,
        mediaThumbnailUrl: dto.clientThumbnailUrl,
        contextWamid: dto.replyToWamid,
        senderKind: 'operator',
        sentAt: agora,
        createdAt: agora,
      }
      const item: ItemDaFila = { id, conversationId, dto, mensagem, estado: 'na_fila', objectUrl, aoFalhar }
      filas.set(conversationId, [...itens(conversationId), item])
      versoes.set(id, 'na_fila')
      instalarAvisoDeSaida()
      emitir({ tipo: 'mudou', conversationId, mensagem })
      void processar(conversationId)
      return mensagem
    },

    /** Reenvia a que falhou (mesmo arquivo e texto) e libera as retidas. */
    tentarDeNovo(id: string) {
      const item = achar(id)
      if (!item || item.estado !== 'falhou') return
      mudar(item, 'na_fila', { status: 'sending', errorCode: undefined, errorTitle: undefined, deliveryError: undefined, failedAt: undefined })
      liberarRetidas(item.conversationId)
      void processar(item.conversationId)
    },

    /** Tira do chat a que falhou (ou uma retida — "Cancelar") e libera as
     *  seguintes. */
    descartar(id: string) {
      const item = achar(id)
      if (!item || (item.estado !== 'falhou' && item.estado !== 'retida')) return
      remover(item)
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl)
      emitir({ tipo: 'removido', conversationId: item.conversationId, tempId: id })
      liberarRetidas(item.conversationId)
      void processar(item.conversationId)
    },

    /** Bolhas ainda na fila desta conversa (para repor ao voltar a ela). */
    pendentes(conversationId: string): Message[] {
      return itens(conversationId).map((i) => i.mensagem)
    },

    /** A mensagem em envio agora nesta conversa (para casar o eco do socket). */
    emEnvio(conversationId: string): Message | undefined {
      return itens(conversationId).find((i) => i.estado === 'enviando')?.mensagem
    },

    estado(id: string): EstadoNaFila | undefined {
      return versoes.get(id)
    },

    assinar(fn: (e: EventoDaFila) => void) {
      ouvintes.add(fn)
      return () => { ouvintes.delete(fn) }
    },

    assinarEstados(fn: () => void) {
      ouvintesDeEstado.add(fn)
      return () => { ouvintesDeEstado.delete(fn) }
    },

    temPendentes,
    emTransito,

    /** Esvazia tudo (logout): nada da sessão anterior sai em nome de outra. */
    limpar() {
      for (const lista of filas.values()) {
        for (const i of lista) {
          if (i.objectUrl) URL.revokeObjectURL(i.objectUrl)
          versoes.delete(i.id)
          emitir({ tipo: 'removido', conversationId: i.conversationId, tempId: i.id })
        }
      }
      filas.clear()
    },
  }
}

export type FilaDeEnvio = ReturnType<typeof criarFilaDeEnvio>

export const filaDeEnvio: FilaDeEnvio = criarFilaDeEnvio((c, dto) => messagesApi.send(c, dto))

/** Estado de uma bolha na fila (undefined = não está na fila). */
export function useEstadoNaFila(id: string, fila: FilaDeEnvio = filaDeEnvio): EstadoNaFila | undefined {
  return useSyncExternalStore(fila.assinarEstados, () => fila.estado(id), () => undefined)
}
