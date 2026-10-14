import { describe, it, expect, vi, afterEach } from 'vitest'
import { abrirJanelaCentralizada } from './janelaCentralizada'

afterEach(() => vi.restoreAllMocks())

describe('abrirJanelaCentralizada', () => {
  it('posiciona a janela no centro da janela do app (inclusive em outro monitor)', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    Object.assign(window, { screenX: 1920, screenY: 0, outerWidth: 1600, outerHeight: 900 })
    abrirJanelaCentralizada('https://meta.example/oauth', '_blank', 600, 700)
    expect(open).toHaveBeenCalledWith('https://meta.example/oauth', '_blank', 'width=600,height=700,left=2420,top=100')
  })
})
