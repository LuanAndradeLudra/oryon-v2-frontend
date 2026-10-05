import { describe, it, expect } from 'vitest'
import { agruparSeguidos, eventoDaAcaoDaIa, eventoDaAtividade, intercalar, contarRotina } from './eventosDaConversa'
import type { Message } from '@/types'
import type { UserActivity } from '@/services/userActivityApi'
import type { AgentAction } from '@/services/agentActivityApi'

const at = (min: number) => new Date(Date.UTC(2026, 8, 29, 12, min)).toISOString()
const msg = (id: string, min: number) => ({ id, sentAt: at(min), direction: 'inbound' }) as unknown as Message
const ativ = (id: string, type: string, min: number, extra: Partial<UserActivity> = {}): UserActivity =>
  ({ id, type, timestamp: at(min), actor: 'Ana', summary: `${type} conversation`, metadata: {}, ...extra })
const acao = (id: string, min: number, success = true): AgentAction =>
  ({ id, toolName: 'mover', humanSummary: 'moveu o negócio para Proposta', success, targetEntityType: 'deal', targetEntityId: null,
    contactId: null, durationMs: 10, errorMessage: success ? null : 'timeout', agentId: 'a1', agentName: 'Bia', createdAt: at(min) })

describe('eventos da conversa — T4 fase 1', () => {
  it('D10: handoff, transferência, verificação e falha são sempre visíveis; o resto é rotina', () => {
    const handoff = eventoDaAtividade(ativ('1', 'agent_requested_handoff', 1, { summary: 'IA transferiu a conversa para a equipe — motivo: pediu humano' }))!
    expect(handoff).toMatchObject({ tipo: 'ia_para_equipe', ator: 'IA', rotina: false })
    expect(handoff.texto).toContain('motivo: pediu humano')
    expect(eventoDaAtividade(ativ('2', 'conversation_transferred', 2, { metadata: { userName: 'Beto' } }))).toMatchObject({ rotina: false, texto: 'transferiu a conversa para Beto' })
    expect(eventoDaAtividade(ativ('3', 'agent_phantom_confirmation_handoff', 3))).toMatchObject({ tipo: 'verificacao', rotina: false })
    expect(eventoDaAcaoDaIa(acao('4', 4, false))).toMatchObject({ tipo: 'falha', rotina: false })
    expect(eventoDaAtividade(ativ('5', 'conversation_ai_pause_updated', 5))).toMatchObject({ tipo: 'pausa_ia', rotina: true })
    expect(eventoDaAtividade(ativ('6', 'conversation_assigned', 6))).toMatchObject({ tipo: 'atribuicao', rotina: true })
    expect(eventoDaAcaoDaIa(acao('7', 7))).toMatchObject({ tipo: 'crm_ia', ator: 'IA', rotina: true })
  })

  it('o ator vem escrito: "Você" para o próprio usuário, "IA" para o agente', () => {
    expect(eventoDaAtividade(ativ('1', 'conversation_assigned', 1), 'Ana')!.ator).toBe('Você')
    expect(eventoDaAtividade(ativ('2', 'conversation_assigned', 1, { metadata: { actorType: 'agent' } }))!.ator).toBe('IA')
  })

  it('o que já é mensagem não vira evento; código cru do @AuditLog não vira texto', () => {
    expect(eventoDaAtividade(ativ('1', 'message_sent', 1))).toBeNull()
    expect(eventoDaAtividade(ativ('2', 'algo_novo', 1))!.texto).toBe('registrou uma atividade')
  })

  it('agrupa eventos de rotina seguidos do mesmo tipo e ator', () => {
    const g = agruparSeguidos([eventoDaAcaoDaIa(acao('1', 1)), eventoDaAcaoDaIa(acao('2', 2)), eventoDaAcaoDaIa(acao('3', 3, false))])
    expect(g.map((x) => x.eventos.length)).toEqual([2, 1])
  })

  it('intercala na ordem certa; rotina só com eventos=1', () => {
    const msgs = [msg('m1', 0), msg('m2', 10)]
    const evs = [
      eventoDaAcaoDaIa(acao('crm', 5)),
      eventoDaAtividade(ativ('h', 'human_handoff', 6, { summary: 'IA passou a conversa para a equipe' }))!,
      eventoDaAtividade(ativ('p', 'conversation_ai_auto_paused', 12))!,
    ]
    const sem = intercalar(msgs, evs, { mostrarRotina: false, temMais: false })
    expect(sem.map((i) => (i.kind === 'mensagem' ? i.mensagem.id : i.grupos.map((g) => g.eventos.map((e) => e.id).join('+')).join('|')))).toEqual(['m1', 'a:h', 'm2'])
    const com = intercalar(msgs, evs, { mostrarRotina: true, temMais: false })
    expect(com.map((i) => (i.kind === 'mensagem' ? i.mensagem.id : i.grupos.map((g) => g.eventos.map((e) => e.id).join('+')).join('|')))).toEqual(['m1', 'ia:crm|a:h', 'm2', 'a:p'])
    expect(contarRotina(evs)).toBe(2)
  })

  it('com mensagens antigas por carregar, evento anterior à 1ª carregada fica de fora', () => {
    const itens = intercalar([msg('m2', 10)], [eventoDaAtividade(ativ('h', 'human_handoff', 1))!], { mostrarRotina: true, temMais: true })
    expect(itens.map((i) => i.kind)).toEqual(['mensagem'])
  })
  it('primeira mensagem com data inválida não some com os eventos; contador segue a janela', () => {
    const quebrada = { id: 'x', sentAt: 'não é data', direction: 'inbound' } as unknown as Message
    const evs = [eventoDaAtividade(ativ('h', 'human_handoff', 1))!, eventoDaAcaoDaIa(acao('crm', 2))]
    expect(intercalar([quebrada], evs, { mostrarRotina: true, temMais: true }).some((i) => i.kind === 'eventos')).toBe(true)
    // Com mensagens antigas por carregar, rotina anterior à janela não entra no contador.
    expect(contarRotina([eventoDaAcaoDaIa(acao('antes', 0))], [msg('m', 10)], true)).toBe(0)
    expect(contarRotina([eventoDaAcaoDaIa(acao('depois', 11))], [msg('m', 10)], true)).toBe(1)
  })
})
