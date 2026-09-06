import { describe, expect, it } from 'vitest'
import { buildHeatmap, buildKpis, buildReportModel, hasExtendedAnalytics, peakWindow } from './reportModel'
import type { Campaign } from '@/types'
import type { CampaignReply } from '@/types/campaignsV2'

function campanha(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    tenantId: 't1',
    name: 'Pesquisa de satisfação',
    templateId: 'tpl',
    templateName: 'nps_pos_compra',
    segment: {} as Campaign['segment'],
    variableMappings: [],
    status: 'sent',
    sentAt: '2026-09-02T13:30:00.000Z',
    stats: { total: 520, sent: 520, delivered: 498, read: 340, failed: 22 },
    createdByUserId: 'u1',
    createdAt: '2026-09-02T13:00:00.000Z',
    ...over,
  }
}

const ANALYTICS_V2 = {
  campaignId: 'c1',
  funnel: { sent: 520, delivered: 498, read: 340, replied: 88 },
  readHeatmap: [{ dayOffset: 0, hour: 20, count: 9 }],
  failures: [
    { code: 'invalid_number', reason: 'Número inválido / sem WhatsApp', count: 14 },
    { code: 'opt_out', reason: 'Opt-out ativo na Meta', count: 6 },
  ],
  replies: [],
  avgTimeToReadMinutes: 41,
}

describe('hasExtendedAnalytics — detecção por FORMA, não por status', () => {
  it('reconhece o mundo BE.1 pela presença de `funnel`', () => {
    expect(hasExtendedAnalytics(ANALYTICS_V2)).toBe(true)
  })

  it('rejeita a resposta antiga, que também é HTTP 200', () => {
    // É exatamente isto que o backend devolve hoje: 200, sem funnel. Uma
    // detecção por status (404/501) nunca dispararia aqui.
    expect(hasExtendedAnalytics({ campaignId: 'c1', campaignName: 'X', stats: {}, sentAt: null })).toBe(false)
  })

  it('não quebra com null/undefined/primitivo', () => {
    expect(hasExtendedAnalytics(null)).toBe(false)
    expect(hasExtendedAnalytics(undefined)).toBe(false)
    expect(hasExtendedAnalytics('funnel')).toBe(false)
  })
})

describe('buildReportModel', () => {
  it('usa o funil real quando a BE.1 respondeu', () => {
    const vm = buildReportModel(campanha(), ANALYTICS_V2)

    expect(vm.hasRecipientData).toBe(true)
    expect(vm.funnel.map((s) => s.value)).toEqual([520, 498, 340, 88])
    expect(vm.avgTimeToReadMinutes).toBe(41)
    expect(vm.failuresTotal).toBe(20)
  })

  it('cai para campaign.stats no mundo antigo, sem inventar os campos que não existem', () => {
    const vm = buildReportModel(campanha(), { campaignId: 'c1', stats: {}, sentAt: null })

    expect(vm.hasRecipientData).toBe(false)
    expect(vm.funnel.map((s) => s.value)).toEqual([520, 498, 340, null])
    // `replied` não é escrito por ninguém hoje: "—", nunca 0.
    expect(vm.funnel[3].value).toBeNull()
    expect(vm.avgTimeToReadMinutes).toBeNull()
    expect(vm.failures).toEqual([])
    expect(vm.heatmap.matrix).toEqual([])
  })

  it('não estima o tempo médio até ler no cliente quando o backend não manda', () => {
    const vm = buildReportModel(campanha(), { ...ANALYTICS_V2, avgTimeToReadMinutes: null })
    expect(vm.avgTimeToReadMinutes).toBeNull()
  })

  it('sobrevive a uma campanha que ainda não carregou', () => {
    const vm = buildReportModel(null, { campaignId: 'c1' })
    expect(vm.funnel.every((s) => s.value === null)).toBe(true)
  })
})

describe('buildKpis', () => {
  const respostas: CampaignReply[] = [
    { contactId: '1', name: 'Carla', text: 'ótimo', at: '', score: 10, class: 'promoter' },
    { contactId: '2', name: 'João', text: 'ruim', at: '', score: 7, class: 'detractor' },
    { contactId: '3', name: 'Renata', text: 'amei', at: '', score: 9, class: 'promoter' },
    { contactId: '4', name: 'Ana', text: 'sair', at: '', score: null, class: 'optout' },
  ]

  it('calcula a média das notas existentes, ignorando as não classificadas', () => {
    expect(buildKpis(respostas).averageScore).toBe(8.7) // (10+7+9)/3
  })

  it('mede promotores sobre o total CLASSIFICADO, não sobre o total de respostas', () => {
    const kpis = buildKpis(respostas)
    expect(kpis.promoterCount).toBe(2)
    expect(kpis.classifiedCount).toBe(4)
    expect(kpis.promoterPct).toBe(50)
  })

  it('devolve tudo em null antes da BE.9 classificar — "—" na tela, não zero', () => {
    const semClasse: CampaignReply[] = [
      { contactId: '1', name: 'A', text: 'x', at: '', score: null, class: null },
    ]
    const kpis = buildKpis(semClasse)
    expect(kpis.averageScore).toBeNull()
    expect(kpis.promoterPct).toBeNull()
    expect(kpis.optOutCount).toBeNull()
  })

  it('não divide por zero sem respostas', () => {
    const kpis = buildKpis([])
    expect(kpis.averageScore).toBeNull()
    expect(kpis.promoterPct).toBeNull()
    expect(kpis.optOutPct).toBeNull()
  })
})

describe('buildHeatmap', () => {
  it('monta a grade dia × hora e acha o pico', () => {
    const hm = buildHeatmap(
      [
        { dayOffset: 0, hour: 18, count: 10 },
        { dayOffset: 0, hour: 19, count: 12 },
        { dayOffset: 0, hour: 9, count: 3 },
        { dayOffset: 1, hour: 19, count: 4 },
      ],
      '2026-09-02T13:30:00.000Z', // quarta-feira
    )

    expect(hm.matrix).toHaveLength(2)
    expect(hm.matrix[0]).toHaveLength(24)
    expect(hm.matrix[0][18]).toBe(10)
    expect(hm.max).toBe(12)
    expect(hm.total).toBe(29)
    expect(hm.peak).toEqual({ from: 18, to: 20 })
  })

  it('NÃO reconverte fuso: a hora que chega é a hora que vai para a grade', () => {
    // Depois do fix da BE.1, `hour` já vem em horário local de São Paulo. Se
    // alguém aplicasse new Date(...).getHours() aqui, 23 viraria outra coisa.
    const hm = buildHeatmap([{ dayOffset: 0, hour: 23, count: 5 }], '2026-09-02T13:30:00.000Z')
    expect(hm.matrix[0][23]).toBe(5)
    expect(hm.matrix[0].reduce((a, b) => a + b, 0)).toBe(5)
  })

  it('rotula os dias a partir do dia do envio', () => {
    // 2026-09-02 é uma quarta-feira.
    const hm = buildHeatmap(
      [{ dayOffset: 0, hour: 10, count: 1 }, { dayOffset: 2, hour: 10, count: 1 }],
      '2026-09-02T13:30:00.000Z',
    )
    expect(hm.dayLabels).toEqual(['Qua', 'Qui', 'Sex'])
  })

  it('cai para D+N quando a campanha não tem data de envio', () => {
    const hm = buildHeatmap([{ dayOffset: 1, hour: 10, count: 1 }], null)
    expect(hm.dayLabels).toEqual(['D+0', 'D+1'])
  })

  it('descarta pontos fora da grade em vez de escrever fora do array', () => {
    const hm = buildHeatmap(
      [
        { dayOffset: 0, hour: 25, count: 9 },
        { dayOffset: -1, hour: 5, count: 9 },
        { dayOffset: 0, hour: 5, count: 2 },
      ],
      null,
    )
    expect(hm.total).toBe(2)
    expect(hm.max).toBe(2)
  })

  it('devolve grade vazia sem pontos', () => {
    expect(buildHeatmap([], null).matrix).toEqual([])
    expect(buildHeatmap([], null).peak).toBeNull()
  })
})

describe('peakWindow', () => {
  it('devolve null quando ninguém leu', () => {
    expect(peakWindow([new Array(24).fill(0)])).toBeNull()
    expect(peakWindow([])).toBeNull()
  })

  it('soma os dias antes de escolher a janela', () => {
    const dia1 = new Array(24).fill(0)
    const dia2 = new Array(24).fill(0)
    dia1[8] = 5
    dia1[9] = 5 // 10 no dia 1
    dia2[20] = 6
    dia2[21] = 6 // 12 somando os dois dias
    expect(peakWindow([dia1, dia2])).toEqual({ from: 20, to: 22 })
  })
})
