import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Onda 3 — "ver o que o agente recebe": camadas e ferramentas do /chat (dry_run).
const getEffectivePrompt = vi.fn()
vi.mock('@/services/agentsApi', () => ({ getEffectivePrompt: (a: unknown) => getEffectivePrompt(a) }))

import { OQueOAgenteRecebe } from './OQueOAgenteRecebe'

const AGENT = { id: 'agent-1', system_prompt: 'Você é a Serrinha.' } as never

describe('OQueOAgenteRecebe', () => {
  it('abre, monta pelo /chat e mostra camadas com a origem e as ferramentas', async () => {
    getEffectivePrompt.mockResolvedValue({
      mode: 'compiled', model: 'claude-haiku-4-5', totalChars: 1234,
      layers: [
        { id: 'plataforma', title: 'Regras da plataforma', source: 'Oryon (não editável)', text: 'REGRAS DA PLATAFORMA' },
        { id: 'agente', title: 'Instruções do agente', source: 'Texto do agente', text: 'Você é a Serrinha.' },
      ],
      tools: [{ name: 'transferir_para_humano', description: 'Transfere a conversa para uma pessoa.' }],
    })
    render(<OQueOAgenteRecebe agent={AGENT} tamanho="sm" />)
    fireEvent.click(screen.getByRole('button', { name: /Ver o que o agente recebe/ }))
    expect(await screen.findByText('Regras da plataforma')).toBeInTheDocument()
    expect(screen.getByText('Oryon (não editável)')).toBeInTheDocument()
    expect(screen.getByText('transferir_para_humano')).toBeInTheDocument()
    expect(getEffectivePrompt).toHaveBeenCalledWith(AGENT)
  })

  it('servidor antigo ou fora do ar: explica em vez de ficar carregando', async () => {
    getEffectivePrompt.mockRejectedValue(new Error('Erro 500'))
    render(<OQueOAgenteRecebe agent={AGENT} tamanho="sm" />)
    fireEvent.click(screen.getByRole('button', { name: /Ver o que o agente recebe/ }))
    expect(await screen.findByText(/Não foi possível montar agora/)).toBeInTheDocument()
  })
})
