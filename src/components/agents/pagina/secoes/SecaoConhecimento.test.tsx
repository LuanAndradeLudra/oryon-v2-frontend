import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'

/**
 * Auditoria de arquitetura dos agentes (onda 1, A8/A9): o arquivo lido só em
 * parte (texto cortado ou o modelo parando antes do fim) entrava na base sem
 * aviso, e o motivo de uma recusa (formato não suportado, arquivo sem texto)
 * sumia atrás de um "não foi possível enviar".
 */

const api = vi.hoisted(() => ({
  listAgentKnowledge: vi.fn(),
  extractBrandFileDetailed: vi.fn(),
  addAgentKnowledge: vi.fn(),
}))
const toast = vi.fn()

vi.mock('@/services/agentsApi', () => ({
  ...api,
  deleteAgentKnowledge: vi.fn(),
  getAgentKnowledgeDoc: vi.fn(),
  updateAgentKnowledge: vi.fn(),
}))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast }) }))
vi.mock('../salvamentoContexto', () => ({ useSalvamento: () => ({ salvar: (fn: () => Promise<unknown>) => fn() }) }))
vi.mock('@/components/agents/KnowledgeDocArtifact', () => ({ KnowledgeDocArtifact: () => null }))

import { SecaoConhecimento } from './SecaoConhecimento'

const AGENT = { id: 'agent-1' } as never

function enviar(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => {
  toast.mockReset()
  api.listAgentKnowledge.mockReset().mockResolvedValue([])
  api.extractBrandFileDetailed.mockReset()
  api.addAgentKnowledge.mockReset().mockResolvedValue({ id: 'doc-1' })
})

describe('SecaoConhecimento — envio de arquivo', () => {
  it('arquivo lido só em parte: salva e avisa o corte', async () => {
    api.extractBrandFileDetailed.mockResolvedValue({
      text: 'tabela...', truncated: true, warning: '"precos.pdf" foi lido só em parte: o final do arquivo ficou de fora.',
    })
    const { container } = render(<SecaoConhecimento agent={AGENT} onMudou={() => {}} />)
    await waitFor(() => expect(api.listAgentKnowledge).toHaveBeenCalled())
    enviar(container, new File(['x'], 'precos.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/só em parte/), 'warning'))
    expect(api.addAgentKnowledge).toHaveBeenCalled()
  })

  it('arquivo completo: nenhum aviso', async () => {
    api.extractBrandFileDetailed.mockResolvedValue({ text: 'tudo', truncated: false })
    const { container } = render(<SecaoConhecimento agent={AGENT} onMudou={() => {}} />)
    await waitFor(() => expect(api.listAgentKnowledge).toHaveBeenCalled())
    enviar(container, new File(['tudo'], 'sobre.txt', { type: 'text/plain' }))
    await waitFor(() => expect(api.addAgentKnowledge).toHaveBeenCalled())
    expect(toast).not.toHaveBeenCalledWith(expect.anything(), 'warning')
  })

  it('recusa da extração mostra o motivo da rota', async () => {
    api.extractBrandFileDetailed.mockRejectedValue(new Error('Formato de "planilha.xlsx" não suportado. Envie PDF, DOCX, imagem ou texto.'))
    const { container } = render(<SecaoConhecimento agent={AGENT} onMudou={() => {}} />)
    await waitFor(() => expect(api.listAgentKnowledge).toHaveBeenCalled())
    enviar(container, new File(['x'], 'planilha.xlsx'))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/não suportado/), 'error'))
    expect(api.addAgentKnowledge).not.toHaveBeenCalled()
  })
})
