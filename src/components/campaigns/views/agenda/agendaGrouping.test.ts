import { describe, it, expect } from 'vitest'
import { groupByDay, nowLineIndex, executionDate } from './agendaGrouping'
import type { AgendaBucket, AgendaItem } from './agendaGrouping'
import { railLabel, relativeToNow } from './agendaTime'
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

describe('executionDate', () => {
  it('prefere sentAt a scheduledAt', () => {
    const c = campaign({
      id: 'a',
      sentAt: new Date(2026, 8, 2, 10, 0).toISOString(),
      scheduledAt: new Date(2026, 8, 1, 8, 0).toISOString(),
    })
    expect(executionDate(c)?.getDate()).toBe(2)
  })

  it('devolve null quando não há nenhuma das duas', () => {
    expect(executionDate(campaign({ id: 'a' }))).toBeNull()
  })

  it('devolve null para data inválida em vez de um Invalid Date', () => {
    expect(executionDate(campaign({ id: 'a', scheduledAt: 'nao-e-data' }))).toBeNull()
  })
})

describe('groupByDay', () => {
  it('ordena hoje, depois futuro crescente, depois anteriores, depois sem data', () => {
    const groups = groupByDay([
      campaign({ id: 'passado', status: 'sent', sentAt: new Date(2026, 8, 1, 8, 0).toISOString() }),
      campaign({ id: 'rascunho', status: 'draft' }),
      campaign({ id: 'futuro', scheduledAt: new Date(2026, 8, 8, 18, 0).toISOString() }),
      campaign({ id: 'hoje', scheduledAt: new Date(2026, 8, 3, 20, 30).toISOString() }),
    ], NOW)

    expect(groups.map((g) => g.label)).toEqual(['Hoje', 'Terça', 'Anteriores', 'Sem data'])
  })

  it('agrupa os anteriores num grupo só, do mais recente para o mais antigo', () => {
    const groups = groupByDay([
      campaign({ id: 'seg', status: 'sent', sentAt: new Date(2026, 7, 31, 16, 0).toISOString() }),
      campaign({ id: 'qua', status: 'sent', sentAt: new Date(2026, 8, 2, 10, 30).toISOString() }),
    ], NOW)

    const past = groups.find((g) => g.key === 'past')!
    expect(past.items.map((i) => i.campaign.id)).toEqual(['qua', 'seg'])
  })

  it('ordena os itens do dia por horário crescente', () => {
    const groups = groupByDay([
      campaign({ id: 'tarde', scheduledAt: new Date(2026, 8, 3, 20, 30).toISOString() }),
      campaign({ id: 'manha', status: 'sent', sentAt: new Date(2026, 8, 3, 9, 14).toISOString() }),
    ], NOW)

    expect(groups[0].items.map((i) => i.campaign.id)).toEqual(['manha', 'tarde'])
  })

  it('rascunho sem data cai em "Sem data", nunca em hoje', () => {
    const groups = groupByDay([campaign({ id: 'r', status: 'draft' })], NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('undated')
    expect(groups[0].bucket).toBe('undated')
  })

  it('chama de "Amanhã" o dia seguinte', () => {
    const groups = groupByDay(
      [campaign({ id: 'a', scheduledAt: new Date(2026, 8, 4, 10, 30).toISOString() })],
      NOW,
    )
    expect(groups[0].label).toBe('Amanhã')
  })

  describe('realMessages — o "· N mensagens" do cabeçalho', () => {
    it('soma só o que já foi enviado', () => {
      const groups = groupByDay([
        campaign({
          id: 'enviada', status: 'sent',
          sentAt: new Date(2026, 8, 3, 9, 0).toISOString(),
          stats: { total: 84, sent: 84, delivered: 80, read: 71, failed: 0 },
        }),
        campaign({ id: 'agendada', scheduledAt: new Date(2026, 8, 3, 20, 30).toISOString() }),
      ], NOW)

      expect(groups[0].realMessages).toBe(84)
    })

    it('é null quando o dia só tem agendadas — não vira 0', () => {
      const groups = groupByDay(
        [campaign({ id: 'a', scheduledAt: new Date(2026, 8, 3, 20, 30).toISOString() })],
        NOW,
      )
      expect(groups[0].realMessages).toBeNull()
    })
  })
})

describe('nowLineIndex', () => {
  const hoje = (h: number, m: number, id: string, status: CampaignStatus = 'scheduled') =>
    campaign({ id, status, scheduledAt: new Date(2026, 8, 3, h, m).toISOString() })

  it('entra antes do primeiro item que ainda não aconteceu', () => {
    const [group] = groupByDay([hoje(9, 14, 'a', 'sent'), hoje(18, 0, 'b'), hoje(20, 30, 'c')], NOW)
    // 18:31 — depois de 09:14 e 18:00, antes de 20:30.
    expect(nowLineIndex(group, NOW)).toBe(2)
  })

  it('vai para o fim quando tudo no dia já passou', () => {
    const [group] = groupByDay([hoje(9, 0, 'a', 'sent'), hoje(10, 0, 'b', 'sent')], NOW)
    expect(nowLineIndex(group, NOW)).toBe(2)
  })

  it('vai para o começo quando nada do dia aconteceu ainda', () => {
    const [group] = groupByDay([hoje(20, 0, 'a'), hoje(21, 0, 'b')], NOW)
    expect(nowLineIndex(group, NOW)).toBe(0)
  })

  it('não existe fora do grupo de hoje', () => {
    const groups = groupByDay([
      campaign({ id: 'f', scheduledAt: new Date(2026, 8, 8, 18, 0).toISOString() }),
      campaign({ id: 'p', status: 'sent', sentAt: new Date(2026, 8, 1, 8, 0).toISOString() }),
      campaign({ id: 'r', status: 'draft' }),
    ], NOW)

    for (const g of groups) expect(nowLineIndex(g, NOW)).toBeNull()
  })
})

describe('railLabel', () => {
  const item = (over: Partial<Campaign> & { id: string }, at: Date | null): AgendaItem => ({
    campaign: campaign(over),
    at,
  })
  const label = (i: AgendaItem, bucket: AgendaBucket = 'today') => railLabel(i, bucket, NOW)

  it('rascunho sem data não inventa hora', () => {
    expect(label(item({ id: 'r', status: 'draft' }, null), 'undated')).toEqual({
      primary: '—',
      secondary: 'sem hora',
    })
  })

  it('em "anteriores" o trilho traz o dia, porque o grupo é um só', () => {
    // 2026-09-02 é uma quarta-feira.
    const at = new Date(2026, 8, 2, 10, 30)
    expect(label(item({ id: 'p', status: 'sent' }, at), 'past')).toEqual({
      primary: 'qua 2',
      secondary: '10:30',
    })
  })

  it('agendada que ainda não chegou mostra a contagem regressiva', () => {
    const at = new Date(2026, 8, 3, 20, 30)
    expect(label(item({ id: 'f' }, at))).toEqual({ primary: '20:30', secondary: 'em 1h 59' })
  })

  it('agendada cuja hora já passou cai na palavra do status, não em contagem negativa', () => {
    // O motor pode não ter disparado ainda: `at < now` com status `scheduled`.
    const at = new Date(2026, 8, 3, 18, 0)
    expect(label(item({ id: 'a' }, at))).toEqual({ primary: '18:00', secondary: 'agendada' })
  })

  it('os outros status mostram a palavra do estado', () => {
    const at = new Date(2026, 8, 3, 18, 0)
    const word = (status: CampaignStatus) => label(item({ id: status, status }, at)).secondary
    expect(word('sending')).toBe('enviando')
    expect(word('paused')).toBe('pausada')
    expect(word('failed')).toBe('falhou')
    expect(word('cancelled')).toBe('cancelada')
    expect(word('sent')).toBe('enviada')
  })
})

describe('relativeToNow', () => {
  it('conta dias de calendário, que é a conta que o cabeçalho do dia mostra', () => {
    // 4 d 23 h 29 min até terça 8 — o mockup escreve "em 5 dias" ao lado de
    // "Terça, 8 de setembro", e é isso que quem lê conta (3 → 8).
    expect(relativeToNow(new Date(2026, 8, 8, 18, 0), NOW)).toBe('em 5 dias')
    // E 36 h a partir de quinta 18:31 caem em sábado: 2 dias de calendário.
    expect(relativeToNow(new Date(2026, 8, 5, 6, 31), NOW)).toBe('em 2 dias')
  })

  it('abaixo de um minuto responde a faixa, não o valor', () => {
    expect(relativeToNow(new Date(2026, 8, 3, 18, 31, 40), NOW)).toBe('em menos de 1 min')
  })

  it('o passado usa "há"', () => {
    expect(relativeToNow(new Date(2026, 8, 3, 18, 6), NOW)).toBe('há 25 min')
  })
})
