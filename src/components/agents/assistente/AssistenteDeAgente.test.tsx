import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

/**
 * Onda 4 — assistente novo: rascunho no servidor (recarregar não perde),
 * etapas sobre o negócio, publicação atômica e número ligado ao publicar.
 */

const api = vi.hoisted(() => ({
  createSpecDraft: vi.fn(),
  getSpecDraft: vi.fn(),
  saveSpecDraft: vi.fn(),
  getSpecReadiness: vi.fn(),
  publishSpecDraft: vi.fn(),
  getAgent: vi.fn(),
  generateSpecText: vi.fn(),
  chatWithAgent: vi.fn(),
  patch: vi.fn(),
}))
vi.mock('@/services/agentsApi', () => api)
vi.mock('@/services/api', () => ({
  default: { patch: api.patch },
  departmentsApi: { list: vi.fn(async () => ({ data: [{ id: 'd1', name: 'Recepção' }] })) },
  whatsappNumbersApi: { list: vi.fn(async () => ({ data: [{ id: 'n1', displayPhoneNumber: '+55 24 99999-0000' }] })) },
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tenantId: 't1' } }) }))

import { AssistenteDeAgente } from './AssistenteDeAgente'
import { faltaNaEtapa, specVazia, textoParaEnsaio } from './especificacao'

const DRAFT = { id: 'draft-1', agent_id: null, spec: specVazia(), step: 1, published_agent_id: null, published_version: null, updated_at: '' }

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
  localStorage.clear()
  api.createSpecDraft.mockResolvedValue({ draft: DRAFT, repeatedFacts: [] })
  api.saveSpecDraft.mockResolvedValue(DRAFT)
})

describe('regras do assistente', () => {
  it('etapas 1 e 2 exigem o mínimo; o ensaio usa só persona e fluxo', () => {
    const s = specVazia()
    expect(faltaNaEtapa(1, s)).toMatch(/tipo de negócio/)
    s.identity.segment = 'Clínica'
    expect(faltaNaEtapa(1, s)).toBeNull()
    expect(faltaNaEtapa(2, s)).toMatch(/nome/)
    s.persona.text = 'Você é a Serrinha, recepcionista virtual.'
    s.flow.text = 'Cumprimente e entenda o pedido antes de responder.'
    expect(textoParaEnsaio(s)).toMatch(/^## Quem você é\nVocê é a Serrinha/)
  })
})

describe('AssistenteDeAgente', () => {
  it('cria o rascunho no servidor, guarda o id para retomar e salva ao mudar', async () => {
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    await waitFor(() => expect(api.createSpecDraft).toHaveBeenCalled())
    expect(localStorage.getItem('oryon:agentes:assistente:t1')).toBe('draft-1')
    fireEvent.change(screen.getByLabelText('Tipo de negócio'), { target: { value: 'Clínica' } })
    await waitFor(() => expect(api.saveSpecDraft).toHaveBeenCalled(), { timeout: 2000 })
    expect(api.saveSpecDraft.mock.calls.at(-1)![1].identity.segment).toBe('Clínica')
  })

  it('recarregou: retoma o rascunho guardado na etapa em que estava', async () => {
    localStorage.setItem('oryon:agentes:assistente:t1', 'draft-9')
    api.getSpecDraft.mockResolvedValue({ ...DRAFT, id: 'draft-9', step: 5, spec: { ...specVazia(), identity: { name: 'Serrinha', goal: 'atender_agendar', segment: 'Clínica' } } })
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    expect(await screen.findByText('Setor que recebe')).toBeInTheDocument()
    expect(api.createSpecDraft).not.toHaveBeenCalled()
  })

  it('não deixa avançar sem o mínimo da etapa', async () => {
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    await waitFor(() => expect(api.createSpecDraft).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Conte o tipo de negócio.')).toBeInTheDocument()
  })

  it('servidor sem as rotas novas: avisa que não está salvo e não deixa publicar', async () => {
    api.createSpecDraft.mockRejectedValue(new Error('Erro 404'))
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    expect(await screen.findByText('Não salvo no servidor')).toBeInTheDocument()
  })

  it('publica numa chamada, liga o número escolhido e abre o agente criado', async () => {
    localStorage.setItem('oryon:agentes:assistente:t1', 'draft-1')
    const pronta = {
      ...specVazia(),
      identity: { name: 'Serrinha', goal: 'atender_agendar' as const, segment: 'Clínica' },
      persona: { tone: 'acolhedor' as const, text: 'Você é a Serrinha, recepcionista virtual.' },
      flow: { text: 'Cumprimente e entenda o pedido antes de responder.' },
      channel: { whatsappNumberId: 'n1' },
      tests: [{ question: 'Oi', answer: 'Olá!', verdict: 'boa' as const }],
    }
    api.getSpecDraft.mockResolvedValue({ ...DRAFT, step: 7, spec: pronta })
    api.getSpecReadiness.mockResolvedValue({ ready: true, items: [{ id: 'identidade', label: 'Nome, persona e fluxo preenchidos', ok: true, blocking: true }] })
    api.publishSpecDraft.mockResolvedValue({ agentId: 'agent-1', version: 1, alreadyPublished: false })
    api.patch.mockResolvedValue({ data: { agentId: 'agent-1' } })
    api.getAgent.mockResolvedValue({ id: 'agent-1' })
    const onCreated = vi.fn()
    render(<AssistenteDeAgente onClose={() => {}} onCreated={onCreated} />)
    const publicar = await screen.findByRole('button', { name: 'Publicar agente' })
    await waitFor(() => expect(publicar).not.toBeDisabled())
    await act(async () => { fireEvent.click(publicar) })
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'agent-1' }))
    expect(api.publishSpecDraft).toHaveBeenCalledWith('draft-1')
    expect(api.patch).toHaveBeenCalledWith('/meta/numbers/n1', { agentId: 'agent-1' })
    expect(localStorage.getItem('oryon:agentes:assistente:t1')).toBeNull()
  })
})

describe('revisar agente existente', () => {
  it('abre na etapa 2 com o texto do agente e aponta os fatos repetidos', async () => {
    api.createSpecDraft.mockResolvedValue({
      draft: { ...DRAFT, agent_id: 'a1', spec: { ...specVazia(), identity: { name: 'Antigo', goal: 'outro', segment: 'Clínica' }, persona: { tone: 'acolhedor', text: 'Consulta R$ 155. Ligue (24) 99999-1234.' } } },
      repeatedFacts: [{ kind: 'preco', excerpt: 'R$ 155' }, { kind: 'telefone', excerpt: '(24) 99999-1234' }],
    })
    render(<AssistenteDeAgente agentId="a1" onClose={() => {}} onCreated={() => {}} />)
    expect(await screen.findByText(/repete fatos que já vêm das fontes/)).toBeInTheDocument()
    expect(screen.getByText('preço: R$ 155')).toBeInTheDocument()
    expect(api.createSpecDraft).toHaveBeenCalledWith({ agentId: 'a1' })
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    expect(localStorage.getItem('oryon:agentes:assistente:t1:agente:a1')).toBe('draft-1')
  })
})
