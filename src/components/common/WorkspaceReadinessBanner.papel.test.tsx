// Revisão final 04/10: os passos de configuração são do administrador — o
// atendente vê a lista como informação, sem botões que levam a telas que ele
// não abre.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const quem = vi.hoisted(() => ({ role: 'agent' }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: quem.role } }) }))
vi.mock('@/hooks/useWorkspaceReadiness', async (orig) => ({
  ...(await orig<object>()),
  useWorkspaceReadiness: () => ({
    loading: false,
    snapshot: { checks: [{ id: 'setor', label: 'Pelo menos um setor cadastrado', description: 'x', severity: 'blocker', met: false, cta: { label: 'Criar setor', href: '/settings/departments' } }] },
  }),
}))

import { WorkspaceReadinessBanner } from './WorkspaceReadinessBanner'

beforeEach(() => { quem.role = 'agent' })

describe('banner de configuração pendente · papel', () => {
  it('atendente: sem botão de ação, com a orientação de pedir ao administrador', () => {
    render(<MemoryRouter><WorkspaceReadinessBanner mode="checklist" /></MemoryRouter>)
    expect(screen.getByText('Pelo menos um setor cadastrado')).toBeInTheDocument()
    expect(screen.queryByText('Criar setor')).toBeNull()
    expect(screen.getByText(/Peça a um administrador/)).toBeInTheDocument()
  })

  it('administrador: vê o botão de ação', () => {
    quem.role = 'admin'
    render(<MemoryRouter><WorkspaceReadinessBanner mode="checklist" /></MemoryRouter>)
    expect(screen.getByText('Criar setor')).toBeInTheDocument()
  })
})
