import { describe, it, expect } from 'vitest'
import { densityByDay, dayAriaLabel, MAX_DOTS } from './densityDots'
import { statusColor } from './agendaStatus'
import { relativeToNow } from './agendaTime'
import { funnelSegments, missingForDraft, sendingProgress } from './campaignFacts'
import type { Campaign, CampaignStatus } from '@/types'

const NOW = new Date(2026, 8, 3, 18, 31, 0)

/** `CampaignStats` exige as 5 contagens; os testes só se importam com algumas. */
function stats(over: Partial<Campaign['stats']> = {}): Campaign['stats'] {
  return { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, ...over }
}

function campaign(over: Partial<Campaign> & { id: string }): Campaign {
  return {
    tenantId: 't1',
    name: `Disparo ${over.id}`,
    templateId: 'tpl-1',
    templateName: 'template_teste',
    segment: { type: 'all' },
    variableMappings: [],
    status: 'scheduled' as CampaignStatus,
    stats: stats(),
    createdByUserId: 'u1',
    createdAt: new Date(2026, 8, 1).toISOString(),
    ...over,
  } as Campaign
}

const onDay = (id: string, status: CampaignStatus, day: number) =>
  campaign({ id, status, scheduledAt: new Date(2026, 8, day, 10, 0).toISOString() })

describe('densityByDay', () => {
  it('chaveia por dia de execução e conta o total real', () => {
    const map = densityByDay([
      onDay('a', 'sent', 3), onDay('b', 'sent', 3), onDay('c', 'scheduled', 4),
    ])
    expect(map.get('2026-09-03')?.total).toBe(2)
    expect(map.get('2026-09-04')?.total).toBe(1)
  })

  it('não repete cor quando o dia tem dois disparos do mesmo status', () => {
    const map = densityByDay([onDay('a', 'sent', 3), onDay('b', 'sent', 3)])
    expect(map.get('2026-09-03')?.colors).toEqual([statusColor('sent')])
  })

  it('corta em 3 pontos e mantém os mais urgentes', () => {
    const map = densityByDay([
      onDay('a', 'draft', 3),
      onDay('b', 'sent', 3),
      onDay('c', 'scheduled', 3),
      onDay('d', 'sending', 3),
      onDay('e', 'failed', 3),
    ])
    const day = map.get('2026-09-03')!
    expect(day.colors).toHaveLength(MAX_DOTS)
    expect(day.statuses.slice(0, 3)).toEqual(['failed', 'sending', 'scheduled'])
    expect(day.total).toBe(5)
  })

  it('ignora campanha sem data — não há dia onde pintá-la', () => {
    const map = densityByDay([campaign({ id: 'r', status: 'draft' })])
    expect(map.size).toBe(0)
  })
})

describe('dayAriaLabel', () => {
  it('anuncia o total do dia mesmo quando só 3 pontos cabem', () => {
    const map = densityByDay([
      onDay('a', 'draft', 3), onDay('b', 'sent', 3),
      onDay('c', 'scheduled', 3), onDay('d', 'failed', 3),
    ])
    expect(dayAriaLabel('3 de setembro', map.get('2026-09-03'))).toBe('3 de setembro, 4 disparos')
  })

  it('diz "sem disparos" num dia vazio', () => {
    expect(dayAriaLabel('7 de setembro', undefined)).toBe('7 de setembro, sem disparos')
  })
})

describe('relativeToNow', () => {
  it('minutos abaixo de uma hora', () => {
    expect(relativeToNow(new Date(2026, 8, 3, 18, 56), NOW)).toBe('em 25 min')
  })

  it('horas e minutos, como "em 1h 59"', () => {
    expect(relativeToNow(new Date(2026, 8, 3, 20, 30), NOW)).toBe('em 1h 59')
  })

  it('dias quando passa de 24h', () => {
    expect(relativeToNow(new Date(2026, 8, 8, 18, 0), NOW)).toBe('em 5 dias')
  })

  it('usa "há" no passado', () => {
    expect(relativeToNow(new Date(2026, 8, 3, 18, 1), NOW)).toBe('há 30 min')
  })
})

describe('missingForDraft', () => {
  it('lista o que falta a partir do próprio registro', () => {
    const c = campaign({ id: 'r', status: 'draft', templateId: '', segment: { type: 'tag' } })
    expect(missingForDraft(c)).toEqual(['template', 'público', 'horário'])
  })

  it('segmento "all" conta como público preenchido', () => {
    const c = campaign({ id: 'r', status: 'draft', segment: { type: 'all' } })
    expect(missingForDraft(c)).toEqual(['horário'])
  })

  it('segmento por tag sem tag nenhuma ainda falta público', () => {
    const c = campaign({ id: 'r', status: 'draft', segment: { type: 'tag', tagIds: [] } })
    expect(missingForDraft(c)).toContain('público')
  })
})

describe('funnelSegments', () => {
  it('transforma o funil cumulativo em faixas disjuntas que somam o enviado', () => {
    const c = campaign({
      id: 'a', status: 'sent',
      stats: stats({ total: 100, sent: 100, delivered: 90, read: 60, replied: 20, failed: 5 }),
    })
    const segments = funnelSegments(c)!
    const byLabel = Object.fromEntries(segments.map((s) => [s.label, s.value]))

    expect(byLabel['Respondeu']).toBe(20)
    expect(byLabel['Lida']).toBe(40)         // 60 lidas − 20 respondidas
    expect(byLabel['Entregue']).toBe(30)     // 90 entregues − 60 lidas
    expect(byLabel['Não entregue']).toBe(10) // 100 enviadas − 90 entregues
    expect(byLabel['Respondeu'] + byLabel['Lida'] + byLabel['Entregue'] + byLabel['Não entregue'])
      .toBe(100)
  })

  it('não deixa faixa negativa quando os números vêm inconsistentes', () => {
    const c = campaign({
      id: 'a', status: 'sent',
      stats: stats({ total: 10, sent: 10, delivered: 20, read: 30, replied: 40, failed: 0 }),
    })
    for (const s of funnelSegments(c)!) expect(s.value).toBeGreaterThanOrEqual(0)
  })

  it('devolve null sem envio — barra vazia não é informação', () => {
    expect(funnelSegments(campaign({ id: 'a', status: 'sent', stats: stats({ sent: 0 }) }))).toBeNull()
  })
})

describe('sendingProgress', () => {
  it('é null sem total — a agenda não desenha barra sobre denominador inexistente', () => {
    expect(sendingProgress(campaign({ id: 'a', status: 'sending', stats: stats({ sent: 5 }) }))).toBeNull()
  })

  it('limita o enviado ao total', () => {
    const p = sendingProgress(campaign({
      id: 'a', status: 'sending', stats: stats({ total: 100, sent: 150 }),
    }))!
    expect(p.sent).toBe(100)
    expect(p.pct).toBe(100)
  })
})
