// Funil de processo fechado na CRIAÇÃO (`FEATURE_FLAGS.processPipelines`).
//
// Sem mock de flags: este arquivo roda com a configuração que vai para o
// produto. O que ele fixa é a distinção que a flag precisa manter — fecha a
// porta de ENTRADA sem apagar o dicionário de LEITURA:
//   * criando, o campo "Tipo" some e o funil nasce `sales`
//   * editando um funil de processo que já existe, o tipo dele continua
//     visível e declarado (o registro legado não vira órfão)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockTemplates = vi.fn()
vi.mock('@/services/api', () => ({
  pipelinesApi: { templates: (...args: unknown[]) => mockTemplates(...args) },
}))
vi.mock('@/services/companyContextService', () => ({
  loadHubAsync: async () => ({
    companyName: 'Clínica Serra', industry: 'Saúde', businessType: [],
    teamSize: '', description: '', productsServices: '',
  }),
}))
vi.mock('@/services/anthropicService', () => ({
  businessContextFromHub: (hub: unknown) => hub,
  generateCRMConfig: vi.fn(),
  parseStreamResult: async () => ({ stages: [], customFields: [] }),
}))

import { CreatePipelineModal, type CreatePipelineData } from './CreatePipelineModal'
import { CREATABLE_PIPELINE_KIND_OPTIONS, PIPELINE_KIND_OPTIONS, pipelineKindOption } from '@/lib/pipelineKinds'
import type { Pipeline, PipelineTemplate } from '@/types'

const TEMPLATES: PipelineTemplate[] = [
  { key: 'vendas-padrao', kind: 'sales', name: 'Vendas padrão', description: '', isDefault: true, stages: [
    { key: 'novo', label: 'Novo', color: '#6366f1' },
    { key: 'ganho', label: 'Ganho', color: '#10b981', isWon: true },
    { key: 'perdido', label: 'Perdido', color: '#ef4444', isLost: true },
  ] },
  { key: 'suporte', kind: 'process', name: 'Suporte', description: '', isDefault: true, stages: [
    { key: 'novo', label: 'Novo', color: '#6366f1' },
    { key: 'concluido', label: 'Concluído', color: '#10b981', isWon: true },
    { key: 'cancelado', label: 'Cancelado', color: '#ef4444', isLost: true },
  ] },
]

beforeEach(() => {
  mockTemplates.mockReset().mockResolvedValue({ data: TEMPLATES })
})

describe('funil de processo fechado na criação', () => {
  it('o dicionário de leitura continua completo — só a lista de escolha encolhe', () => {
    expect(CREATABLE_PIPELINE_KIND_OPTIONS.map((o) => o.kind)).toEqual(['sales'])
    // O vocabulário de processo tem de continuar resolvendo: é ele que nomeia
    // os registros dos funis que já existem.
    expect(PIPELINE_KIND_OPTIONS.map((o) => o.kind)).toEqual(['sales', 'process'])
    expect(pipelineKindOption('process').terminalLabels).toEqual({ won: 'Concluído', lost: 'Cancelado' })
    expect(pipelineKindOption('process').noun).toBe('registro')
  })

  it('criando: o campo "Tipo" não aparece e o funil sai como venda', async () => {
    const onSave = vi.fn<(d: CreatePipelineData) => Promise<void>>(async () => {})
    render(<CreatePipelineModal open onClose={vi.fn()} onSave={onSave} />)
    await waitFor(() => expect(screen.getByRole('list', { name: 'Etapas do funil' })).toBeInTheDocument())

    expect(screen.queryByRole('radiogroup', { name: 'Tipo do funil' })).toBeNull()
    expect(screen.queryByTestId('pipeline-kind-process')).toBeNull()
    expect(screen.queryByTestId('pipeline-kind-sales')).toBeNull()

    // E só os modelos de venda são oferecidos.
    const select = screen.getByRole('combobox', { name: 'Modelo de etapas' }) as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['vendas-padrao', '__ai__'])

    fireEvent.change(screen.getByPlaceholderText('Ex: Suporte, Renovação, Pós-venda'), { target: { value: 'Comercial' } })
    fireEvent.click(screen.getByTestId('create-pipeline-submit'))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({ name: 'Comercial', kind: 'sales' })
  })

  it('editando um funil de processo já existente, o tipo dele continua declarado', async () => {
    const PIPE: Pipeline = {
      id: 'p1', tenantId: 't', name: 'Onboarding', color: '#14b8a6', order: 0, isDefault: false, isArchived: false,
      kind: 'process', terminalLabels: { won: 'Concluído', lost: 'Cancelado' }, stages: [], openDealsCount: 0,
    }
    render(<CreatePipelineModal open onClose={vi.fn()} onSave={vi.fn(async () => {})} editPipeline={PIPE} />)

    expect(screen.getByTestId('pipeline-kind-process')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('pipeline-kind-sales')).toBeDisabled()
  })
})
