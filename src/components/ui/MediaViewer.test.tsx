// Visualizador in-app estilo WhatsApp (pedido do usuário 2026-09-22, sem card
// de Jira) — substitui `window.open` em nova guia por um overlay de tela
// cheia. Cobre os 3 caminhos de PDF (o ponto de decisão real da feature):
// iframe no navegador, fallback de download dentro do app nativo (Capacitor
// não renderiza PDF embutido) e fallback pra DOC/XLS/PPT em qualquer
// plataforma (nenhum navegador sabe renderizar isso nativamente).
//
// 2026-09-23: este arquivo NUNCA tinha rodado — o worker do Vitest morria
// (loop infinito de efeitos no useLayer dentro do LayerProvider, corrigido no
// mesmo PR; ver LayerContext.test.tsx). Ao rodar pela primeira vez, dois erros
// dos próprios testes apareceram: o overlay vai por createPortal pro
// document.body (não pro `container` do RTL), e o AnimatePresence mantém o
// elemento montado durante a animação de saída (fechar exige waitFor).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LayerProvider } from '@/contexts/LayerContext'
import { MediaViewerProvider, useMediaViewer } from './MediaViewer'
import type { Message } from '@/types'

vi.mock('@/services/api', () => ({
  getUploadsAuthToken: vi.fn(() => Promise.resolve('fake-token')),
}))

const mockIsNativePlatform = vi.hoisted(() => vi.fn(() => false))
vi.mock('@/config/env', () => ({ isNativePlatform: mockIsNativePlatform }))

const base: Message = {
  id: 'm1',
  conversationId: 'c1',
  direction: 'inbound',
  type: 'image',
  status: 'delivered',
  sentAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  mediaUrl: '/uploads/tenant-1/file',
}

/** Consumidor mínimo — o botão dispara `open(message)` do contexto, como um
 *  clique real em MessageBubble faria. */
function OpenButton({ message }: { message: Message }) {
  const { open } = useMediaViewer()
  return <button onClick={() => open(message)}>abrir</button>
}

function renderViewer(message: Message) {
  return render(
    <LayerProvider>
      <MediaViewerProvider>
        <OpenButton message={message} />
      </MediaViewerProvider>
    </LayerProvider>,
  )
}

function openViewer(message: Message) {
  renderViewer(message)
  fireEvent.click(screen.getByText('abrir'))
}

// O overlay é um portal em document.body — fora do `container` do RTL.
const q = (selector: string) => document.body.querySelector(selector)

describe('MediaViewer', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false)
  })

  it('imagem: renderiza <img>', () => {
    openViewer({ ...base, type: 'image' })
    expect(q('img')).not.toBeNull()
  })

  it('figurinha: também renderiza <img> (tratada como imagem)', () => {
    openViewer({ ...base, type: 'sticker' })
    expect(q('img')).not.toBeNull()
  })

  it('vídeo: renderiza <video>', () => {
    openViewer({ ...base, type: 'video' })
    expect(q('video')).not.toBeNull()
  })

  it('PDF fora do app nativo: renderiza <iframe> (visualizador do navegador)', () => {
    mockIsNativePlatform.mockReturnValue(false)
    openViewer({ ...base, type: 'document', mediaMimeType: 'application/pdf', mediaCaption: 'contrato.pdf' })
    expect(q('iframe')).not.toBeNull()
  })

  it('PDF dentro do app nativo (Capacitor): sem iframe — cai no botão de baixar', () => {
    mockIsNativePlatform.mockReturnValue(true)
    openViewer({ ...base, type: 'document', mediaMimeType: 'application/pdf', mediaCaption: 'contrato.pdf' })
    expect(q('iframe')).toBeNull()
    expect(screen.getByText(/Baixar contrato\.pdf/)).toBeInTheDocument()
  })

  it('DOC/XLS/PPT: sem preview em nenhuma plataforma — sempre botão de baixar', () => {
    mockIsNativePlatform.mockReturnValue(false)
    openViewer({
      ...base,
      type: 'document',
      mediaMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      mediaCaption: 'relatorio.docx',
    })
    expect(q('iframe')).toBeNull()
    expect(screen.getByText(/Baixar relatorio\.docx/)).toBeInTheDocument()
  })

  it('botão fechar remove o overlay', async () => {
    openViewer({ ...base, type: 'image' })
    expect(screen.getByLabelText('Fechar')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Fechar'))
    await waitFor(() => expect(screen.queryByLabelText('Fechar')).toBeNull())
  })

  it('Esc fecha o overlay', async () => {
    openViewer({ ...base, type: 'image' })
    expect(screen.getByLabelText('Fechar')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByLabelText('Fechar')).toBeNull())
  })
})

// Zoom de imagem (pedido do usuário 2026-09-23: o visualizador não tinha como
// ampliar/reduzir PNG/JPEG). A lógica fina (limites, pan, pinça, teclado) está
// em useImageZoom.test.ts; aqui, só a integração: os controles aparecem onde
// devem, e agem na <img> de verdade.
describe('MediaViewer — zoom de imagem', () => {
  const transformOf = () => (q('img') as HTMLImageElement).style.transform
  const percent = () => screen.getByLabelText('Restaurar zoom').textContent

  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false)
  })

  it('imagem abre em 100% e mostra os controles de zoom', () => {
    openViewer(base)
    expect(screen.getByRole('group', { name: 'Zoom' })).toBeInTheDocument()
    expect(percent()).toBe('100%')
    expect(transformOf()).toContain('scale(1)')
  })

  it('figurinha também tem zoom', () => {
    openViewer({ ...base, type: 'sticker' })
    expect(screen.getByRole('group', { name: 'Zoom' })).toBeInTheDocument()
  })

  it.each([
    ['vídeo', { type: 'video' as const }],
    ['PDF', { type: 'document' as const, mediaMimeType: 'application/pdf', mediaCaption: 'a.pdf' }],
  ])('%s: sem controles de zoom (PDF já tem o do navegador; vídeo não faz sentido)', (_name, extra) => {
    openViewer({ ...base, ...extra })
    expect(screen.queryByRole('group', { name: 'Zoom' })).toBeNull()
  })

  it('Aumentar/Diminuir mudam o zoom da <img> em passos de 25%', () => {
    openViewer(base)
    fireEvent.click(screen.getByLabelText('Aumentar zoom'))
    expect(percent()).toBe('125%')
    expect(transformOf()).toContain('scale(1.25)')
    fireEvent.click(screen.getByLabelText('Diminuir zoom'))
    fireEvent.click(screen.getByLabelText('Diminuir zoom'))
    expect(percent()).toBe('75%')
    expect(transformOf()).toContain('scale(0.75)')
  })

  it('clicar num botão da barra NÃO fecha o visualizador (o clique não pode borbulhar até o overlay)', async () => {
    openViewer(base)
    fireEvent.click(screen.getByLabelText('Aumentar zoom'))
    // O fechamento é assíncrono (animação de saída): espera mais que ela e
    // confirma que o botão de fechar continua lá.
    await expect(
      waitFor(() => expect(screen.queryByLabelText('Fechar')).toBeNull(), { timeout: 500 }),
    ).rejects.toThrow()
    expect(screen.getByLabelText('Fechar')).toBeInTheDocument()
  })

  it('o botão de % restaura 100%', () => {
    openViewer(base)
    fireEvent.click(screen.getByLabelText('Aumentar zoom'))
    fireEvent.click(screen.getByLabelText('Aumentar zoom'))
    fireEvent.click(screen.getByLabelText('Restaurar zoom'))
    expect(percent()).toBe('100%')
  })

  it('limites: trava em 400% (aumentar desabilita) e em 50% (diminuir desabilita)', () => {
    openViewer(base)
    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByLabelText('Aumentar zoom'))
    expect(percent()).toBe('400%')
    expect(screen.getByLabelText('Aumentar zoom')).toBeDisabled()

    fireEvent.click(screen.getByLabelText('Restaurar zoom'))
    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByLabelText('Diminuir zoom'))
    expect(percent()).toBe('50%')
    expect(screen.getByLabelText('Diminuir zoom')).toBeDisabled()
  })

  it('duplo clique na imagem alterna entre 100% e 200%', () => {
    openViewer(base)
    fireEvent.doubleClick(q('img') as HTMLImageElement)
    expect(percent()).toBe('200%')
    fireEvent.doubleClick(q('img') as HTMLImageElement)
    expect(percent()).toBe('100%')
  })

  it('roda do mouse amplia (pra cima) e reduz (pra baixo), e não deixa a página dar zoom junto', () => {
    openViewer(base)
    const container = (q('img') as HTMLImageElement).parentElement as HTMLElement

    // fireEvent devolve false quando algum listener chamou preventDefault.
    const notPrevented = fireEvent.wheel(container, { deltaY: -100 })
    expect(percent()).toBe('120%')
    expect(notPrevented).toBe(false)

    fireEvent.wheel(container, { deltaY: 100 })
    expect(percent()).toBe('100%')
  })

  it('teclado: + amplia, - reduz, 0 restaura', () => {
    openViewer(base)
    fireEvent.keyDown(window, { key: '+' })
    expect(percent()).toBe('125%')
    fireEvent.keyDown(window, { key: '-' })
    fireEvent.keyDown(window, { key: '-' })
    expect(percent()).toBe('75%')
    fireEvent.keyDown(window, { key: '0' })
    expect(percent()).toBe('100%')
  })
})

// Layout (pedido do usuário 2026-09-23): os botões ficavam flutuando SOBRE o
// arquivo — numa imagem clara ampliada o branco-sobre-transparente sumia, e só
// fechar/reabrir trazia de volta. Agora: barra própria (fundo sólido) e o
// conteúdo numa área separada que corta o excedente do zoom. jsdom não faz
// layout, então o teste garante a ESTRUTURA que impede a sobreposição.
describe('MediaViewer — barra de controles separada do conteúdo', () => {
  const PDF = { type: 'document' as const, mediaMimeType: 'application/pdf', mediaCaption: 'contrato.pdf' }
  const content = () => q('[data-viewer-content]') as HTMLElement

  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false)
  })

  it('imagem: zoom, baixar e fechar ficam na barra; a <img> fica só na área de conteúdo', () => {
    openViewer(base)
    const bar = screen.getByRole('banner')
    expect(bar).toContainElement(screen.getByRole('group', { name: 'Zoom' }))
    expect(bar).toContainElement(screen.getByLabelText('Baixar'))
    expect(bar).toContainElement(screen.getByLabelText('Fechar'))
    expect(bar.querySelector('img')).toBeNull()
    expect(content()).toContainElement(q('img') as HTMLElement)
  })

  it('PDF: baixar e fechar na barra; o iframe fica só na área de conteúdo (nunca por baixo da barra)', () => {
    openViewer({ ...base, ...PDF })
    const bar = screen.getByRole('banner')
    expect(bar).toContainElement(screen.getByLabelText('Baixar'))
    expect(bar).toContainElement(screen.getByLabelText('Fechar'))
    expect(bar.querySelector('iframe')).toBeNull()
    expect(content()).toContainElement(q('iframe') as HTMLElement)
  })

  it('a área de conteúdo corta o excedente (overflow-hidden) — o zoom não alcança a barra', () => {
    openViewer(base)
    expect(content().className).toContain('overflow-hidden')
    // A barra é irmã da área de conteúdo, não ancestral nem descendente dela.
    const bar = screen.getByRole('banner')
    expect(bar.contains(content())).toBe(false)
    expect(content().contains(bar)).toBe(false)
  })

  it('a barra mostra o nome do arquivo (ou um rótulo do tipo)', () => {
    openViewer({ ...base, ...PDF })
    expect(screen.getByRole('banner')).toHaveTextContent('contrato.pdf')
  })

  it('rótulo padrão quando não há nome: "Imagem"', () => {
    openViewer(base)
    expect(screen.getByRole('banner')).toHaveTextContent('Imagem')
  })

  it('clicar no vazio da barra NÃO fecha; clicar no vazio em volta do conteúdo fecha', async () => {
    openViewer(base)
    fireEvent.click(screen.getByRole('banner'))
    await expect(
      waitFor(() => expect(screen.queryByLabelText('Fechar')).toBeNull(), { timeout: 400 }),
    ).rejects.toThrow()

    fireEvent.click(content())
    await waitFor(() => expect(screen.queryByLabelText('Fechar')).toBeNull())
  })
})
