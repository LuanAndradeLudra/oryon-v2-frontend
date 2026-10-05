// R6 / D11 — só administrador liga (publica) um agente; pausar segue livre.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const quem = vi.hoisted(() => ({ role: 'supervisor' as string }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tenantId: 't1', role: quem.role } }) }))
vi.mock('./salvamentoContexto', async (orig) => ({ ...(await orig<object>()), useSalvamento: () => ({ salvar: (f: () => unknown) => f() }) }))
vi.mock('./SalvamentoDoAgente', () => ({ IndicadorDeSalvamento: () => null }))
vi.mock('../linhasDosAgentes', () => ({ useLinhasPorAgente: () => new Map(), numeroDoAgente: () => undefined }))

import { CabecalhoDoAgente } from './CabecalhoDoAgente'
import type { AgentConfigWithTools } from '@/services/agentsApi'

const agente = (status: string) => ({ id: 'a1', name: 'Bia', status, icon: 'bot', tools: [] }) as unknown as AgentConfigWithTools

function montar(status: string) {
  render(
    <MemoryRouter>
      <CabecalhoDoAgente agent={agente(status)} onAtualizar={() => {}} testado testeAberto={false} onAlternarTeste={() => {}} />
    </MemoryRouter>,
  )
  return screen.getByRole('switch')
}

describe('CabecalhoDoAgente — R6', () => {
  it('supervisor, agente em rascunho: não liga e vê a mensagem da D11', () => {
    quem.role = 'supervisor'
    expect(montar('draft')).toBeDisabled()
    expect(screen.getByText('Um administrador precisa publicar este agente.')).toBeTruthy()
  })

  it('supervisor, agente no ar: pode desligar (pausar é livre)', () => {
    quem.role = 'supervisor'
    expect(montar('active')).not.toBeDisabled()
  })

  it('admin liga', () => {
    quem.role = 'admin'
    expect(montar('paused')).not.toBeDisabled()
    expect(screen.queryByText('Um administrador precisa publicar este agente.')).toBeNull()
  })
})
