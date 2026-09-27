import { describe, expect, it } from 'vitest'
import { planoDoFoco, borderRadiusDoFoco, recortarAlvo, recortarForma } from './focoGeometry'

describe('recortarAlvo', () => {
  it('mantém as bordas exatas quando o elemento cabe no recorte', () => {
    expect(recortarAlvo({ x: 40, y: 50, w: 120, h: 60 }, { x: 0, y: 0, w: 400, h: 300 }))
      .toEqual({ x: 40, y: 50, w: 120, h: 60 })
  })

  it('limita o foco à área visível sem alcançar um elemento vizinho', () => {
    expect(recortarAlvo({ x: 90, y: 80, w: 120, h: 60 }, { x: 100, y: 0, w: 100, h: 200 }))
      .toEqual({ x: 100, y: 80, w: 100, h: 60 })
  })

  it('não cria abertura quando o alvo está fora da tela', () => {
    expect(recortarAlvo({ x: 300, y: 80, w: 50, h: 40 }, { x: 0, y: 0, w: 200, h: 200 }))
      .toEqual({ x: 300, y: 80, w: 0, h: 40 })
  })
})

describe('formato individual do foco', () => {
  const bolha = {
    tl: { x: 12, y: 12 }, tr: { x: 3, y: 3 },
    br: { x: 12, y: 12 }, bl: { x: 12, y: 12 },
  }

  it('preserva os quatro cantos diferentes de uma bolha', () => {
    const forma = recortarForma({ x: 20, y: 30, w: 160, h: 70 }, { x: 0, y: 0, w: 300, h: 200 }, bolha)
    expect(borderRadiusDoFoco(forma.raios)).toBe('12px 3px 12px 12px / 12px 3px 12px 12px')
  })

  it('endireita só os cantos atingidos pelo recorte da conversa', () => {
    const forma = recortarForma({ x: 20, y: 30, w: 160, h: 70 }, { x: 0, y: 50, w: 300, h: 200 }, bolha)
    expect(forma.rect).toEqual({ x: 20, y: 50, w: 160, h: 50 })
    expect(borderRadiusDoFoco(forma.raios)).toBe('0px 0px 12px 12px / 0px 0px 12px 12px')
  })
})


describe('holofote dentro de uma composição redimensionada', () => {
  it.each([1, 0.82, 0.92, 0.79, 0.82 * 0.92])('alinha abertura e véu na escala %s', (escala) => {
    const plano = planoDoFoco(800 * escala, 500 * escala, 800, 500)
    // The target is 200px into the app; measurement includes the ancestor scale.
    const alvoMedido = { x: 200 * escala, y: 100 * escala, w: 120 * escala, h: 60 * escala }
    expect(alvoMedido.x * plano.inversaX * escala).toBeCloseTo(alvoMedido.x)
    expect(alvoMedido.y * plano.inversaY * escala).toBeCloseTo(alvoMedido.y)
    expect(alvoMedido.w * plano.inversaX * escala).toBeCloseTo(alvoMedido.w)
    expect(alvoMedido.h * plano.inversaY * escala).toBeCloseTo(alvoMedido.h)
    expect(plano.w * plano.inversaX * escala).toBeCloseTo(800 * escala)
    expect(plano.h * plano.inversaY * escala).toBeCloseTo(500 * escala)
  })
})
