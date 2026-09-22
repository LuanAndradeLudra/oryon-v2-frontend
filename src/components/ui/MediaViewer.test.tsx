// Visualizador in-app estilo WhatsApp (pedido do usuário 2026-09-22, sem card
// de Jira) — substitui `window.open` em nova guia por um overlay de tela
// cheia. Cobre os 3 caminhos de PDF (o ponto de decisão real da feature):
// iframe no navegador, fallback de download dentro do app nativo (Capacitor
// não renderiza PDF embutido) e fallback pra DOC/XLS/PPT em qualquer
// plataforma (nenhum navegador sabe renderizar isso nativamente).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('MediaViewer', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false)
  })

  it('imagem: renderiza <img>', () => {
    const { container } = renderViewer({ ...base, type: 'image' })
    fireEvent.click(screen.getByText('abrir'))
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('figurinha: também renderiza <img> (tratada como imagem)', () => {
    const { container } = renderViewer({ ...base, type: 'sticker' })
    fireEvent.click(screen.getByText('abrir'))
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('vídeo: renderiza <video>', () => {
    const { container } = renderViewer({ ...base, type: 'video' })
    fireEvent.click(screen.getByText('abrir'))
    expect(container.querySelector('video')).not.toBeNull()
  })

  it('PDF fora do app nativo: renderiza <iframe> (visualizador do navegador)', () => {
    mockIsNativePlatform.mockReturnValue(false)
    const { container } = renderViewer({ ...base, type: 'document', mediaMimeType: 'application/pdf', mediaCaption: 'contrato.pdf' })
    fireEvent.click(screen.getByText('abrir'))
    expect(container.querySelector('iframe')).not.toBeNull()
  })

  it('PDF dentro do app nativo (Capacitor): sem iframe — cai no botão de baixar', () => {
    mockIsNativePlatform.mockReturnValue(true)
    const { container } = renderViewer({ ...base, type: 'document', mediaMimeType: 'application/pdf', mediaCaption: 'contrato.pdf' })
    fireEvent.click(screen.getByText('abrir'))
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByText(/Baixar contrato\.pdf/)).toBeInTheDocument()
  })

  it('DOC/XLS/PPT: sem preview em nenhuma plataforma — sempre botão de baixar', () => {
    mockIsNativePlatform.mockReturnValue(false)
    const { container } = renderViewer({
      ...base,
      type: 'document',
      mediaMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      mediaCaption: 'relatorio.docx',
    })
    fireEvent.click(screen.getByText('abrir'))
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByText(/Baixar relatorio\.docx/)).toBeInTheDocument()
  })

  it('botão fechar remove o overlay', () => {
    renderViewer({ ...base, type: 'image' })
    fireEvent.click(screen.getByText('abrir'))
    expect(screen.getByLabelText('Fechar')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Fechar'))
    expect(screen.queryByLabelText('Fechar')).toBeNull()
  })

  it('Esc fecha o overlay', () => {
    renderViewer({ ...base, type: 'image' })
    fireEvent.click(screen.getByText('abrir'))
    expect(screen.getByLabelText('Fechar')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByLabelText('Fechar')).toBeNull()
  })
})
