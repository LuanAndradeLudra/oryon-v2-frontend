// Revisão final 04/10: o assistente antigo marcava "Salvo" depois de 250 ms
// sem conferir a resposta — sem permissão ou com o servidor fora, a alteração
// sumia ao recarregar. Agora só marca "Salvo" quando o servidor confirma.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const { salvar } = vi.hoisted(() => ({ salvar: vi.fn() }))
vi.mock('@/services/companyContextService', async (orig) => ({
  ...(await orig<object>()),
  loadHubAsync: vi.fn(async () => ({ companyName: 'Clínica', industry: '', description: '', businessType: [], productsServices: '', brandFiles: [], links: [] })),
  saveHubAndWait: salvar,
}))

import { Step4 } from './AgentBuilderWizard'

beforeEach(() => {
  salvar.mockReset()
  localStorage.setItem('oryon:session', JSON.stringify({ user: { id: 'u1', tenantId: 't1' } }))
})

async function editarESalvar() {
  render(<Step4 data={{} as never} setData={vi.fn()} />)
  const nome = await screen.findByPlaceholderText('Ex: Oryon Hub')
  fireEvent.change(nome, { target: { value: 'Clínica Nova' } })
  fireEvent.click(screen.getByRole('button', { name: /Salvar/ }))
}

describe('assistente antigo · salvar o Contexto da IA', () => {
  it('servidor confirmou: "Salvo"', async () => {
    salvar.mockResolvedValue('ok')
    await editarESalvar()
    expect(await screen.findByText('Salvo')).toBeInTheDocument()
  })

  it('sem permissão: avisa e não marca "Salvo"', async () => {
    salvar.mockResolvedValue('forbidden')
    await editarESalvar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Só um administrador')
    expect(screen.queryByText('Salvo')).toBeNull()
    expect(screen.getByText('Não salvo')).toBeInTheDocument()
  })
})
