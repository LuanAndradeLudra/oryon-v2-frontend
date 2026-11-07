// Retomadas (06/11): sair de Conversas não pode matar o tempo real do resto do app. A limpeza do
// useSocket tira só os próprios ouvintes e não derruba a conexão única (o sino global, o menu e
// o "follow-ups:mudou" continuam ouvindo).
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// vi.mock sobe para o topo do arquivo: o socket falso nasce em vi.hoisted.
const { ouvintes, socket, disconnectSocket } = vi.hoisted(() => {
  const ouvintes = new Map<string, Set<(...a: unknown[]) => void>>()
  const socket = {
    connected: true,
    on: vi.fn((ev: string, fn: (...a: unknown[]) => void) => { (ouvintes.get(ev) ?? ouvintes.set(ev, new Set()).get(ev)!).add(fn); return socket }),
    off: vi.fn((ev: string, fn?: (...a: unknown[]) => void) => { if (fn) ouvintes.get(ev)?.delete(fn); else ouvintes.delete(ev); return socket }),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  return { ouvintes, socket, disconnectSocket: vi.fn() }
})
vi.mock('@/services/socket', () => ({ connectSocket: () => socket, disconnectSocket }))
vi.mock('@/services/api', () => ({ renovarSessao: vi.fn(), clearSessionAndRedirect: vi.fn() }))

import { useSocket } from './useSocket'

describe('useSocket: a limpeza', () => {
  it('tira só os próprios ouvintes e mantém a conexão de pé', () => {
    const doSino = vi.fn()
    socket.on('notification:new', doSino) // o ouvinte global (OuvinteDoTempoReal)
    const { unmount } = renderHook(() => useSocket({ onNotificationNew: vi.fn() }))
    expect(ouvintes.get('notification:new')?.size).toBe(2)
    unmount()
    expect(ouvintes.get('notification:new')?.size).toBe(1)
    expect(ouvintes.get('notification:new')?.has(doSino)).toBe(true)
    expect(socket.off.mock.calls.every((c) => typeof c[1] === 'function')).toBe(true)
    expect(socket.disconnect).not.toHaveBeenCalled()
    expect(disconnectSocket).not.toHaveBeenCalled()
    // Os ouvintes do próprio hook saíram todos.
    expect([...ouvintes.entries()].filter(([ev]) => ev !== 'notification:new').every(([, fns]) => fns.size === 0)).toBe(true)
  })
})
