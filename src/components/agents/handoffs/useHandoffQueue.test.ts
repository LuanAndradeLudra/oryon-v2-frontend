// ─── A6 / SCRUM-1017 — a conversão do modo degradado ─────────────────────────
// O que estes testes protegem é a honestidade do modo reduzido: o que ele NÃO
// tem não pode ser inventado, porque um número errado com cara de certo é pior
// que um campo vazio.
import { describe, it, expect } from 'vitest'
import { conversaComoHandoff, esperaAoVivo } from './useHandoffQueue'
import type { HandoffItem } from '@/types/agentsOps'
import { sla } from './handoffRow'
import type { Conversation } from '@/types'

const AGORA = Date.parse('2026-09-06T14:10:00.000Z')

const conversa = (over: Partial<Conversation> = {}) => ({
  id: 'conv_9',
  contact: { id: 'c1', displayName: 'Marina Torres', waId: '5511999887771' },
  lastMessageAt: '2026-09-06T14:00:00.000Z',
  ...over,
} as unknown as Conversation)

describe('conversaComoHandoff — modo degradado', () => {
  it('traz nome e telefone mascarado pela mesma regra dos dois modos', () => {
    const h = conversaComoHandoff(conversa(), AGORA)
    expect(h.contact.name).toBe('Marina Torres')
    // Mesma máscara que o BE.6 aplica: DDD + 2 últimos.
    expect(h.contact.phoneMasked).toBe('+55 11 9******-71')
  })

  it('aponta para a conversa e marca o id como derivado dela', () => {
    const h = conversaComoHandoff(conversa(), AGORA)
    expect(h.conversationId).toBe('conv_9')
    // O prefixo evita confundir um id de conversa com um id de handoff_event
    // real, que é o que `claim`/`return` esperam.
    expect(h.id).toBe('conv:conv_9')
  })

  it('a espera é aproximada, calculada de lastMessageAt', () => {
    expect(conversaComoHandoff(conversa(), AGORA).waitingSeconds).toBe(600)
  })

  it('SEM SLA — e isso não pode virar "SLA estourado"', () => {
    // O ponto do modo reduzido: sem BE.6 não existe SLA. `slaSeconds: 0` é lido
    // por `sla()` como "sem SLA", então a linha não ganha cor de estado nem
    // sufixo. Se aqui viesse um SLA inventado, a tela acusaria atraso contra um
    // limite que ninguém definiu.
    const h = conversaComoHandoff(conversa(), AGORA)
    expect(h.slaSeconds).toBe(0)
    const s = sla(h.waitingSeconds, h.slaSeconds)
    expect(s.estado).toBe('sem-sla')
    expect(s.acento).toBeNull()
    expect(s.sufixo).toBeNull()
  })

  it('não inventa regra, destino, intenção nem resumo', () => {
    const h = conversaComoHandoff(conversa(), AGORA)
    expect(h.rule).toEqual({ id: null, label: null })
    expect(h.target).toEqual({ type: null, id: null, label: null })
    expect(h.intent).toBeNull()
    expect(h.summary).toBeNull()
  })

  it('não inventa agente: WhatsAppNumber não expõe agentId no frontend', () => {
    expect(conversaComoHandoff(conversa(), AGORA).agent).toEqual({ id: '', name: null })
  })

  it('fila vazia — é o que faz a barra de chips sumir em vez de nascer vazia', () => {
    expect(conversaComoHandoff(conversa(), AGORA).queue).toBe('')
  })

  it('lastMessageAt ausente ou inválido não quebra nem produz espera negativa', () => {
    expect(conversaComoHandoff(conversa({ lastMessageAt: undefined }), AGORA).waitingSeconds).toBe(0)
    expect(conversaComoHandoff(conversa({ lastMessageAt: 'nao-e-data' }), AGORA).waitingSeconds).toBe(0)
    // Relógio atrasado em relação ao servidor não pode gerar tempo negativo.
    const futuro = conversa({ lastMessageAt: '2026-09-06T14:20:00.000Z' })
    expect(conversaComoHandoff(futuro, AGORA).waitingSeconds).toBe(0)
  })

  it('contato sem nome cai num rótulo, não em "undefined" na tela', () => {
    const h = conversaComoHandoff(conversa({ contact: undefined }), AGORA)
    expect(h.contact.name).toBe('Sem nome')
    expect(h.contact.phoneMasked).toBe('')
  })
})

describe('esperaAoVivo — o relógio parado nunca inventa tempo', () => {
  const evento = (over: Partial<HandoffItem> = {}) => ({
    createdAt: '2026-09-06T14:00:00.000Z',
    waitingSeconds: 600,
    ...over,
  } as HandoffItem)

  it('com o relógio parado, usa o número do servidor', () => {
    // É o caso dos segmentos "Em atendimento" e "Resolvidas": por BE.6 o
    // waitingSeconds é congelado, e um contador subindo ali mostraria a espera
    // crescendo para uma conversa que já foi atendida.
    expect(esperaAoVivo(evento(), 0)).toBe(600)
  })

  it('com o relógio correndo, recalcula do createdAt', () => {
    expect(esperaAoVivo(evento(), Date.parse('2026-09-06T14:10:30.000Z'))).toBe(630)
  })

  it('createdAt inválido cai de volta no servidor em vez de virar NaN', () => {
    expect(esperaAoVivo(evento({ createdAt: 'nao-e-data' }), Date.now())).toBe(600)
  })

  it('relógio atrás do createdAt não produz tempo negativo', () => {
    expect(esperaAoVivo(evento(), Date.parse('2026-09-06T13:59:00.000Z'))).toBe(0)
  })
})
