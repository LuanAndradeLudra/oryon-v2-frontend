import { describe, it, expect } from 'vitest'
import { buildInsight } from './agendaInsight'
import type { Campaign, CampaignStatus } from '@/types'

// 2026-09-03, quinta-feira, 18:31 — o mesmo instante do mockup.
const NOW = new Date(2026, 8, 3, 18, 31, 0)

function campaign(over: Partial<Campaign> & { id: string }): Campaign {
  return {
    tenantId: 't1',
    name: `Disparo ${over.id}`,
    templateId: 'tpl-1',
    templateName: 'template_teste',
    segment: { type: 'all' },
    variableMappings: [],
    status: 'scheduled' as CampaignStatus,
    stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
    createdByUserId: 'u1',
    createdAt: new Date(2026, 8, 1).toISOString(),
    ...over,
  } as Campaign
}

const agendada = (h: number, m: number, id: string, dia = 4) =>
  campaign({ id, scheduledAt: new Date(2026, 8, dia, h, m).toISOString() })

describe('buildInsight — aperto de horário', () => {
  it('conta os disparos que realmente estão na janela, não o gatilho', () => {
    // 5 agendadas entre 18h e 20h, todas dentro das 4 h da janela.
    const insight = buildInsight(
      [agendada(18, 0, 'a'), agendada(18, 30, 'b'), agendada(19, 0, 'c'),
       agendada(19, 30, 'd'), agendada(20, 0, 'e')],
      NOW,
    )
    expect(insight?.description).toContain('5 disparos entre 18h e 20h')
  })

  it('não estende a janela além das horas configuradas', () => {
    // 18h, 19h, 20h fecham a janela; a de 23h fica de fora das 4 h.
    const insight = buildInsight(
      [agendada(18, 0, 'a'), agendada(19, 0, 'b'), agendada(20, 0, 'c'), agendada(23, 0, 'd')],
      NOW,
    )
    expect(insight?.description).toContain('3 disparos entre 18h e 20h')
  })

  it('exige a janela: disparos espalhados pelo dia não são aperto', () => {
    const campanhas = [agendada(8, 0, 'a'), agendada(14, 0, 'b'), agendada(20, 0, 'c')]
    expect(buildInsight(campanhas, NOW)).toBeNull()
  })

  it('só olha para a frente — aperto que já passou não muda decisão nenhuma', () => {
    const ontem = (h: number, id: string) =>
      campaign({ id, scheduledAt: new Date(2026, 8, 2, h, 0).toISOString() })
    expect(buildInsight([ontem(18, 'a'), ontem(19, 'b'), ontem(20, 'c')], NOW)).toBeNull()
  })
})

describe('buildInsight — rascunho parado', () => {
  const velho = campaign({
    id: 'r', name: 'Black Friday', status: 'draft',
    createdAt: new Date(2026, 7, 20).toISOString(),
  })

  it('entra quando não há aperto de horário', () => {
    const insight = buildInsight([velho], NOW)
    expect(insight?.title).toBe('Um rascunho parado')
    expect(insight?.description).toContain('Black Friday')
  })

  it('perde para o aperto de horário, que é o que ainda dá para evitar', () => {
    const insight = buildInsight(
      [velho, agendada(18, 0, 'a'), agendada(19, 0, 'b'), agendada(20, 0, 'c')],
      NOW,
    )
    expect(insight?.title).toContain('carregada')
  })

  it('rascunho recente não vira aviso', () => {
    const recente = campaign({ id: 'r2', status: 'draft', createdAt: new Date(2026, 8, 2).toISOString() })
    expect(buildInsight([recente], NOW)).toBeNull()
  })
})
