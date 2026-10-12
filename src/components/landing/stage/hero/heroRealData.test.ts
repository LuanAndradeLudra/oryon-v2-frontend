import { describe, expect, it } from 'vitest'
import { HERO_STAGE_PROPOSTA, HERO_STAGE_QUALIFICACAO, heroDealsByStage } from './heroRealData'

describe('quadro da história no Hero', () => {
  it('mantém o negócio da Marina à vista antes e depois do avanço', () => {
    const antes = heroDealsByStage('etiqueta')
    const depois = heroDealsByStage('avanco')

    expect(antes[HERO_STAGE_QUALIFICACAO][0].id).toBe('demo-deal-0')
    expect(depois[HERO_STAGE_PROPOSTA][0].id).toBe('demo-deal-0')
    expect(antes[HERO_STAGE_PROPOSTA].length).toBeLessThanOrEqual(4)
    expect(depois[HERO_STAGE_PROPOSTA].length).toBeLessThanOrEqual(4)
  })
})
