// ─── Ponte socket → janela do sinal de saldo (SCRUM-805) ────────────────────
//
// Este arquivo existe por causa de um buraco real: os testes de
// billingRevalidation disparam o CustomEvent na mão, então continuariam
// verdes se o `socket.on('billing:balance-updated')` fosse removido do
// useSocket. A revalidação funcionaria em teste e não em produção.
//
// Aqui a ponte é exercitada pela ponta de fora: o servidor emite, e o que se
// verifica é que a janela recebe.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

type Handler = (payload?: unknown) => void
const handlers = new Map<string, Handler>()

const fakeSocket = {
  on: (evento: string, fn: Handler) => { handlers.set(evento, fn) },
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
}

vi.mock('@/services/socket', () => ({
  connectSocket: () => fakeSocket,
  disconnectSocket: vi.fn(),
  getSocket: () => fakeSocket,
  joinConversation: vi.fn(),
  leaveConversation: vi.fn(),
  joinChannel: vi.fn(),
  leaveChannel: vi.fn(),
}))
vi.mock('@/services/api', () => ({
  attemptRefresh: vi.fn().mockResolvedValue(true),
  clearSessionAndRedirect: vi.fn(),
}))

import { useSocket } from '@/hooks/useSocket'

beforeEach(() => handlers.clear())

describe('billing:balance-updated', () => {
  it('o hook registra o evento no socket', () => {
    renderHook(() => useSocket())
    expect(handlers.has('billing:balance-updated')).toBe(true)
  })

  it('servidor emitindo vira CustomEvent na janela', () => {
    renderHook(() => useSocket())
    const recebido = vi.fn()
    window.addEventListener('billing:balance-updated', recebido)

    handlers.get('billing:balance-updated')?.({ at: '2026-08-26T12:00:00.000Z' })

    expect(recebido).toHaveBeenCalledTimes(1)
    window.removeEventListener('billing:balance-updated', recebido)
  })

  it('a ponte não repassa payload — o store não deve depender do conteúdo', () => {
    // O sinal é seco por decisão de seguranca (a sala e do tenant inteiro).
    // Se algum dia o servidor mandar saldo por engano, ele nao vaza daqui.
    renderHook(() => useSocket())
    let detalhe: unknown = 'nao-tocado'
    const captura = (e: Event) => { detalhe = (e as CustomEvent).detail }
    window.addEventListener('billing:balance-updated', captura)

    handlers.get('billing:balance-updated')?.({ remaining: 42 })

    expect(detalhe).toBeNull()
    window.removeEventListener('billing:balance-updated', captura)
  })
})
