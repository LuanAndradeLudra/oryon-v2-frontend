import { describe, expect, it } from 'vitest'
import { DESFECHOS_DA_EQUIPE, diaDoPasso, fraseDaAcao, fraseDoHistorico, fraseDoProgresso, fraseDoUltimoPasso, haQuanto, pedeTrabalho, prazo, quandoExato } from '@/lib/planosDeAcao'
import type { EventoDoHistorico } from '@/services/followUpsApi'
import { rotaPermitida } from '@/lib/rotasPorPapel'

describe('planos de ação na unidade', () => {
  it('só os admins da unidade abrem os planos (têm nome de paciente)', () => {
    expect(rotaPermitida('/planos', { role: 'admin', multiPipeline: false })).toBe(true)
    expect(rotaPermitida('/planos/abc', { role: 'business_admin', multiPipeline: false })).toBe(true)
    expect(rotaPermitida('/planos', { role: 'agent', multiPipeline: false })).toBe(false)
    expect(rotaPermitida('/planos', { role: 'supervisor', multiPipeline: false })).toBe(false)
  })

  it('o que ainda pede trabalho: sem resultado (ou só "falou, sem marcar"), caso aberto, neste plano', () => {
    const base = { outcome: null, caseStatus: 'aberto' as const, movedToOtherPlan: false, contactDeleted: false }
    expect(pedeTrabalho(base)).toBe(true)
    expect(pedeTrabalho({ ...base, outcome: 'contato_sem_agendamento' })).toBe(true)
    expect(pedeTrabalho({ ...base, outcome: 'nao_quer' })).toBe(false)
    expect(pedeTrabalho({ ...base, caseStatus: 'resolvido' })).toBe(false)
    expect(pedeTrabalho({ ...base, movedToOtherPlan: true })).toBe(false)
  })

  it('as frases', () => {
    expect(fraseDoProgresso({ total: 6, worked: 4, booked: 2, bookedReported: 1, noAnswer: 1, open: 2 })).toBe('6 casos · 3 marcaram · 2 em aberto')
    expect(fraseDaAcao('pipeline', 4, 1, { alreadyOpen: 1 })).toMatch(/4 negócios criados.*1 já tinha negócio aberto/)
    const agora = new Date('2026-11-04T13:00:00Z')
    expect(prazo('2026-11-04T21:00:00.000Z', agora)).toBe('hoje, 18h')
    expect(haQuanto('2026-11-02T14:00:00.000Z', agora)).toBe('há 47 h')
    expect(haQuanto('2026-11-02T13:00:00.000Z', agora)).toBe('há 2 dias')
  })

  it('cada resultado explica o que quer dizer e o que acontece com o contato', () => {
    for (const d of DESFECHOS_DA_EQUIPE) expect(d.explica.length).toBeGreaterThan(30)
    expect(DESFECHOS_DA_EQUIPE.find((d) => d.id === 'contato_sem_agendamento')?.explica).toMatch(/continua na lista/)
  })

  it('o histórico em frases', () => {
    const e = (x: Partial<EventoDoHistorico>): EventoDoHistorico => ({
      id: '1', at: '2026-11-06T23:40:00.000Z', kind: 'outcome', actor: { type: 'user', name: 'Ana Souza' },
      contact: { itemId: 'i1', name: 'Lucas Brito', deleted: false, conversationId: 'c1' }, itemCount: 1, detail: {}, resultRef: null, ...x,
    })
    expect(fraseDoHistorico(e({ detail: { outcome: 'sem_resposta', previous: 'contato_sem_agendamento' } })))
      .toBe('Ana Souza marcou Lucas Brito como “Sem resposta” (antes: “Falou, sem marcar”).')
    expect(fraseDoHistorico(e({ kind: 'template', detail: { template: 'retomada_consulta' } }))).toBe('Ana Souza enviou o modelo “retomada_consulta” para Lucas Brito.')
    expect(fraseDoHistorico(e({ kind: 'tag', contact: null, itemCount: 3, detail: { tags: ['Retomada', 'VIP'] } }))).toBe('Ana Souza pôs as etiquetas “Retomada” e “VIP” em 3 contatos.')
    expect(fraseDoHistorico(e({ kind: 'pipeline', contact: null, itemCount: 2, detail: { pipeline: 'Agendamentos', stage: 'Retomar', alreadyOpen: 1 } })))
      .toBe('Ana Souza pôs 2 contatos no funil “Agendamentos”, etapa “Retomar”. 1 já tinha negócio aberto.')
    expect(fraseDoHistorico(e({ kind: 'auto_booked', actor: { type: 'system', name: null }, detail: { outcome: 'agendou' } }))).toBe('Lucas Brito marcou consulta. A agenda confirmou sozinha.')
    expect(fraseDoHistorico(e({ kind: 'conclude', contact: null, itemCount: 0, detail: { notWorked: 2 } }))).toBe('Ana Souza concluiu o plano. 2 contatos sem resultado ficaram como “Não trabalhado”.')
    expect(fraseDoHistorico(e({ kind: 'extend', actor: { type: 'manager', name: null }, contact: null, detail: { dueAt: '2026-11-07T21:00:00.000Z' } })))
      .toBe('O gestor da rede prorrogou o prazo para 07/11 às 18h.')
    expect(fraseDoHistorico(e({ kind: 'edit', actor: { type: 'manager', name: null }, contact: null, detail: { fields: ['orientation', 'dueAt'], dueAt: '2026-11-07T21:00:00.000Z' } })))
      .toBe('O gestor da rede mudou a orientação e o prazo para 07/11 às 18h.')
    expect(fraseDoHistorico(e({ kind: 'outcome', actor: { type: 'user', name: null }, contact: { itemId: 'i1', name: null, deleted: true, conversationId: null }, detail: { outcome: 'nao_quer' } })))
      .toBe('Alguém da equipe marcou (contato excluído) como “Não quer”.')
  })

  it('o último passo na linha do contato, e o dia do histórico', () => {
    const agora = new Date('2026-11-06T23:50:00.000Z')
    expect(fraseDoUltimoPasso({ kind: 'template', at: '2026-11-06T21:40:00.000Z', actorName: 'Ana', detail: {} }, agora)).toBe('Modelo enviado · há 2 h · Ana')
    expect(fraseDoUltimoPasso({ kind: 'outcome', at: '2026-11-06T23:45:00.000Z', actorName: null, detail: { outcome: 'contato_sem_agendamento' } }, agora)).toBe('Marcado “Falou, sem marcar” · agora há pouco')
    expect(diaDoPasso('2026-11-06T23:40:00.000Z', agora)).toBe('Hoje')
    expect(diaDoPasso('2026-11-05T12:00:00.000Z', agora)).toBe('Ontem')
    expect(diaDoPasso('2026-11-02T12:00:00.000Z', agora)).toBe('02/11')
    expect(quandoExato('2026-11-06T23:40:00.000Z')).toBe('06/11 às 20h40')
  })
})
