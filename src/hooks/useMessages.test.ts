// Preview estilo WhatsApp — miniatura de PDF chega depois da mensagem (fila
// assíncrona no backend, evento `message:media-ready`). Cobre só
// `updateMediaThumbnail`: o resto do hook já é exercitado end-to-end pelos
// testes de MessageBubble/MessageList.
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMessages } from './useMessages'
import type { Message } from '@/types'

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
