import { describe, it, expect } from 'vitest'
import { agruparBloco, fundirEventos, juntarDuplicados, eventoDaAcaoDaIa, eventoDaAtividade, intercalar, contarRotina } from './eventosDaConversa'
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

  it('homologação: ação da IA + registro do backend da mesma ação viram UMA linha, com a frase da IA', () => {
    const atSeg = (seg: number) => new Date(Date.UTC(2026, 8, 29, 12, 0, seg)).toISOString()
    const ia = (id: string, toolName: string, humanSummary: string, seg: number): AgentAction =>
      ({ ...acao(id, 0), toolName, humanSummary, createdAt: atSeg(seg) })
    const out = juntarDuplicados([
      { ...eventoDaAtividade(ativ('s', 'conversation_status_updated', 0, { metadata: { status: 'pending', actorType: 'agent' } }))!, at: atSeg(1) },
      eventoDaAcaoDaIa(ia('t1', 'set_conversation_status', 'Conversa movida para a fila pelo agente', 2)),
      { ...eventoDaAtividade(ativ('a', 'conversation_assigned', 0, { metadata: { userName: 'Joao Lucas', actorType: 'agent' } }))!, at: atSeg(3) },
      eventoDaAcaoDaIa(ia('t2', 'assign_conversation', 'Atribuiu a conversa para Joao Lucas', 4)),
    ])
    expect(out.map((e) => [e.tipo, e.ator, e.texto])).toEqual([
      ['status', 'IA', 'Conversa movida para a fila pelo agente'],
      ['atribuicao', 'IA', 'Atribuiu a conversa para Joao Lucas'],
    ])
  })

  it('revisão 11/10: a IA atribui e o operador assume 3 s depois — a ação do operador não vira "IA atribuiu"', () => {
    const atSeg = (seg: number) => new Date(Date.UTC(2026, 8, 29, 12, 0, seg)).toISOString()
    const out = juntarDuplicados([
      { ...eventoDaAtividade(ativ('ia-reg', 'conversation_assigned', 0, { metadata: { userName: 'Beto', actorType: 'agent' } }))!, at: atSeg(0) },
      { ...eventoDaAcaoDaIa({ ...acao('t', 0), toolName: 'assign_conversation', humanSummary: 'Atribuiu a conversa para Beto', createdAt: atSeg(1) }) },
      { ...eventoDaAtividade(ativ('op', 'conversation_assigned', 0, { metadata: { userName: 'Ana' } }), 'Ana')!, at: atSeg(3) },
    ])
    expect(out.map((e) => [e.id, e.ator, e.texto])).toEqual([
      ['a:ia-reg', 'IA', 'Atribuiu a conversa para Beto'],
      ['a:op', 'Você', 'atribuiu a conversa a Ana'],
    ])
  })

  it('revisão 11/10: só registro do operador por perto — nada é juntado, as duas linhas ficam', () => {
    const atSeg = (seg: number) => new Date(Date.UTC(2026, 8, 29, 12, 0, seg)).toISOString()
    const out = juntarDuplicados([
      eventoDaAcaoDaIa({ ...acao('t', 0), toolName: 'assign_conversation', humanSummary: 'Atribuiu a conversa para Beto', createdAt: atSeg(0) }),
      { ...eventoDaAtividade(ativ('op', 'conversation_assigned', 0, { metadata: { userName: 'Ana' } }))!, at: atSeg(3) },
    ])
    expect(out.map((e) => e.ator)).toEqual(['IA', 'Ana'])
  })

  it('revisão 11/10: com dois registros da IA na janela, casa com o mais próximo no tempo', () => {
    const atSeg = (seg: number) => new Date(Date.UTC(2026, 8, 29, 12, 0, seg)).toISOString()
    const reg = (id: string, seg: number) => ({ ...eventoDaAtividade(ativ(id, 'conversation_status_updated', 0, { metadata: { actorType: 'agent' } }))!, at: atSeg(seg) })
    const out = juntarDuplicados([
      reg('longe', 0),
      reg('perto', 4),
      eventoDaAcaoDaIa({ ...acao('t', 0), toolName: 'set_conversation_status', humanSummary: 'Conversa movida para a fila pelo agente', createdAt: atSeg(4) }),
    ])
    expect(out.map((e) => [e.id, e.texto])).toEqual([
      ['a:longe', 'mudou o status da conversa'],
      ['a:perto', 'Conversa movida para a fila pelo agente'],
    ])
  })

  it('fora da janela de 5 s, ou de tipos diferentes, nada é juntado', () => {
    const out = juntarDuplicados([
      eventoDaAtividade(ativ('s', 'conversation_status_updated', 0))!,
      { ...eventoDaAcaoDaIa(acao('t1', 1)), ferramenta: 'set_conversation_status' },
      eventoDaAtividade(ativ('a', 'conversation_assigned', 5))!,
      { ...eventoDaAcaoDaIa(acao('t2', 5)), ferramenta: 'update_contact' },
    ])
    expect(out).toHaveLength(4)
  })

  it('SCRUM-1253: rotina seguida vira um bloco; marco (falha, pausa) fica em linha própria', () => {
    const g = agruparBloco([
      eventoDaAcaoDaIa(acao('1', 1)),
      eventoDaAtividade(ativ('t', 'conversation_tag_added', 2, { metadata: { tagName: 'VIP' } }))!,
      eventoDaAcaoDaIa(acao('3', 3, false)),
      eventoDaAtividade(ativ('p', 'conversation_ai_pause_updated', 4))!,
      eventoDaAcaoDaIa(acao('5', 5)),
    ])
    expect(g.map((x) => x.eventos.map((e) => e.id).join('+'))).toEqual(['ia:1+a:t', 'ia:3', 'a:p', 'ia:5'])
  })

  it('SCRUM-1253: pausar e retomar sem mensagem viram uma linha, com os passos guardados', () => {
    const [f] = fundirEventos([
      eventoDaAtividade(ativ('p', 'conversation_ai_pause_updated', 1), 'Ana')!,
      eventoDaAtividade(ativ('r', 'conversation_ai_pause_updated', 5, { metadata: { pauseUntil: null } }), 'Ana')!,
    ])
    expect(f).toMatchObject({ texto: 'pausou e retomou a IA', ator: 'Você', inicio: at(1), at: at(5) })
    expect(f.fundidos?.map((e) => e.id)).toEqual(['a:p', 'a:r'])
  })

  it('SCRUM-1253: atribuições viram só a última, no lugar dela; o resto não se mexe', () => {
    const out = fundirEventos([
      eventoDaAtividade(ativ('a1', 'conversation_assigned', 1, { metadata: { userName: 'Beto' } }))!,
      eventoDaAcaoDaIa(acao('x', 2)),
      eventoDaAtividade(ativ('a2', 'conversation_assigned', 3, { metadata: { userName: 'Carla' } }))!,
    ])
    expect(out.map((e) => e.texto)).toEqual(['moveu o negócio para Proposta', 'atribuiu a conversa a Carla (2 mudanças)'])
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
