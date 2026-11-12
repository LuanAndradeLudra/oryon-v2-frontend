import { describe, it, expect } from 'vitest'
import {
  chaveDoPeriodo, comparacaoPorExtenso, escreverPeriodo, hojeEmBrasilia, lerPeriodo, paramsDoPeriodo, periodoDoEco,
  periodoIncluiHoje, periodoPorExtenso, rotuloDoPeriodo, validarIntervalo, volumeSeguePeriodo, type Periodo,
} from './periodoDoPainel'
import { montarSnapshot } from './snapshotDoPainel'
import type { HomeStats } from '@/types'

// 05/11/2026, 15h em Brasília (18h UTC).
const AGORA = new Date('2026-11-05T18:00:00.000Z')
const q = (s: string) => new URLSearchParams(s)

describe('período do Dashboard', () => {
  it('lê o período da URL e cai no padrão (7 dias) quando inválido', () => {
    expect(lerPeriodo('30d')).toEqual({ tipo: 'fixo', valor: '30d', comparar: 'anterior' })
    expect(lerPeriodo('month').tipo === 'fixo' && lerPeriodo('month')).toMatchObject({ valor: 'month' })
    expect(lerPeriodo(null)).toEqual({ tipo: 'fixo', valor: '7d', comparar: 'anterior' })
    expect(lerPeriodo('365d')).toMatchObject({ tipo: 'fixo', valor: '7d' })
  })

  it('SCRUM-1216: lê "Últimos 90 dias", "Mês anterior", o personalizado e a comparação', () => {
    expect(lerPeriodo(q('periodo=90d'), AGORA)).toEqual({ tipo: 'fixo', valor: '90d', comparar: 'anterior' })
    expect(lerPeriodo(q('periodo=last_month&comparar=ano'), AGORA)).toEqual({ tipo: 'fixo', valor: 'last_month', comparar: 'ano_anterior' })
    expect(lerPeriodo(q('periodo=personalizado&de=2026-10-01&ate=2026-10-15'), AGORA))
      .toEqual({ tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-15', comparar: 'anterior' })
  })

  it('personalizado que deixou de valer cai no padrão, mantendo a comparação', () => {
    const padraoAno = { tipo: 'fixo', valor: '7d', comparar: 'ano_anterior' }
    // fim no futuro, início depois do fim, dia que não existe, mais de 400 dias, faltando data
    for (const s of [
      'de=2026-11-01&ate=2026-11-06',
      'de=2026-10-15&ate=2026-10-01',
      'de=2026-02-30&ate=2026-03-01',
      'de=2025-01-01&ate=2026-11-05',
      'de=2026-10-01',
    ]) expect(lerPeriodo(q(`periodo=personalizado&comparar=ano&${s}`), AGORA)).toEqual(padraoAno)
  })

  it('grava na URL sem sujeira: o padrão some, o personalizado leva as datas', () => {
    const base = q('aba=relatorios&periodo=30d&de=x&ate=y&comparar=ano')
    expect(escreverPeriodo(base, { tipo: 'fixo', valor: '7d', comparar: 'anterior' }).toString()).toBe('aba=relatorios')
    expect(escreverPeriodo(base, { tipo: 'fixo', valor: '90d', comparar: 'ano_anterior' }).toString()).toBe('aba=relatorios&periodo=90d&comparar=ano')
    const p: Periodo = { tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-15', comparar: 'anterior' }
    const url = escreverPeriodo(base, p)
    expect(url.toString()).toBe('aba=relatorios&periodo=personalizado&de=2026-10-01&ate=2026-10-15')
    // Ida e volta: o que se grava é o que se lê.
    expect(lerPeriodo(url, AGORA)).toEqual(p)
  })

  it('valida o "De … até …" com mensagem clara', () => {
    expect(validarIntervalo('2026-10-01', '2026-10-15', AGORA)).toBeNull()
    expect(validarIntervalo('2026-11-05', '2026-11-05', AGORA)).toBeNull()
    expect(validarIntervalo('', '2026-10-15', AGORA)).toBe('Escolha as duas datas.')
    expect(validarIntervalo('2026-10-15', '2026-10-01', AGORA)).toBe('A data inicial precisa ser antes da final.')
    expect(validarIntervalo('2026-11-01', '2026-11-06', AGORA)).toBe('O período vai no máximo até hoje.')
    // 400 dias passa; 401 não.
    expect(validarIntervalo('2025-10-02', '2026-11-05', AGORA)).toBeNull()
    expect(validarIntervalo('2025-10-01', '2026-11-05', AGORA)).toBe('O período pode ter no máximo 400 dias (este tem 401).')
  })

  it('"hoje" é o dia de Brasília (23h de Brasília já é o dia seguinte em UTC)', () => {
    expect(hojeEmBrasilia(new Date('2026-11-06T02:30:00.000Z'))).toBe('2026-11-05')
  })

  it('escreve o período por extenso e o rótulo da pílula', () => {
    expect(periodoPorExtenso('today')).toBe('hoje')
    expect(periodoPorExtenso('month')).toBe('neste mês')
    expect(periodoPorExtenso('90d')).toBe('nos últimos 90 dias')
    expect(periodoPorExtenso('last_month')).toBe('no mês anterior')
    const out: Periodo = { tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-15', comparar: 'anterior' }
    expect(periodoPorExtenso(out, AGORA)).toBe('de 01/10 a 15/10')
    expect(rotuloDoPeriodo(out, AGORA)).toBe('01/10 – 15/10')
    // Outro ano: com o ano; um dia só: "em".
    expect(periodoPorExtenso({ ...out, de: '2025-12-20', ate: '2026-01-10' }, AGORA)).toBe('de 20/12/2025 a 10/01')
    expect(periodoPorExtenso({ ...out, de: '2026-10-07', ate: '2026-10-07' }, AGORA)).toBe('em 07/10')
    expect(rotuloDoPeriodo({ tipo: 'fixo', valor: 'last_month', comparar: 'anterior' })).toBe('Mês anterior')
    expect(comparacaoPorExtenso('ano_anterior')).toBe('mesmo período do ano anterior')
  })

  it('a chave separa período e comparação', () => {
    expect(chaveDoPeriodo({ tipo: 'fixo', valor: '7d', comparar: 'anterior' })).toBe('7d')
    expect(chaveDoPeriodo({ tipo: 'fixo', valor: '7d', comparar: 'ano_anterior' })).toBe('7d:ano')
    expect(chaveDoPeriodo({ tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-15', comparar: 'anterior' })).toBe('2026-10-01..2026-10-15')
  })

  it('parâmetros (contrato de 05/11): os de sempre ficam iguais; os novos seguem o contrato', () => {
    const fixo = (valor: '30d' | 'today' | '90d' | 'last_month', comparar: 'anterior' | 'ano_anterior' = 'anterior'): Periodo => ({ tipo: 'fixo', valor, comparar })
    // O de sempre: exatamente o que o app mandava.
    expect(paramsDoPeriodo(fixo('30d'))).toEqual({ range: '30d' })
    expect(paramsDoPeriodo(fixo('today'), { comparar: 'sempre' })).toEqual({ range: 'today', compare: 1 })
    expect(paramsDoPeriodo(fixo('today'), { comparar: 'ano' })).toEqual({ range: 'today' })
    // Fixos novos, personalizado (from/to sem range) e o ano anterior.
    expect(paramsDoPeriodo(fixo('90d'), { comparar: 'sempre' })).toEqual({ range: '90d', compare: 1 })
    expect(paramsDoPeriodo(fixo('last_month', 'ano_anterior'), { comparar: 'sempre' })).toEqual({ range: 'last_month', compare: 'previous_year' })
    expect(paramsDoPeriodo(fixo('30d', 'ano_anterior'), { comparar: 'ano' })).toEqual({ range: '30d', compare: 'previous_year' })
    const out: Periodo = { tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-15', comparar: 'ano_anterior' }
    expect(paramsDoPeriodo(out)).toEqual({ from: '2026-10-01', to: '2026-10-15' })
    expect(paramsDoPeriodo(out, { comparar: 'sempre' })).toEqual({ from: '2026-10-01', to: '2026-10-15', compare: 'previous_year' })
  })

  it('o rótulo sai do período que o backend ecoa (`period`)', () => {
    expect(periodoDoEco({ id: 'custom', from: '2026-10-01', to: '2026-10-15', compare: 'previous_year' }))
      .toEqual({ tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-15', comparar: 'ano_anterior' })
    expect(periodoDoEco({ id: 'last_month', from: '2026-10-01', to: '2026-10-31', compare: 'previous_period' }))
      .toEqual({ tipo: 'fixo', valor: 'last_month', comparar: 'anterior' })
    // Sem eco (pedido de sempre) ou eco estranho: nada — vale o pedido.
    expect(periodoDoEco(undefined)).toBeNull()
    expect(periodoDoEco({ id: 'custom', from: 'ontem' })).toBeNull()
    expect(periodoDoEco({ id: 'semana' })).toBeNull()
  })

  it('tempo real: só o período que termina hoje pode mudar', () => {
    for (const v of ['today', '7d', '30d', 'month', '90d'] as const) expect(periodoIncluiHoje({ tipo: 'fixo', valor: v, comparar: 'anterior' }, AGORA)).toBe(true)
    expect(periodoIncluiHoje({ tipo: 'fixo', valor: 'last_month', comparar: 'anterior' }, AGORA)).toBe(false)
    expect(periodoIncluiHoje({ tipo: 'personalizado', de: '2026-10-01', ate: '2026-11-05', comparar: 'anterior' }, AGORA)).toBe(true)
    expect(periodoIncluiHoje({ tipo: 'personalizado', de: '2026-10-01', ate: '2026-11-04', comparar: 'anterior' }, AGORA)).toBe(false)
  })

  it('K11: o volume segue todos os períodos (o backend manda já recortado, em dias de Brasília)', () => {
    for (const p of ['today', '7d', '30d', 'month', '90d', 'last_month'] as const) expect(volumeSeguePeriodo(p)).toBe(true)
  })
})

describe('montarSnapshot', () => {
  it('usa os números do backend sem fabricar a distribuição de status sem snapshot', () => {
    // K1: a taxa vem do backend (resolutionRate), o front não recalcula.
    const s = { conversationsOpen: 4, queueCount: 2, conversationsResolvedToday: 3, totalConversations: 12, resolutionRate: 25, appointmentsScheduled: 7 } as unknown as HomeStats
    const snap = montarSnapshot(s, null)
    const kpi = (id: string) => snap.kpis.find((k) => k.id === id)?.value
    // Auditoria 12/11: "conversas ativas" (agora) saiu dos Relatórios.
    expect(kpi('active_conversations')).toBeUndefined()
    expect(kpi('resolved')).toBe(3)
    expect(kpi('resolution_rate')).toBe(25)
    expect(kpi('appointments_scheduled')).toBe(7)
    expect(snap.statusDistribution).toBeNull()
    expect(snap.volumeChart).toEqual([])
  })
})
