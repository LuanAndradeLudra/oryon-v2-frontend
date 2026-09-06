import { describe, expect, it } from 'vitest'
import { funnelGeometry, funnelHeight } from './funnelGeometry'

/** Os quatro números do mockup (`p3-disparos.html` §D3). */
const MOCKUP = [520, 498, 340, 88]

function widths(values: number[]) {
  return funnelGeometry(values).map((b) => b.topWidth)
}

describe('funnelGeometry', () => {
  it('faz a largura proporcional ao volume, com a primeira faixa na largura máxima', () => {
    const bands = funnelGeometry(MOCKUP)

    expect(bands[0].topWidth).toBe(480)
    // 498/520 · 480, 340/520 · 480, 88/520 · 480
    expect(bands[1].topWidth).toBeCloseTo(459.69, 1)
    expect(bands[2].topWidth).toBeCloseTo(313.85, 1)
    expect(bands[3].topWidth).toBeCloseTo(81.23, 1)

    // A relação entre larguras tem de ser a relação entre valores — é essa a
    // afirmação visual que o funil faz. Precisão 4 e não mais: `topWidth` é
    // arredondado para 2 casas de propósito, para não escrever
    // `313.84615384615387` num atributo de SVG.
    expect(bands[2].topWidth / bands[0].topWidth).toBeCloseTo(340 / 520, 4)
  })

  it('empilha as faixas com altura e gap constantes', () => {
    const bands = funnelGeometry(MOCKUP)
    expect(bands.map((b) => b.y)).toEqual([10, 60, 110, 160])
    expect(funnelHeight(4)).toBe(202)
  })

  it('centraliza toda faixa no mesmo eixo', () => {
    for (const band of funnelGeometry(MOCKUP)) {
      const xs = band.points.split(' ').map((p) => Number(p.split(',')[0]))
      const centroTopo = (xs[0] + xs[1]) / 2
      const centroBase = (xs[2] + xs[3]) / 2
      expect(centroTopo).toBeCloseTo(280, 5)
      expect(centroBase).toBeCloseTo(280, 5)
    }
  })

  it('afunila para baixo — a base é sempre mais estreita que o topo', () => {
    for (const band of funnelGeometry(MOCKUP)) {
      const xs = band.points.split(' ').map((p) => Number(p.split(',')[0]))
      const larguraTopo = xs[1] - xs[0]
      const larguraBase = xs[2] - xs[3]
      expect(larguraBase).toBeLessThan(larguraTopo)
      expect(larguraBase).toBeGreaterThan(0)
    }
  })

  it('calcula o percentual sobre as enviadas, e não sobre a etapa anterior', () => {
    const bands = funnelGeometry(MOCKUP)
    // A primeira não afirma percentual: 100% de si mesma não informa nada.
    expect(bands[0].pct).toBeNull()
    expect(bands[1].pct).toBe(95.8)
    expect(bands[2].pct).toBe(65.4)
    expect(bands[3].pct).toBe(16.9)
  })

  it('não divide por zero quando nada foi enviado', () => {
    const bands = funnelGeometry([0, 0, 0, 0])

    for (const band of bands) {
      expect(Number.isFinite(band.topWidth)).toBe(true)
      expect(band.topWidth).toBe(8) // piso, para a faixa não sumir
      // Sem base não há percentual — "0 de 0" é ausência de dado, não 0%.
      expect(band.pct).toBeNull()
    }
  })

  it('não estoura o quadro quando uma etapa vem maior que a de cima', () => {
    // Não deveria acontecer, mas o backend agrega de fontes diferentes e um
    // webhook atrasado já produziu delivered > sent em produção.
    const bands = funnelGeometry([100, 130])
    expect(bands[1].topWidth).toBe(480)
    expect(bands[1].topWidth).toBeLessThanOrEqual(bands[0].topWidth)
  })

  it('trata valores inválidos como zero em vez de gerar NaN no SVG', () => {
    const bands = funnelGeometry([100, Number.NaN, -5, Number.POSITIVE_INFINITY])
    for (const band of bands) {
      expect(band.points).not.toContain('NaN')
      expect(band.points).not.toContain('Infinity')
    }
    expect(bands[1].topWidth).toBe(8)
    expect(bands[2].topWidth).toBe(8)
  })

  it('clampa o inset para a faixa estreita não virar um funil ao contrário', () => {
    const [band] = funnelGeometry([1], { minWidth: 8, inset: 12 })
    const xs = band.points.split(' ').map((p) => Number(p.split(',')[0]))
    expect(xs[2] - xs[3]).toBeGreaterThan(0)
  })

  it('tira o rótulo de dentro quando a faixa fica estreita demais', () => {
    const bands = funnelGeometry(MOCKUP)
    expect(bands.map((b) => b.labelInside)).toEqual([true, true, true, false])
  })

  it('aceita lista vazia', () => {
    expect(funnelGeometry([])).toEqual([])
    expect(widths([])).toEqual([])
  })
})
