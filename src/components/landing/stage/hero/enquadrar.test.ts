// O enquadramento do palco do Hero (25/09): a escala respeita a menor
// restrição entre largura e altura, com piso de legibilidade, e antes de
// encolher o texto além do alvo a tela do app fica mais baixa.
import { describe, it, expect } from 'vitest'
import { enquadrar } from './enquadramento'

const EXTRA_H = 92 // moldura + folgas do palco
const altura = (q: { fit: number; h: number }) => (q.h + EXTRA_H) * q.fit

describe('enquadrar', () => {
  it('desktop comum (1440 × 900): cabe na altura, texto no alvo, tela do app mais baixa', () => {
    const q = enquadrar(1416, 551, false, 40)
    expect(q.fit).toBeCloseTo(0.8, 2)
    expect(q.h).toBeLessThan(720)
    expect(altura(q)).toBeLessThanOrEqual(551 + 1)
  })

  it('tela alta e larga: a tela do app fica inteira e o palco cresce até a largura', () => {
    const q = enquadrar(1536, 900, false, 40)
    expect(q.h).toBe(720)
    expect(q.fit).toBeGreaterThan(0.8)
    expect(q.fit).toBeLessThanOrEqual((1536 - 80) / 1560 + 0.001)
  })

  it('tela baixa (1280 × 720): tela do app no mínimo e escala no piso — nunca menor', () => {
    const q = enquadrar(1256, 300, false, 40)
    expect(q.h).toBe(560)
    expect(q.fit).toBeCloseTo(0.58, 2)
  })

  it('a escala nunca passa da largura disponível (menos os corredores do conector)', () => {
    const q = enquadrar(1000, 2000, false, 40)
    expect(q.fit * 1560).toBeLessThanOrEqual(1000 - 80 + 0.5)
  })

  it('celular: a largura manda na escala; só a altura da tela do app se ajusta', () => {
    const q = enquadrar(358, 300, true, 0)
    expect(q.fit).toBeCloseTo(358 / 402, 3)
    expect(q.h).toBe(560)
  })
})
