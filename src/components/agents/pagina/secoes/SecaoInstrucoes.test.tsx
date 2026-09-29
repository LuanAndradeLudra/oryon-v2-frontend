import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const h = vi.hoisted(() => ({ pendente: vi.fn(), guardarTexto: vi.fn() }))
vi.mock('../salvamentoContexto', () => ({
  useSalvamento: () => ({ salvar: vi.fn(), lerTexto: () => undefined, guardarTexto: h.guardarTexto }),
  useRascunhoPendente: (rotulo: string, sujo: boolean) => h.pendente(rotulo, sujo),
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tenantId: 't1' } }) }))
vi.mock('@/services/companyContextService', () => ({
  loadHub: () => null, hubHasContent: () => false, isAgentStale: () => false, injectHubIntoPrompt: (p: string) => p,
}))
vi.mock('@/services/agentsApi', () => ({ getAgentRuntimeFlags: vi.fn(async () => ({})), updateAgent: vi.fn() }))
vi.mock('@/components/agents/assistente/AssistenteDeAgente', () => ({ AssistenteDeAgente: () => null }))
vi.mock('./OQueOAgenteRecebe', () => ({ OQueOAgenteRecebe: () => null }))
vi.mock('./AvisoDeFerramentas', () => ({ AvisoDeFerramentas: () => null }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('../useToque', () => ({ useTamanhoDeToque: () => 'md' }))

import { SecaoInstrucoes } from './SecaoInstrucoes'
import type { AgentConfigWithTools } from '@/services/agentsApi'

const agente = (system_prompt: string) =>
  ({ id: 'a1', name: 'Bia', system_prompt, wizard_config: { specVersion: 1 }, updated_at: '' }) as unknown as AgentConfigWithTools

beforeEach(() => { h.pendente.mockReset(); h.guardarTexto.mockReset() })

describe('SecaoInstrucoes', () => {
  it('nova versão publicada por fora: o rascunho acompanha e não acusa alteração pendente', () => {
    const { rerender } = render(<SecaoInstrucoes agent={agente('Texto antigo.')} onAtualizar={() => {}} />)
    rerender(<SecaoInstrucoes agent={agente('Texto novo da revisão.')} onAtualizar={() => {}} />)
    expect(h.pendente.mock.calls.at(-1)).toEqual(['Instruções', false])
    expect(screen.getByText(/Texto novo da revisão\./)).toBeInTheDocument()
  })

  it('no meio de uma edição, o texto de quem edita não é trocado', () => {
    const { rerender } = render(<SecaoInstrucoes agent={agente('Texto antigo.')} onAtualizar={() => {}} />)
    fireEvent.click(screen.getAllByRole('button', { name: /Editar/ })[0])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Minha edição.' } })
    rerender(<SecaoInstrucoes agent={agente('Texto novo da revisão.')} onAtualizar={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('Minha edição.')
  })
})
