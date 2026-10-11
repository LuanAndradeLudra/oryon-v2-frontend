import type { CopilotMessage, ToolCallRecord } from '@/contexts/CopilotContext'

/** Lote de ações que o Copilot propôs e espera aprovação. */
export const ehLote = (tc: ToolCallRecord) => tc.name === '__approval_batch__'
export const pendente = (tc: ToolCallRecord) => tc.approvalStatus === 'pending' || tc.approvalStatus === 'submitting'

export function contarPendentes(messages: CopilotMessage[]): number {
  return messages.reduce((n, m) => n + (m.toolCalls ?? []).filter((tc) => ehLote(tc) && pendente(tc)).length, 0)
}

/**
 * Revisão SCRUM-1253 (11/10): o turno que espera a decisão vive só na memória
 * da conversa aberta. Lote "pendente" que vem do histórico (recarregou, trocou
 * de conversa) não tem mais para onde mandar a decisão — vira "expirado"
 * (não aprovável, não conta como pendente). Devolve o MESMO array quando não
 * há nada a mudar.
 */
export function expirarLotesOrfaos<M extends { toolCalls?: ToolCallRecord[] }>(messages: M[]): M[] {
  let mudou = false
  const novas = messages.map((m) => {
    if (!m.toolCalls?.some((tc) => ehLote(tc) && pendente(tc))) return m
    mudou = true
    return {
      ...m,
      toolCalls: m.toolCalls.map((tc) => (ehLote(tc) && pendente(tc) ? { ...tc, approvalStatus: 'expired' as const } : tc)),
    }
  })
  return mudou ? novas : messages
}
