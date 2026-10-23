// P1 (23/10): a bancada dizia "Simulação" mas executava skill, CRM e integração
// de verdade — um "quero marcar consulta" marcava na agenda da clínica.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const { chatWithAgent } = vi.hoisted(() => ({ chatWithAgent: vi.fn() }))
vi.mock('@/services/agentsApi', () => ({
  chatWithAgent,
  startTestSession: vi.fn(async () => ({ id: 's1' })),
  endTestSession: vi.fn(async () => {}),
  listTestSessions: vi.fn(async () => []),
  getTestSessionMessages: vi.fn(async () => []),
}))

import { BancadaDeTeste } from './BancadaDeTeste'

describe('bancada · ferramentas simuladas', () => {
  it('pede ao servidor para simular as ferramentas e mostra a skill como simulada', async () => {
    chatWithAgent.mockResolvedValue({
      message: 'Vou verificar a agenda.',
      toolCalls: [{ name: 'nova_consulta', kind: 'skill', success: false }],
      guard: null,
      simulated: null,
    })
    render(<BancadaDeTeste agent={{ id: 'a1', tools: [], system_prompt: 'x' } as never} onTestou={vi.fn()} onFechar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Mensagem do cliente'), { target: { value: 'Quero marcar consulta' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enviar' })) })

    expect(chatWithAgent).toHaveBeenCalledTimes(1)
    expect(chatWithAgent.mock.calls[0][2]).toMatchObject({ agentId: 'a1', stubTools: true })
    expect(await screen.findByText('Skill: nova consulta (simulada: não foi executada)')).toBeInTheDocument()
    expect(screen.queryByText(/\(falhou\)/)).toBeNull()
  })
})
