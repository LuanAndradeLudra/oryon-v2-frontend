// B2 (SCRUM-928, D0-7) — espelha deal-probability.ts do backend: terminal
// (isWon/isLost) sempre 100/0; senão override do negócio, senão default da
// etapa; nada configurado → null. Ponderado sem probabilidade = valor cheio.
import { describe, it, expect } from 'vitest'
import { effectiveProbability, dealProbability } from './dealProbability'
import type { PipelineStage } from '@/types'

const stage = (extra: Partial<PipelineStage> = {}): PipelineStage => ({
  id: 's1', tenantId: 't', pipelineId: 'p', key: 's1', label: 'Etapa', color: '#111', order: 0,
  isWon: false, isLost: false, probability: null, ...extra,
})

describe('effectiveProbability', () => {
  it('etapa isWon → sempre 100, mesmo com override configurado', () => {
    expect(effectiveProbability({ status: 'won', probability: 40 }, stage({ isWon: true }))).toBe(100)
  })

  it('etapa isLost → sempre 0', () => {
    expect(effectiveProbability({ status: 'lost', probability: 90 }, stage({ isLost: true }))).toBe(0)
  })

  it('sem stage mas status won/lost → usa o status', () => {
    expect(effectiveProbability({ status: 'won', probability: null }, null)).toBe(100)
    expect(effectiveProbability({ status: 'lost', probability: null }, null)).toBe(0)
  })

  it('etapa normal com override do negócio → prevalece sobre o default da etapa', () => {
    expect(effectiveProbability({ status: 'open', probability: 60 }, stage({ probability: 20 }))).toBe(60)
  })

  it('etapa normal sem override → cai no default da etapa', () => {
    expect(effectiveProbability({ status: 'open', probability: null }, stage({ probability: 35 }))).toBe(35)
  })

  it('nada configurado (nem override, nem etapa) → null', () => {
    expect(effectiveProbability({ status: 'open', probability: null }, stage())).toBeNull()
  })

  it('override não-finito é tratado como ausente, nunca como 0', () => {
    expect(effectiveProbability({ status: 'open', probability: NaN as unknown as number }, stage({ probability: 25 }))).toBe(25)
  })
})

describe('dealProbability', () => {
  it('sem probabilidade configurada: ponderado é o valor CHEIO, nunca null/0', () => {
    const result = dealProbability({ status: 'open', probability: null, amountCents: 10_000 }, stage())
    expect(result.effective).toBeNull()
    expect(result.configured).toBe(false)
    expect(result.weightedAmountCents).toBe(10_000)
  })

  it('com probabilidade efetiva: ponderado = valor × prob / 100', () => {
    const result = dealProbability({ status: 'open', probability: null, amountCents: 10_000 }, stage({ probability: 40 }))
    expect(result.effective).toBe(40)
    expect(result.configured).toBe(true)
    expect(result.weightedAmountCents).toBe(4_000)
  })

  it('negócio perdido nunca pondera o valor cheio — pondera 0', () => {
    const result = dealProbability({ status: 'lost', probability: null, amountCents: 10_000 }, stage({ isLost: true }))
    expect(result.weightedAmountCents).toBe(0)
  })

  it('negócio ganho pondera o valor cheio', () => {
    const result = dealProbability({ status: 'won', probability: null, amountCents: 10_000 }, stage({ isWon: true }))
    expect(result.weightedAmountCents).toBe(10_000)
  })
})
