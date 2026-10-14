// ─── Ponte socket → janela do sinal de saldo (SCRUM-805) ────────────────────
//
// Este arquivo existe por causa de um buraco real: os testes de
// billingRevalidation disparam o CustomEvent na mão, então continuariam
// verdes se o `socket.on('billing:balance-updated')` fosse removido da
// ponte. A revalidação funcionaria em teste e não em produção.
// SCRUM-1210: a ponte saiu do useSocket (só a tela de conversas o monta) para
// o useAppSocketBridge, montado no App enquanto houver sessão.
//
// Aqui a ponte é exercitada pela ponta de fora: o servidor emite, e o que se
// verifica é que a janela recebe.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

type Handler = (payload?: unknown) => void
const handlers = new Map<string, Handler>()
const disconnectSocket = vi.fn()

const fakeSocket = {
  on: (evento: string, fn: Handler) => { handlers.set(evento, fn) },
  off: vi.fn((evento: string, fn?: Handler) => { if (handlers.get(evento) === fn) handlers.delete(evento) }),
  emit: vi.fn(),
  connected: true,
}

vi.mock('@/services/socket', () => ({
  connectSocket: () => fakeSocket,
  disconnectSocket: () => disconnectSocket(),
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
import { useAppSocketBridge } from '@/hooks/useAppSocketBridge'

beforeEach(() => { handlers.clear(); disconnectSocket.mockClear(); fakeSocket.off.mockClear() })

describe('billing:balance-updated', () => {
  it('a ponte registra o evento no socket', () => {
    renderHook(() => useAppSocketBridge(true))
    expect(handlers.has('billing:balance-updated')).toBe(true)
  })

  it('sem sessão, a ponte não liga', () => {
    renderHook(() => useAppSocketBridge(false))
    expect(handlers.has('billing:balance-updated')).toBe(false)
  })

  it('servidor emitindo vira CustomEvent na janela', () => {
    renderHook(() => useAppSocketBridge(true))
    const recebido = vi.fn()
    window.addEventListener('billing:balance-updated', recebido)

    handlers.get('billing:balance-updated')?.({ at: '2026-08-26T12:00:00.000Z' })

    expect(recebido).toHaveBeenCalledTimes(1)
    window.removeEventListener('billing:balance-updated', recebido)
  })

  it('a ponte não repassa payload — o store não deve depender do conteúdo', () => {
    // O sinal é seco por decisão de seguranca (a sala e do tenant inteiro).
    // Se algum dia o servidor mandar saldo por engano, ele nao vaza daqui.
    renderHook(() => useAppSocketBridge(true))
    let detalhe: unknown = 'nao-tocado'
    const captura = (e: Event) => { detalhe = (e as CustomEvent).detail }
    window.addEventListener('billing:balance-updated', captura)

    handlers.get('billing:balance-updated')?.({ remaining: 42 })

    expect(detalhe).toBeNull()
    window.removeEventListener('billing:balance-updated', captura)
  })
})

describe('billing:account-state (SCRUM-1210)', () => {
  it('vira CustomEvent na janela (os portões revalidam)', () => {
    renderHook(() => useAppSocketBridge(true))
    const recebido = vi.fn()
    window.addEventListener('billing:account-state', recebido)
    handlers.get('billing:account-state')?.()
    expect(recebido).toHaveBeenCalledTimes(1)
    window.removeEventListener('billing:account-state', recebido)
  })
})

describe('socket compartilhado (SCRUM-1210)', () => {
  it('o useSocket não duplica a ponte de cobrança', () => {
    renderHook(() => useSocket())
    expect(handlers.has('billing:balance-updated')).toBe(false)
    expect(handlers.has('billing:account-state')).toBe(false)
  })

  it('desmontar tira só os próprios handlers e não desconecta o socket', () => {
    const bridge = renderHook(() => useAppSocketBridge(true))
    const conversas = renderHook(() => useSocket())
    conversas.unmount()
    bridge.unmount()
    expect(disconnectSocket).not.toHaveBeenCalled()
    expect(fakeSocket.off).toHaveBeenCalled()
    for (const call of fakeSocket.off.mock.calls) expect(typeof call[1]).toBe('function')
  })
})
