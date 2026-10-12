import { describe, it, expect } from 'vitest'
import { modeloCombinaComLinha } from './modeloDaLinha'

describe('modeloCombinaComLinha', () => {
  it('modelo de outra linha não combina', () => {
    expect(modeloCombinaComLinha({ whatsappNumberId: 'A' }, 'B')).toBe(false)
  })
  it('mesma linha, modelo sem linha ou sem linha escolhida combinam', () => {
    expect(modeloCombinaComLinha({ whatsappNumberId: 'A' }, 'A')).toBe(true)
    expect(modeloCombinaComLinha({ whatsappNumberId: undefined }, 'B')).toBe(true)
    expect(modeloCombinaComLinha({ whatsappNumberId: 'A' }, null)).toBe(true)
    expect(modeloCombinaComLinha(null, 'B')).toBe(true)
  })
})
