import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

/**
 * Auditoria de arquitetura dos agentes (onda 1, A6): a seção prometia que o
 * agente oferece os produtos "com os preços do catálogo da empresa", mas com
 * FF_CATALOG_INJECTION desligada (padrão do agent-server) o catálogo não chega
 * ao modelo. A tela agora diz o que o motor faz de fato.
 */

const getAgentRuntimeFlags = vi.fn()
vi.mock('@/services/agentsApi', () => ({ getAgentRuntimeFlags: () => getAgentRuntimeFlags() }))
vi.mock('@/components/agents/AgentCatalogTab', () => ({ AgentCatalogTab: () => <div>lista de produtos</div> }))
vi.mock('@/components/agents/AgentPractitionerTab', () => ({ AgentPractitionerTab: () => <div>lista de profissionais</div> }))
vi.mock('../salvamentoContexto', () => ({ useSalvamento: () => ({ salvar: vi.fn() }) }))

import { SecaoCatalogo } from './SecaoCatalogo'

const AGENT = { id: 'agent-1' } as never
const AVISO = /ainda não lê este catálogo/

beforeEach(() => {
  getAgentRuntimeFlags.mockReset()
})

describe('SecaoCatalogo', () => {
  it('com a leitura do catálogo desligada, avisa e não promete preços', async () => {
    getAgentRuntimeFlags.mockResolvedValue({ catalogInjection: false })
    render(<SecaoCatalogo agent={AGENT} onMudou={() => {}} />)
    expect(await screen.findByText(AVISO)).toBeInTheDocument()
    expect(screen.queryByText(/com os preços do catálogo/)).not.toBeInTheDocument()
  })

  it('com a leitura ligada, descreve os preços do catálogo e não mostra o aviso', async () => {
    getAgentRuntimeFlags.mockResolvedValue({ catalogInjection: true })
    render(<SecaoCatalogo agent={AGENT} onMudou={() => {}} />)
    expect(await screen.findByText(/com os preços do catálogo da empresa/)).toBeInTheDocument()
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })

  it('se não der para saber, fica neutro: nem promete nem avisa', async () => {
    getAgentRuntimeFlags.mockRejectedValue(new Error('offline'))
    render(<SecaoCatalogo agent={AGENT} onMudou={() => {}} />)
    await waitFor(() => expect(getAgentRuntimeFlags).toHaveBeenCalled())
    expect(screen.getByText('O que este agente pode oferecer.')).toBeInTheDocument()
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })
})
