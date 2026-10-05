/**
 * Pedidos entre a página de Conversas e o cabeçalho do chat (28/09).
 *
 * A tecla E é da página (atalhos globais), mas o fluxo de "Resolver com
 * desfecho" (popover, negócio-alvo) é do cabeçalho. A página avisa por este
 * evento, com o id da conversa; o cabeçalho daquela conversa pergunta.
 */
export const PEDIR_RESOLVER_EVENT = 'oryon:pedir-resolver'

export function pedirResolver(conversationId: string) {
  window.dispatchEvent(new CustomEvent(PEDIR_RESOLVER_EVENT, { detail: { conversationId } }))
}
