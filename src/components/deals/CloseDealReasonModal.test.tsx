// F8 (SCRUM-872) — mini-modal de motivo ao mover para terminal: fechar sem
// motivo é impossível pela UI; o catálogo vem do funil, filtrado pelo desfecho.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CloseDealReasonModal } from './CloseDealReasonModal'
import type { Deal, Pipeline, PipelineStage } from '@/types'

const stage = (id: string, label: string, extra: Partial<PipelineStage> = {}): PipelineStage => ({
  id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#10b981', order: 0, isWon: false, isLost: false, ...extra,
})
const WON = stage('s3', 'Confirmado', { isWon: true })
const LOST = stage('s4', 'Não confirmou', { isLost: true })
const PIPE: Pipeline = {
  id: 'p', tenantId: 't', name: 'Confirmação', color: '#14b8a6', order: 0, isDefault: false, isArchived: false,
  kind: 'process', terminalLabels: { won: 'Concluído', lost: 'Cancelado' }, stages: [WON, LOST], openDealsCount: 0,
  closeReasons: [
    { key: 'concluido', label: 'Concluído', outcome: 'won' },
    { key: 'cancelado_pelo_cliente', label: 'Cancelado pelo cliente', outcome: 'lost' },
    { key: 'nao_compareceu', label: 'Não compareceu', outcome: 'lost' },
    { key: 'outro', label: 'Outro', outcome: 'any' },
  ],
}
const DEAL: Deal = { id: 'd', contactId: 'c', title: 'x', status: 'open', pipelineId: 'p', stageId: 's1', amountCents: 0, contact: { id: 'c', displayName: 'Mariana', profilePicUrl: null } }

const options = () => Array.from((screen.getByRole('combobox', { name: 'Motivo do desfecho' }) as HTMLSelectElement).options).map((o) => o.value)

describe('CloseDealReasonModal (F8)', () => {
  it('terminal Ganho: lista só motivos won/any; confirmar fica desabilitado até escolher; envia outcome+reason+note', async () => {
    const onConfirm = vi.fn(async () => {})
    const onClose = vi.fn()
    render(<CloseDealReasonModal open onClose={onClose} deal={DEAL} stage={WON} pipeline={PIPE} onConfirm={onConfirm} />)
    expect(screen.getByText('Confirmado — motivo')).toBeInTheDocument()
    expect(options()).toEqual(['', 'concluido', 'outro'])
    const confirm = screen.getByTestId('close-deal-confirm')
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveTextContent('Marcar como Concluído')

    fireEvent.change(screen.getByRole('combobox', { name: 'Motivo do desfecho' }), { target: { value: 'concluido' } })
    fireEvent.change(screen.getByPlaceholderText(/paciente confirmou/), { target: { value: 'por telefone' } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ outcome: 'won', reason: 'concluido', note: 'por telefone' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('terminal Perdido: motivos lost/any, botão de perigo "Marcar como Cancelado"', () => {
    render(<CloseDealReasonModal open onClose={vi.fn()} deal={DEAL} stage={LOST} pipeline={PIPE} onConfirm={vi.fn(async () => {})} />)
    expect(options()).toEqual(['', 'cancelado_pelo_cliente', 'nao_compareceu', 'outro'])
    expect(screen.getByTestId('close-deal-confirm')).toHaveTextContent('Marcar como Cancelado')
  })

  it('erro do backend aparece no formulário e o modal continua aberto', async () => {
    const onConfirm = vi.fn(async () => { throw { response: { data: { message: 'Motivo inválido para este tipo de funil.' } } } })
    const onClose = vi.fn()
    render(<CloseDealReasonModal open onClose={onClose} deal={DEAL} stage={WON} pipeline={PIPE} onConfirm={onConfirm} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Motivo do desfecho' }), { target: { value: 'outro' } })
    fireEvent.click(screen.getByTestId('close-deal-confirm'))
    await waitFor(() => expect(screen.getByText('Motivo inválido para este tipo de funil.')).toBeInTheDocument())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('funil sem catálogo (backend anterior ao épico) cai em "Outro"', () => {
    render(<CloseDealReasonModal open onClose={vi.fn()} deal={DEAL} stage={WON} pipeline={{ ...PIPE, closeReasons: undefined }} onConfirm={vi.fn(async () => {})} />)
    expect(options()).toEqual(['', 'outro'])
  })
})
