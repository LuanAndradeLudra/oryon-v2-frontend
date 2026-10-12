// Direção C · Lista de negócios (27/09): mesmas linhas do recorte do quadro,
// ordenação por coluna, somas no rodapé e ações em lote.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { DealsList } from './DealsList'
import type { Deal, Pipeline, PipelineStage, User } from '@/types'

const stage = (id: string, label: string, order: number, extra: Partial<PipelineStage> = {}): PipelineStage => ({
  id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#6366f1', order, isWon: false, isLost: false, ...extra,
})
const STAGES = [stage('s1', 'Novo', 0, { probability: 50 }), stage('s2', 'Proposta', 1), stage('s3', 'Ganho', 2, { isWon: true })]
const PIPE: Pipeline = {
  id: 'p', tenantId: 't', name: 'Vendas', color: '#8b5cf6', order: 0, isDefault: true, isArchived: false,
  kind: 'sales', stages: STAGES, openDealsCount: 2,
}
const OUTRO: Pipeline = { ...PIPE, id: 'p2', name: 'Pós-venda', isDefault: false }
const USERS: User[] = [{ id: 'u1', firstName: 'Ana', lastName: 'Lima' } as User]
const deal = (over: Partial<Deal>): Deal => ({
  id: 'd', contactId: 'c', title: 'Consulta', status: 'open', pipelineId: 'p', stageId: 's1', amountCents: 10_000,
  contact: { id: 'c', displayName: 'Marina Alves', profilePicUrl: null, phone: null }, ...over,
})
const DEALS = [
  deal({ id: 'a', title: 'Pacote', stageId: 's2', amountCents: 38_000 }),
  deal({ id: 'b', title: 'Consulta', stageId: 's1', amountCents: 15_000, ownerUserId: 'u1' }),
]

function renderList(over: Partial<Parameters<typeof DealsList>[0]> = {}) {
  const props = {
    stages: STAGES, deals: DEALS, users: USERS, pipeline: PIPE, pipelines: [PIPE, OUTRO],
    sort: 'etapa' as const, sortDesc: false, onSort: vi.fn(), onOpenDeal: vi.fn(),
    onBulkOwner: vi.fn(async () => {}), onBulkStage: vi.fn(async () => {}), onBulkPipeline: vi.fn(async () => {}),
    ...over,
  }
  render(<DealsList {...props} />)
  return props
}

describe('DealsList', () => {
  it('ordena pela etapa do funil e soma valor e ponderado no rodapé', () => {
    renderList()
    const rows = screen.getAllByTestId('deals-list-row')
    expect(within(rows[0]).getByText('Consulta')).toBeInTheDocument() // etapa Novo vem antes de Proposta
    const foot = screen.getByText('2 negócios').closest('tr')!
    expect(foot).toHaveTextContent('R$ 530,00')
    // ponderado: 150 × 50% + 380 × 100% (sem probabilidade) = 455
    expect(foot).toHaveTextContent('R$ 455,00')
  })

  it('clicar no cabeçalho pede a ordenação da coluna', () => {
    const p = renderList()
    fireEvent.click(screen.getByRole('button', { name: /Valor/ }))
    expect(p.onSort).toHaveBeenCalledWith('valor')
  })

  it('clicar na linha abre a ficha; a caixa de seleção não', () => {
    const p = renderList()
    const row = screen.getAllByTestId('deals-list-row')[0]
    fireEvent.click(within(row).getByRole('checkbox'))
    expect(p.onOpenDeal).not.toHaveBeenCalled()
    fireEvent.click(row)
    expect(p.onOpenDeal).toHaveBeenCalledWith('b')
  })

  it('selecionar mostra as ações em lote e trocar responsável envia os marcados', async () => {
    const p = renderList()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todos' }))
    const bar = screen.getByTestId('deals-list-bulk')
    expect(bar).toHaveTextContent('2 selecionados')
    fireEvent.click(within(bar).getByRole('button', { name: /Trocar responsável/ }))
    fireEvent.click(screen.getByText('Ana Lima'))
    await waitFor(() => expect(p.onBulkOwner).toHaveBeenCalled())
    const [enviados, dono] = (p.onBulkOwner as ReturnType<typeof vi.fn>).mock.calls[0]
    expect((enviados as Deal[]).map((d) => d.id).sort()).toEqual(['a', 'b'])
    expect(dono).toBe('u1')
  })

  it('mover em lote só oferece etapas abertas (fechar pede motivo, um a um)', () => {
    renderList()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todos' }))
    fireEvent.click(screen.getByRole('button', { name: /Mover de etapa/ }))
    expect(screen.getByRole('menuitem', { name: /Proposta/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Ganho/ })).toBeNull()
  })
})
