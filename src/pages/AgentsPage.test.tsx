import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'

const h = vi.hoisted(() => ({ flags: null as null | ((v: { specWizard?: boolean }) => void), acao: null as ReactNode }))
vi.mock('@/contexts/TopBarActionsContext', () => ({ useRegisterTopBarActions: (n: ReactNode) => { h.acao = n } }))
vi.mock('@/services/agentsApi', () => ({
  getAgentRuntimeFlags: () => new Promise((resolve) => { h.flags = resolve }),
}))
vi.mock('@/components/agents/AgentBuilderWizard', () => ({ AgentBuilderWizard: () => <p>assistente antigo</p> }))
vi.mock('@/components/agents/assistente/AssistenteDeAgente', () => ({ AssistenteDeAgente: () => <p>assistente novo</p> }))
vi.mock('@/components/agents/pagina/PaginaDoAgente', () => ({ PaginaDoAgente: () => null }))
vi.mock('@/components/agents/pagina/ListaDeAgentes', () => ({
  ListaDeAgentes: ({ onNovo }: { onNovo: () => void }) => <button onClick={onNovo}>Novo agente (lista)</button>,
}))

import { AgentsPage } from './AgentsPage'

describe('AgentsPage — Novo agente', () => {
  it('clicar antes das flags chegarem espera e abre o assistente novo, não o antigo', async () => {
    render(<MemoryRouter initialEntries={['/agents']}><Routes><Route path="/agents" element={<AgentsPage />} /></Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Novo agente (lista)' }))
    expect(screen.queryByText('assistente antigo')).not.toBeInTheDocument()
    await act(async () => { h.flags!({ specWizard: true }) })
    expect(await screen.findByText('assistente novo')).toBeInTheDocument()
    expect(screen.queryByText('assistente antigo')).not.toBeInTheDocument()
  })
})
