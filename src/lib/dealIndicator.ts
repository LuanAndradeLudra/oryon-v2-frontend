// F10 (SCRUM-883) — quais registros viram chip no cabeçalho da conversa.
// C2 (SCRUM-933) — e quando os chips viram SELETOR ("negócio desta conversa").
import type { Deal } from '@/types'

/** Abertos sempre; fechados só os que nasceram NESTA conversa (é o desfecho dela). */
export function pickIndicatorDeals(deals: Deal[], conversationId?: string): Deal[] {
  return deals.filter(
    (d) =>
      d.status === 'open' ||
      (!!conversationId && d.originConversationId === conversationId && (d.status === 'won' || d.status === 'lost')),
  )
}

/** Negócio vinculado a esta conversa, se houver (passo 1 da precedência do backend). */
export function linkedDeal(deals: ReadonlyArray<Deal>, conversationId?: string): Deal | null {
  if (!conversationId) return null
  return deals.find((d) => d.status === 'open' && d.originConversationId === conversationId) ?? null
}

/**
 * C2 (SCRUM-933): o cabeçalho vira seletor quando o contato tem **mais de um**
 * negócio aberto no MESMO funil — só aí existe ambiguidade sobre "a qual
 * negócio esta conversa se refere". Com um aberto por funil (o caso de todo
 * tenant sem `allowMultipleOpen`), os chips continuam exatamente como eram:
 * a C2 não muda nada para quem não ligou multiplicidade.
 *
 * Repare que a pergunta é por FUNIL, não pelo total: um contato com um negócio
 * aberto em "Vendas" e outro em "Suporte" não tem ambiguidade nenhuma — cada
 * funil tem seu alvo, e é assim que a precedência do backend enxerga.
 */
export function needsDealSelector(deals: ReadonlyArray<Deal>): boolean {
  const openByPipeline = new Map<string, number>()
  for (const d of deals) {
    if (d.status !== 'open') continue
    openByPipeline.set(d.pipelineId, (openByPipeline.get(d.pipelineId) ?? 0) + 1)
  }
  for (const n of openByPipeline.values()) if (n > 1) return true
  return false
}

/** Abertos que disputam esta conversa, na ordem do seletor: vinculado primeiro, resto por título. */
export function selectableDeals(deals: ReadonlyArray<Deal>, conversationId?: string): Deal[] {
  return deals
    .filter((d) => d.status === 'open')
    .slice()
    .sort((a, b) => {
      const aLinked = !!conversationId && a.originConversationId === conversationId
      const bLinked = !!conversationId && b.originConversationId === conversationId
      if (aLinked !== bLinked) return aLinked ? -1 : 1
      return (a.title ?? '').localeCompare(b.title ?? '')
    })
}
