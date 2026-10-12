import { describe, it, expect } from 'vitest'
import { paginar, lerPagina } from './paginar'

const lista = Array.from({ length: 45 }, (_, i) => i + 1)

describe('paginar', () => {
  it('fatia e informa o intervalo', () => {
    expect(paginar(lista, 2, 20)).toMatchObject({ itens: lista.slice(20, 40), pagina: 2, paginas: 3, de: 21, ate: 40, total: 45 })
    expect(paginar(lista, 3, 20)).toMatchObject({ de: 41, ate: 45 })
  })
  it('prende a página ao intervalo quando a lista encolhe', () => {
    expect(paginar(lista.slice(0, 5), 3, 20)).toMatchObject({ pagina: 1, itens: lista.slice(0, 5) })
    expect(paginar([], 2, 20)).toMatchObject({ pagina: 1, paginas: 1, de: 0, ate: 0 })
  })
  it('lê a página da URL', () => {
    expect(lerPagina(null)).toBe(1)
    expect(lerPagina('3')).toBe(3)
    expect(lerPagina('0')).toBe(1)
    expect(lerPagina('x')).toBe(1)
  })
})
