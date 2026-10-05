// Miniatura instantânea de PDF renderizada no navegador (pedido do usuário
// 2026-09-23) — pdfjs-dist mockado (canvas 2d de verdade não existe no
// jsdom; testamos a lógica de orquestração e a degradação graciosa).
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}))

import { getDocument } from 'pdfjs-dist'
import { renderPdfThumbnail } from './renderPdfThumbnail'

function makeFile(): File {
  return new File(['fake-pdf-bytes'], 'doc.pdf', { type: 'application/pdf' })
}

function mockPdfWith(page: unknown) {
  const pdf = { getPage: () => Promise.resolve(page) }
  vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve(pdf) } as never)
}

describe('renderPdfThumbnail', () => {
  beforeEach(() => {
    vi.mocked(getDocument).mockReset()
  })

  it('PDF corrompido / getDocument falha: devolve null sem lançar (não pode travar o anexo)', async () => {
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.reject(new Error('bad pdf')) } as never)
    await expect(renderPdfThumbnail(makeFile())).resolves.toBeNull()
  })

  it('canvas 2d indisponível (ambiente sem suporte): devolve null sem lançar', async () => {
    mockPdfWith({
      getViewport: () => ({ width: 400, height: 500 }),
      render: () => ({ promise: Promise.resolve() }),
    })
    // jsdom não implementa canvas 2d de verdade — getContext('2d') retorna
    // null por padrão, exatamente o caminho que este teste exercita.
    await expect(renderPdfThumbnail(makeFile())).resolves.toBeNull()
  })

  it('page.render rejeita: devolve null sem lançar', async () => {
    mockPdfWith({
      getViewport: () => ({ width: 400, height: 500 }),
      render: () => ({ promise: Promise.reject(new Error('render failed')) }),
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
    await expect(renderPdfThumbnail(makeFile())).resolves.toBeNull()
  })

  it('sucesso: devolve o data URL gerado pelo canvas', async () => {
    mockPdfWith({
      getViewport: () => ({ width: 400, height: 500 }),
      render: () => ({ promise: Promise.resolve() }),
    })
    const fakeDataUrl = 'data:image/png;base64,FAKE'
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(fakeDataUrl)

    await expect(renderPdfThumbnail(makeFile())).resolves.toBe(fakeDataUrl)
  })
})
