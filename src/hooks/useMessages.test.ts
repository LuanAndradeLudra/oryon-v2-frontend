// Preview estilo WhatsApp — miniatura de PDF chega depois da mensagem (fila
// assíncrona no backend, evento `message:media-ready`). Cobre só
// `updateMediaThumbnail`: o resto do hook já é exercitado end-to-end pelos
// testes de MessageBubble/MessageList.
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMessages } from './useMessages'
import type { Message } from '@/types'

const mockSend = vi.fn()

vi.mock('@/services/api', () => ({
  messagesApi: {
    list: vi.fn(() =>
      Promise.resolve({
        data: {
          data: [
            {
              id: 'm1',
              conversationId: 'c1',
              direction: 'inbound',
              type: 'document',
              status: 'delivered',
              sentAt: '2026-01-01T00:00:00Z',
              createdAt: '2026-01-01T00:00:00Z',
              mediaCaption: 'contrato.pdf',
            } satisfies Partial<Message>,
          ],
        },
      })
    ),
    send: (...args: unknown[]) => mockSend(...args),
  },
}))

describe('useMessages — updateMediaThumbnail', () => {
  it('encaixa mediaThumbnailUrl na mensagem certa quando o evento chega', async () => {
    const { result } = renderHook(() => useMessages('c1'))

    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    expect(result.current.messages[0].mediaThumbnailUrl).toBeUndefined()

    act(() => {
      result.current.updateMediaThumbnail({
        messageId: 'm1',
        conversationId: 'c1',
        mediaThumbnailUrl: '/uploads/tenant-1/thumb.png',
      })
    })

    expect(result.current.messages[0].mediaThumbnailUrl).toBe('/uploads/tenant-1/thumb.png')
  })

  it('ignora evento pra um messageId que não está na janela carregada', async () => {
    const { result } = renderHook(() => useMessages('c1'))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.updateMediaThumbnail({
        messageId: 'outro-id',
        conversationId: 'c1',
        mediaThumbnailUrl: '/uploads/tenant-1/thumb.png',
      })
    })

    expect(result.current.messages[0].mediaThumbnailUrl).toBeUndefined()
  })
})

// Miniatura renderizada no navegador (pedido do usuário 2026-09-23): a bolha
// otimista precisa mostrar essa miniatura na hora, e MANTER ela quando a
// mensagem real do servidor chega — a real (via pdftoppm, fila assíncrona)
// ainda não existe nesse momento. Sem isso, a miniatura piscaria/sumiria
// bem na hora em que o status vira "enviado".
describe('useMessages — clientThumbnailUrl (miniatura de PDF no navegador)', () => {
  const pdfFile = new File(['fake'], 'contrato.pdf', { type: 'application/pdf' })

  it('bolha otimista nasce com a miniatura do navegador', async () => {
    mockSend.mockReturnValue(new Promise(() => {})) // nunca resolve — só olhamos o estado otimista
    const { result } = renderHook(() => useMessages('c1'))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      void result.current.sendMessage({ file: pdfFile, clientThumbnailUrl: 'data:image/png;base64,XYZ' })
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    const optimistic = result.current.messages[1]
    expect(optimistic.status).toBe('sending')
    expect(optimistic.mediaThumbnailUrl).toBe('data:image/png;base64,XYZ')
  })

  it('ao trocar pela mensagem real (sem mediaThumbnailUrl ainda), preserva a do navegador', async () => {
    mockSend.mockResolvedValue({
      data: {
        id: 'real-id',
        conversationId: 'c1',
        direction: 'outbound',
        type: 'document',
        status: 'sent',
        sentAt: '2026-01-01T00:01:00Z',
        createdAt: '2026-01-01T00:01:00Z',
        mediaCaption: 'contrato.pdf',
        // mediaThumbnailUrl ausente de propósito — a fila do backend ainda
        // não terminou nesse ponto.
      } satisfies Partial<Message>,
    })
    const { result } = renderHook(() => useMessages('c1'))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    await act(async () => {
      await result.current.sendMessage({ file: pdfFile, clientThumbnailUrl: 'data:image/png;base64,XYZ' })
    })

    const real = result.current.messages.find((m) => m.id === 'real-id')
    expect(real?.mediaThumbnailUrl).toBe('data:image/png;base64,XYZ')
  })

  it('se a mensagem real já vier com mediaThumbnailUrl (raro, mas possível), a do servidor vence', async () => {
    mockSend.mockResolvedValue({
      data: {
        id: 'real-id-2',
        conversationId: 'c1',
        direction: 'outbound',
        type: 'document',
        status: 'sent',
        sentAt: '2026-01-01T00:02:00Z',
        createdAt: '2026-01-01T00:02:00Z',
        mediaCaption: 'contrato.pdf',
        mediaThumbnailUrl: '/uploads/tenant-1/real-thumb.png',
      } satisfies Partial<Message>,
    })
    const { result } = renderHook(() => useMessages('c1'))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    await act(async () => {
      await result.current.sendMessage({ file: pdfFile, clientThumbnailUrl: 'data:image/png;base64,XYZ' })
    })

    const real = result.current.messages.find((m) => m.id === 'real-id-2')
    expect(real?.mediaThumbnailUrl).toBe('/uploads/tenant-1/real-thumb.png')
  })
})
