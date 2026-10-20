// Cópia por e-mail das notificações (20/10): o botão só aparece nos tipos de
// baixo volume, fica apagado com a notificação desligada e salva o canal.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@/services/api', () => ({ api: { get, patch, delete: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock('@/hooks/useNotificationSound', () => ({ useNotificationSound: () => ({ enabled: false, toggle: vi.fn() }) }))

import { Notifications } from './Notifications'
import type { ResolvedPreference } from '@/hooks/useNotificationPreferences'

const pref = (p: Partial<ResolvedPreference>): ResolvedPreference => ({
  type: 'conversation_assigned', label: 'Conversa atribuída', description: 'Quando uma conversa é atribuída a você.',
  category: 'conversations', enabled: true, channels: ['in_app'], isOverride: false, mandatory: false, emailAvailable: true, ...p,
})

beforeEach(() => { get.mockReset(); patch.mockReset() })

describe('Notificações — cópia por e-mail', () => {
  it('liga o e-mail num tipo de baixo volume', async () => {
    const lista = [pref({}), pref({ type: 'new_message', label: 'Nova mensagem', emailAvailable: false })]
    get.mockResolvedValue({ data: lista })
    patch.mockResolvedValue({ data: [pref({ channels: ['in_app', 'email'], isOverride: true }), lista[1]] })
    render(<Notifications />)
    const botoes = await screen.findAllByRole('button', { name: /E-mail/ })
    expect(botoes).toHaveLength(1) // "Nova mensagem" não tem
    expect(botoes[0]).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(botoes[0])
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/notification-preferences/conversation_assigned', { enabled: true, channels: ['in_app', 'email'] }))
    await waitFor(() => expect(screen.getByRole('button', { name: /E-mail/ })).toHaveAttribute('aria-pressed', 'true'))
  })

  it('com a notificação desligada, o botão fica desabilitado', async () => {
    get.mockResolvedValue({ data: [pref({ enabled: false })] })
    render(<Notifications />)
    expect(await screen.findByRole('button', { name: /E-mail/ })).toBeDisabled()
  })
})
