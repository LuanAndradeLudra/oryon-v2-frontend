import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

let naoLidas = 3
const get = vi.fn(async () => ({ data: { data: [{ id: 'n1', isRead: false }], unreadCount: naoLidas, nextCursor: null } }))
const post = vi.fn(async () => { naoLidas = 2; return { data: null } })
vi.mock('@/services/api', () => ({ api: { get: () => get(), post: () => post() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock('./useNotificationSound', () => ({ useNotificationSound: () => ({ play: vi.fn(), enabled: false, toggle: vi.fn() }) }))

import { useNotifications } from './useNotifications'

afterEach(() => { naoLidas = 3; get.mockClear(); post.mockClear() })

describe('useNotifications — o sino e a lista andam juntos (12/11)', () => {
  it('ler na lista baixa o número do sino (outra cópia do hook)', async () => {
    const sino = renderHook(() => useNotifications())
    const lista = renderHook(() => useNotifications())
    await waitFor(() => expect(sino.result.current.unreadCount).toBe(3))
    await act(async () => { await lista.result.current.markAsRead('n1') })
    await waitFor(() => expect(sino.result.current.unreadCount).toBe(2))
  })

  it('aviso do servidor (outra aba ou aparelho) faz o sino reler', async () => {
    const sino = renderHook(() => useNotifications())
    await waitFor(() => expect(sino.result.current.unreadCount).toBe(3))
    naoLidas = 0
    act(() => { window.dispatchEvent(new CustomEvent('notifications:sync', { detail: { unreadCount: 0 } })) })
    await waitFor(() => expect(sino.result.current.unreadCount).toBe(0))
  })
})
