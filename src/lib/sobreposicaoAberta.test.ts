import { describe, it, expect, afterEach } from 'vitest'
import { haSobreposicaoAberta } from './sobreposicaoAberta'

afterEach(() => { document.body.innerHTML = '' })

describe('haSobreposicaoAberta', () => {
  it('sem diálogo: falso; com modal (aria-modal) ou menu aberto: verdadeiro', () => {
    expect(haSobreposicaoAberta()).toBe(false)
    document.body.innerHTML = '<div role="alertdialog" aria-modal="true"><button>Cancelar</button></div>'
    expect(haSobreposicaoAberta()).toBe(true)
    document.body.innerHTML = '<ul role="menu"></ul>'
    expect(haSobreposicaoAberta()).toBe(true)
  })
})
