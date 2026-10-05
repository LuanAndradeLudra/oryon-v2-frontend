import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'

const h = vi.hoisted(() => ({
  flags: null as null | ((v: { specWizard?: boolean }) => void), acao: null as ReactNode,
  drafts: [] as Array<Record<string, unknown>>,
}))
vi.mock('@/contexts/TopBarActionsContext', () => ({ useRegisterTopBarActions: (n: ReactNode) => { h.acao = n } }))
vi.mock('@/services/agentsApi', () => ({
  getAgentRuntimeFlags: () => new Promise((resolve) => { h.flags = resolve }),
  listSpecDrafts: vi.fn(async () => h.drafts),
}))
vi.mock('@/components/agents/AgentBuilderWizard', () => ({ AgentBuilderWizard: () => <p>assistente antigo</p> }))
vi.mock('@/components/agents/assistente/AssistenteDeAgente', () => ({
  AssistenteDeAgente: ({ draftInicial }: { draftInicial?: string }) => <p>assistente novo{draftInicial ? ` (${draftInicial})` : ''}</p>,
}))
vi.mock('@/components/agents/pagina/PaginaDoAgente', () => ({ PaginaDoAgente: () => null }))
vi.mock('@/components/agents/pagina/ListaDeAgentes', () => ({
  ListaDeAgentes: ({ onNovo, rascunhos = [], onContinuarRascunho }: {
    onNovo: () => void; rascunhos?: Array<{ id: string; spec: { identity: { name: string } } }>; onContinuarRascunho?: (d: unknown) => void
  }) => (
    <div>
      <button onClick={onNovo}>Novo agente (lista)</button>
      {rascunhos.map((d) => <button key={d.id} onClick={() => onContinuarRascunho?.(d)}>Continuar {d.spec.identity.name}</button>)}
    </div>
  ),
}))

import { AgentsPage } from './AgentsPage'

describe('AgentsPage — Novo agente', () => {
  it('rascunhos esperando publicação: só os que têm nome; "Continuar" abre aquele rascunho', async () => {
    h.drafts = [
      { id: 'd1', agent_id: null, spec: { identity: { name: 'Clara' } } },
      { id: 'd2', agent_id: null, spec: { identity: { name: '' } } },
      { id: 'd3', agent_id: 'bia', spec: { identity: { name: 'Bia' } } },
      { id: 'd4', agent_id: 'bia', spec: { identity: { name: 'Bia' } } },
    ]
    render(<MemoryRouter initialEntries={['/agents']}><Routes><Route path="/agents" element={<AgentsPage />} /></Routes></MemoryRouter>)
    await act(async () => { h.flags!({ specWizard: true }) })
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar Clara' }))
    expect(screen.queryByRole('button', { name: /Continuar $/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Continuar Bia' })).toHaveLength(1)
    expect(await screen.findByText('assistente novo (d1)')).toBeInTheDocument()
    h.drafts = []
  })

  it('clicar antes das flags chegarem espera e abre o assistente novo, não o antigo', async () => {
    render(<MemoryRouter initialEntries={['/agents']}><Routes><Route path="/agents" element={<AgentsPage />} /></Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Novo agente (lista)' }))
    expect(screen.queryByText('assistente antigo')).not.toBeInTheDocument()
    await act(async () => { h.flags!({ specWizard: true }) })
    expect(await screen.findByText('assistente novo')).toBeInTheDocument()
    expect(screen.queryByText('assistente antigo')).not.toBeInTheDocument()
  })
})
