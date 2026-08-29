// F9 (SCRUM-877) — prancheta 4: resumo do registro existente, três saídas,
// confirmar só com o registro carregado; "mover para a 1ª etapa" some sem etapa normal.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PipelineConflictModal } from './PipelineConflictModal'
import type { Deal, Pipeline, PipelineStage } from '@/types'

const st = (id: string, label: string, extra: Partial<PipelineStage> = {}): PipelineStage => ({ id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#111', order: 0, isWon: false, isLost: false, ...extra })
const PIPE: Pipeline = {
  id: 'p', tenantId: 't', name: 'Suporte', color: '#14b8a6', order: 0, isDefault: false, isArchived: false, kind: 'process',
  terminalLabels: { won: 'Concluído', lost: 'Cancelado' }, openDealsCount: 1,
  stages: [st('s1', 'Novo chamado', { order: 0 }), st('s2', 'Aguardando cliente', { order: 1 }), st('s3', 'Concluído', { order: 2, isWon: true }), st('s4', 'Cancelado', { order: 3, isLost: true })],
}
const EXISTING: Deal = { id: 'd1', contactId: 'c', title: 'x', status: 'open', pipelineId: 'p', stageId: 's2', amountCents: 0, stageEnteredAt: new Date(Date.now() - 6 * 86_400_000).toISOString(), lastMovedByActorName: 'Renata C.' }

describe('PipelineConflictModal (F9)', () => {
  it('resume o registro existente e confirma a saída escolhida (default: abrir o existente)', async () => {
    const onChoose = vi.fn(async () => {})
    render(<PipelineConflictModal open onClose={vi.fn()} contactName="Mariana" pipeline={PIPE} existing={EXISTING} onChoose={onChoose} />)
    expect(screen.getByText('Já existe um registro aberto')).toBeInTheDocument()
    expect(screen.getByTestId('conflict-summary')).toHaveTextContent('Mariana já está em Suporte, na etapa Aguardando cliente (6 dias na etapa, aberto por Renata C.). O funil permite um registro aberto por contato.')
    expect(screen.getByTestId('conflict-open_existing')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('conflict-confirm')).toHaveTextContent('Abrir registro')
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    await waitFor(() => expect(onChoose).toHaveBeenCalledWith('open_existing'))
  })

  it('as outras duas saídas mudam o rótulo do botão e são enviadas', async () => {
    const onChoose = vi.fn(async () => {})
    render(<PipelineConflictModal open onClose={vi.fn()} contactName="Mariana" pipeline={PIPE} existing={EXISTING} onChoose={onChoose} />)
    fireEvent.click(screen.getByTestId('conflict-move_to_first'))
    expect(screen.getByTestId('conflict-move_to_first')).toHaveTextContent('Mover o existente para "Novo chamado"')
    expect(screen.getByTestId('conflict-confirm')).toHaveTextContent('Mover')
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    await waitFor(() => expect(onChoose).toHaveBeenLastCalledWith('move_to_first'))
    fireEvent.click(screen.getByTestId('conflict-close_and_new'))
    expect(screen.getByTestId('conflict-close_and_new')).toHaveTextContent('Fechar o existente como Cancelado e abrir um novo')
    fireEvent.click(screen.getByTestId('conflict-confirm'))
    await waitFor(() => expect(onChoose).toHaveBeenLastCalledWith('close_and_new'))
  })

  it('enquanto o registro existente não chegou, mostra loading e não deixa confirmar', () => {
    render(<PipelineConflictModal open onClose={vi.fn()} contactName="Mariana" pipeline={PIPE} existing={null} onChoose={vi.fn()} />)
    expect(screen.getByText(/Carregando o registro existente/)).toBeInTheDocument()
    expect(screen.getByTestId('conflict-confirm')).toBeDisabled()
  })
})
