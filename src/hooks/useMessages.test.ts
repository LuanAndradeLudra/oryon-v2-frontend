// Preview estilo WhatsApp — miniatura de PDF chega depois da mensagem (fila
// assíncrona no backend, evento `message:media-ready`). Cobre só
// `updateMediaThumbnail`: o resto do hook já é exercitado end-to-end pelos
// testes de MessageBubble/MessageList.
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMessages } from './useMessages'
import { criarFilaDeEnvio } from '@/lib/filaDeEnvio'
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
    const fila = criarFilaDeEnvio((c, d) => mockSend(c, d))
    const { result } = renderHook(() => useMessages('c1', fila))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.sendMessage({ file: pdfFile, clientThumbnailUrl: 'data:image/png;base64,XYZ' })
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
    const fila = criarFilaDeEnvio((c, d) => mockSend(c, d))
    const { result } = renderHook(() => useMessages('c1', fila))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.sendMessage({ file: pdfFile, clientThumbnailUrl: 'data:image/png;base64,XYZ' })
    })
    await waitFor(() => expect(result.current.messages.some((m) => m.id.startsWith('pending-'))).toBe(false))

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
    const fila = criarFilaDeEnvio((c, d) => mockSend(c, d))
    const { result } = renderHook(() => useMessages('c1', fila))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.sendMessage({ file: pdfFile, clientThumbnailUrl: 'data:image/png;base64,XYZ' })
    })
    await waitFor(() => expect(result.current.messages.some((m) => m.id.startsWith('pending-'))).toBe(false))

    const real = result.current.messages.find((m) => m.id === 'real-id-2')
    expect(real?.mediaThumbnailUrl).toBe('/uploads/tenant-1/real-thumb.png')
  })
})

// SCRUM-1161 (PO 15/10): a bolha confirmada fica no MESMO lugar — antes ia
// para o fim e o documento "pulava" para baixo do texto enviado depois.
describe('useMessages — fila de envio', () => {
  type P = { resolve: (m: Partial<Message>) => void }
  function filaControlada() {
    const envios: P[] = []
    const fila = criarFilaDeEnvio(() => new Promise((res) => { envios.push({ resolve: (m) => res({ data: m as Message }) }) }))
    return { fila, envios }
  }
  const real = (id: string, type: Message['type'], body?: string): Partial<Message> => ({
    id, conversationId: 'c1', direction: 'outbound', type, body, status: 'sent', senderKind: 'operator',
    sentAt: '2026-01-01T00:05:00Z', createdAt: '2026-01-01T00:05:00Z',
  })

  it('documento + texto: confirmar o documento não o move para depois do texto', async () => {
    const { fila, envios } = filaControlada()
    const { result } = renderHook(() => useMessages('c1', fila))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.sendMessage({ file: new File(['x'], 'exame.pdf', { type: 'application/pdf' }), body: 'Segue' })
      result.current.sendMessage({ body: 'Dúvidas?' })
    })
    await waitFor(() => expect(envios).toHaveLength(1))
    await act(async () => { envios[0].resolve(real('doc-real', 'document', 'Segue')) })
    await waitFor(() => expect(envios).toHaveLength(2))

    const ordem = result.current.messages.map((m) => (m.id.startsWith('pending-') ? `temp:${m.body}` : m.id))
    expect(ordem).toEqual(['m1', 'doc-real', 'temp:Dúvidas?'])
  })

  it('eco do socket chega antes da resposta do POST: entra no lugar da temporária', async () => {
    const { fila, envios } = filaControlada()
    const { result } = renderHook(() => useMessages('c1', fila))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.sendMessage({ body: 'primeira' })
      result.current.sendMessage({ body: 'segunda' })
    })
    await waitFor(() => expect(envios).toHaveLength(1))
    act(() => { result.current.addIncomingMessage(real('eco-1', 'text', 'primeira') as Message) })
    expect(result.current.messages.map((m) => (m.id.startsWith('pending-') ? `temp:${m.body}` : m.id)))
      .toEqual(['m1', 'eco-1', 'temp:segunda'])

    await act(async () => { envios[0].resolve(real('eco-1', 'text', 'primeira')) })
    expect(result.current.messages.filter((m) => m.id === 'eco-1')).toHaveLength(1)
  })

  it('volta à conversa com mensagem ainda na fila: a bolha pendente reaparece', async () => {
    const { fila } = filaControlada()
    const { result, rerender } = renderHook(({ id }) => useMessages(id, fila), { initialProps: { id: 'c1' } })
    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    act(() => { result.current.sendMessage({ body: 'em envio' }) })
    rerender({ id: 'c2' })
    rerender({ id: 'c1' })
    await waitFor(() => expect(result.current.messages.map((m) => m.body)).toContain('em envio'))
  })

  it('outro atendente manda o mesmo texto ao mesmo tempo: o eco dele não ocupa a bolha desta aba', async () => {
    const { fila, envios } = filaControlada()
    const { result } = renderHook(() => useMessages('c1', fila, 'eu'))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    act(() => { result.current.sendMessage({ body: 'ok' }) })
    await waitFor(() => expect(envios).toHaveLength(1))
    act(() => { result.current.addIncomingMessage({ ...real('eco-outro', 'text', 'ok'), sentByUserId: 'outro' } as Message) })
    expect(result.current.messages.some((m) => m.id.startsWith('pending-'))).toBe(true)
    expect(result.current.messages.map((m) => m.id)).toContain('eco-outro')
  })
})

// Revisão 15/10: a 1ª página que chega DEPOIS de uma confirmação de envio (ou
// de uma mensagem do socket) não pode apagar o que já está na tela.
describe('useMessages — 1ª página atrasada', () => {
  it('mensagem confirmada e mensagem do socket durante a carga continuam na tela', async () => {
    const { messagesApi } = await import('@/services/api')
    let soltarPagina: (v: unknown) => void = () => {}
    vi.mocked(messagesApi.list).mockImplementationOnce(() => new Promise((r) => { soltarPagina = r }) as never)
    const envios: Array<(m: Partial<Message>) => void> = []
    const fila = criarFilaDeEnvio(() => new Promise((res) => { envios.push((m) => res({ data: m as Message })) }))
    const { result } = renderHook(() => useMessages('c1', fila))

    act(() => { result.current.sendMessage({ body: 'rápida' }) })
    await waitFor(() => expect(envios).toHaveLength(1))
    await act(async () => { envios[0]({ id: 'real-rapida', conversationId: 'c1', direction: 'outbound', type: 'text', body: 'rápida', status: 'sent', sentAt: '2026-01-01T00:09:00Z', createdAt: '2026-01-01T00:09:00Z' }) })
    act(() => { result.current.addIncomingMessage({ id: 'do-cliente', conversationId: 'c1', direction: 'inbound', type: 'text', body: 'oi', status: 'delivered', sentAt: '2026-01-01T00:09:30Z', createdAt: '2026-01-01T00:09:30Z' }) })
    await act(async () => { soltarPagina({ data: { data: [{ id: 'm1', conversationId: 'c1', direction: 'inbound', type: 'text', status: 'delivered', sentAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' }] } }) })

    expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'real-rapida', 'do-cliente'])
  })
})

