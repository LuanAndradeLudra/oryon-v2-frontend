import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const getEffectivePrompt = vi.fn()
const getAgentSpecForAgent = vi.fn()
const listAgentTestRuns = vi.fn()
const rodarBateria = vi.fn()
vi.mock('@/services/agentsApi', () => ({
  getEffectivePrompt: (a: unknown) => getEffectivePrompt(a),
  getAgentSpecForAgent: (id: string) => getAgentSpecForAgent(id),
  listAgentTestRuns: (id: string) => listAgentTestRuns(id),
}))
vi.mock('@/components/agents/bateria/bateria', () => ({ rodarBateria: (o: unknown) => rodarBateria(o) }))

import { AvisoDeFerramentas } from './AvisoDeFerramentas'
import { marcarFerramentasVistas } from '../ferramentasNoTexto'

const AGENT = { id: 'a1', system_prompt: '## Como conduzir\nQuem confirma o horário é a equipe.' } as never
const COM_AGENDA = { mode: 'compiled', model: 'm', layers: [], totalChars: 1, tools: [{ name: 'agendar_consulta', description: 'Marca a consulta na agenda.' }] }
const montar = (onEditar = vi.fn()) => render(<MemoryRouter><AvisoDeFerramentas agent={AGENT} onEditar={onEditar} /></MemoryRouter>)

describe('AvisoDeFerramentas', () => {
  beforeEach(() => {
    localStorage.clear()
    for (const f of [getEffectivePrompt, getAgentSpecForAgent, listAgentTestRuns, rodarBateria]) f.mockReset()
    listAgentTestRuns.mockResolvedValue([])
  })

  it('primeira visita: aponta o trecho que contradiz, sem rodar a bateria', async () => {
    getEffectivePrompt.mockResolvedValue(COM_AGENDA)
    const onEditar = vi.fn()
    montar(onEditar)
    expect(await screen.findByText(/“Quem confirma o horário é a equipe.”/)).toBeInTheDocument()
    expect(screen.queryByText(/Ferramenta nova conectada/)).not.toBeInTheDocument()
    expect(rodarBateria).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Editar o texto' }))
    expect(onEditar).toHaveBeenCalled()
  })

  it('ferramenta nova desde a última visita: avisa e roda a bateria uma vez', async () => {
    marcarFerramentasVistas('a1', [])
    getEffectivePrompt.mockResolvedValue(COM_AGENDA)
    getAgentSpecForAgent.mockResolvedValue({ spec: { tests: [{ question: 'Tem horário amanhã?' }] }, version: 2 })
    rodarBateria.mockResolvedValue({ id: 'r1', changed: 1, total: 1, results: [] })
    montar()
    expect(await screen.findByText(/Ferramenta nova conectada/)).toBeInTheDocument()
    expect(await screen.findByText(/Bateria de testes: 1 de 1 mudaram/)).toBeInTheDocument()
    expect(rodarBateria.mock.calls[0][0]).toMatchObject({ trigger: 'manual', specVersion: 2, tests: [{ question: 'Tem horário amanhã?' }] })
    // Voltando à página: a ferramenta já foi vista, não roda de novo.
    rodarBateria.mockClear()
    montar()
    await waitFor(() => expect(getEffectivePrompt).toHaveBeenCalledTimes(2))
    expect(rodarBateria).not.toHaveBeenCalled()
  })

  it('sem ferramenta própria e sem conflito: não mostra nada', async () => {
    getEffectivePrompt.mockResolvedValue({ ...COM_AGENDA, tools: [{ name: 'search_knowledge_base', description: 'Busca.' }] })
    const { container } = montar()
    await waitFor(() => expect(getEffectivePrompt).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
