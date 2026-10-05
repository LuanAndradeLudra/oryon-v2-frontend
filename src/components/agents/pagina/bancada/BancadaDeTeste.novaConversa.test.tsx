// Revisão 02/10: "Nova conversa" com a resposta pendente não pode deixar a
// resposta antiga cair na conversa nova.
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
vi.mock('./fontesDaResposta', () => ({ fontesDaResposta: () => [], promptDeTeste: () => 'prompt' }))

import { BancadaDeTeste } from './BancadaDeTeste'

describe('bancada · nova conversa com resposta pendente', () => {
  it('a resposta da conversa anterior é descartada', async () => {
    let soltar: (v: unknown) => void = () => {}
    chatWithAgent.mockReturnValue(new Promise((r) => { soltar = r }))
    render(<BancadaDeTeste agent={{ id: 'a1', tools: [] } as never} onTestou={vi.fn()} onFechar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Mensagem do cliente'), { target: { value: 'Quanto custa?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(screen.getByText('Quanto custa?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nova conversa' }))
    await act(async () => { soltar({ message: 'Custa R$ 200.', toolCalls: [] }); await new Promise((r) => setTimeout(r, 0)) })
    expect(screen.queryByText('Custa R$ 200.')).toBeNull()
    expect(screen.queryByText('Quanto custa?')).toBeNull()
  })
})
