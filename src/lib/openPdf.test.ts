import { describe, it, expect, vi, afterEach } from 'vitest'
import { openPdfInNewTab } from './openPdf'

afterEach(() => { vi.restoreAllMocks() })

describe('openPdfInNewTab (SCRUM-1209)', () => {
  it('abre a aba antes do fetch e navega para o PDF', async () => {
    const win = { closed: false, opener: {}, location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(win as unknown as Window)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf')
    let openedBeforeFetch = false
    await openPdfInNewTab(async () => { openedBeforeFetch = open.mock.calls.length === 1; return new Blob(['x']) })
    expect(openedBeforeFetch).toBe(true)
    expect(win.location.href).toBe('blob:pdf')
    expect(win.opener).toBeNull()
  })

  it('erro: fecha a aba vazia e rejeita com a mensagem do backend', async () => {
    const win = { closed: false, opener: {}, location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(win as unknown as Window)
    const err = { response: { status: 404, data: new Blob([JSON.stringify({ message: 'Fatura não encontrada' })]) } }
    await expect(openPdfInNewTab(async () => { throw err })).rejects.toThrow('Fatura não encontrada')
    expect(win.close).toHaveBeenCalled()
  })

  it('pop-up bloqueado: baixa via <a download>', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await openPdfInNewTab(async () => new Blob(['x']), 'f.pdf')
    expect(click).toHaveBeenCalled()
  })
})
