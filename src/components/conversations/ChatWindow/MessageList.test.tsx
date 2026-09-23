// SCRUM-1158 — clicar na citação de uma mensagem rola até a mensagem original
// (já carregada na janela) e a destaca por um instante, igual ao WhatsApp.
// Mensagens são só `type: 'text'` de propósito: MediaContent/useAuthenticated-
// MediaSrc tratam `mediaUrl` undefined como no-op, então MessageBubble inteiro
// (não só TextContent) pode ser exercitado sem mocks pesados — só precisa do
// ContextMenuProvider (useContextMenu lança sem ele).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MessageList } from './MessageList'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import type { Message } from '@/types'

const base: Message = {
  id: 'm1',
  conversationId: 'c1',
  direction: 'inbound',
  type: 'text',
  status: 'delivered',
  sentAt: '2026-01-01T10:00:00Z',
  createdAt: '2026-01-01T10:00:00Z',
}

const original: Message = { ...base, id: 'original-id', wamid: 'wamid-original', body: 'Confirmado para quinta às 14h' }
const reply: Message = {
  ...base,
  id: 'reply-id',
  direction: 'outbound',
  body: 'Perfeito, obrigado!',
  contextWamid: 'wamid-original',
  sentAt: '2026-01-01T10:01:00Z',
  createdAt: '2026-01-01T10:01:00Z',
}

function renderList(messages: Message[]) {
  return render(
    <ContextMenuProvider>
      <MessageList messages={messages} loading={false} hasMore={false} onLoadMore={() => {}} />
    </ContextMenuProvider>,
  )
}

describe('MessageList — pular para a mensagem citada (SCRUM-1158)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn<Element['scrollIntoView']>>

  beforeEach(() => {
    // jsdom não implementa scrollIntoView.
    scrollIntoViewMock = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoViewMock
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clicar na citação rola até a bolha original e a destaca por ~1,2s', () => {
    renderList([original, reply])

    const quoteBar = screen.getByRole('button', { name: /Confirmado para quinta às 14h/i })
    act(() => fireEvent.click(quoteBar))

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })

    const originalRow = document.querySelector('[data-message-id="original-id"]')
    expect(originalRow?.querySelector('.animate-msg-highlight')).not.toBeNull()

    // Passa do tempo do flash: o destaque some.
    act(() => vi.advanceTimersByTime(1300))
    expect(originalRow?.querySelector('.animate-msg-highlight')).toBeNull()
  })

  it('mensagem original fora da janela carregada: sem citação clicável, sem crash', () => {
    // Só a resposta está carregada — a original (wamid-original) não está no array.
    renderList([reply])
    expect(screen.queryByRole('button', { name: /Confirmado/i })).toBeNull()
    expect(scrollIntoViewMock).not.toHaveBeenCalled()
  })
})
