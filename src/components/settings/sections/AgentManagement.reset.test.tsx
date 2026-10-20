// Link de redefinição de senha pelo administrador (20/10): item só para
// usuário ativo, nunca o próprio, e o dono só recebe de outro dono.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { get, post, toast, actor } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), toast: vi.fn(),
  actor: { current: { id: 'adm-1', role: 'admin', tenantId: 't1' } as { id: string; role: string; tenantId: string } },
}))
vi.mock('@/services/api', () => ({ api: { get, post, patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: actor.current }) }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast }), showToast: toast }))
vi.mock('@/services/appLogger', () => ({ appLogger: new Proxy({}, { get: () => vi.fn() }) }))

import { AgentManagement } from './AgentManagement'

const u = (id: string, first: string, role: string, extra: Record<string, unknown> = {}) => ({
  id, firstName: first, lastName: '', email: `${first.toLowerCase()}@clinica.com`, role, isActive: true, status: 'active', tenantId: 't1', ...extra,
})

beforeEach(() => {
  get.mockReset(); post.mockReset(); toast.mockReset()
  get.mockImplementation(async (url: string) => (url === '/users'
    ? { data: [u('adm-1', 'Roberta', 'admin'), u('u-2', 'Marcos', 'agent'), u('u-3', 'Dona', 'business_admin'), u('u-4', 'Novo', 'agent', { isActive: false, status: 'pending' })] }
    : { data: [] }))
})

const abrirMenu = async (nome: string) => {
  fireEvent.click(await screen.findByRole('button', { name: `Ações de ${nome}` }))
}

describe('Agentes — enviar link de redefinição', () => {
  it('administrador envia para o atendente, com confirmação', async () => {
    actor.current = { id: 'adm-1', role: 'admin', tenantId: 't1' }
    post.mockResolvedValue({ data: { emailStatus: 'sent' } })
    render(<AgentManagement />)
    await abrirMenu('Marcos')
    fireEvent.click(await screen.findByText('Enviar link de redefinição de senha'))
    expect(await screen.findByText(/O link vai para marcos@clinica.com/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/users/u-2/send-password-reset'))
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Link enviado para marcos@clinica.com.', 'success'))
  })

  it('não aparece para si mesmo, para o dono (sendo admin) nem para pendente', async () => {
    actor.current = { id: 'adm-1', role: 'admin', tenantId: 't1' }
    render(<AgentManagement />)
    for (const nome of ['Roberta', 'Dona', 'Novo']) {
      await abrirMenu(nome)
      expect(screen.queryByText('Enviar link de redefinição de senha')).toBeNull()
      fireEvent.keyDown(document, { key: 'Escape' })
    }
  })

  it('o dono da conta pode enviar para outro dono', async () => {
    actor.current = { id: 'adm-1', role: 'business_admin', tenantId: 't1' }
    render(<AgentManagement />)
    await abrirMenu('Dona')
    expect(await screen.findByText('Enviar link de redefinição de senha')).toBeInTheDocument()
  })
})
