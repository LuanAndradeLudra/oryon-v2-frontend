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

// ── A4 (SCRUM-926) ──────────────────────────────────────────────────────────
// Motivo único já escolhido, nota em Textarea, campo livre do D0-8 e o valor
// final em funil de venda.
const SALES: Pipeline = {
  ...PIPE, id: 'pv', name: 'Vendas', kind: 'sales', terminalLabels: { won: 'Ganho', lost: 'Perdido' },
  closeReasons: [
    { key: 'fechou', label: 'Fechou', outcome: 'won' },
    { key: 'preco', label: 'Preço', outcome: 'lost' },
    { key: 'outro', label: 'Outro', outcome: 'any' },
  ],
}
const SALES_WON = stage('sw', 'Ganho', { isWon: true })
const SALES_DEAL: Deal = { ...DEAL, pipelineId: 'pv', amountCents: 150000 }

describe('CloseDealReasonModal (A4 · SCRUM-926)', () => {
  it('catálogo com um único motivo já vem escolhido — confirmar habilitado de saída', () => {
    render(<CloseDealReasonModal open onClose={vi.fn()} deal={DEAL} stage={WON} pipeline={{ ...PIPE, closeReasons: undefined }} onConfirm={vi.fn(async () => {})} />)
    expect(screen.getByRole('combobox', { name: 'Motivo do desfecho' })).toHaveValue('outro')
    expect(screen.getByTestId('close-deal-confirm')).toBeEnabled()
  })

  it('a nota é um Textarea (2000 chars), não um Input de uma linha', () => {
    render(<CloseDealReasonModal open onClose={vi.fn()} deal={DEAL} stage={WON} pipeline={PIPE} onConfirm={vi.fn(async () => {})} />)
    const note = screen.getByLabelText('Observação do desfecho')
    expect(note.tagName).toBe('TEXTAREA')
    expect(note).toHaveAttribute('maxlength', '2000')
  })

  it('sem allowFreeCloseReason não há campo livre (lista fechada)', () => {
    render(<CloseDealReasonModal open onClose={vi.fn()} deal={SALES_DEAL} stage={SALES_WON} pipeline={SALES} onConfirm={vi.fn(async () => {})} />)
    expect(screen.queryByTestId('close-reason-free')).toBeNull()
  })

  it('com o interruptor ligado, o motivo livre vira "outro" + nota estruturada (D0-8)', async () => {
    const onConfirm = vi.fn(async () => {})
    render(
      <CloseDealReasonModal
        open onClose={vi.fn()} deal={SALES_DEAL} stage={SALES_WON}
        pipeline={{ ...SALES, allowFreeCloseReason: true }} onConfirm={onConfirm}
      />,
    )
    fireEvent.change(screen.getByTestId('close-reason-free'), { target: { value: 'Trocou de CNPJ' } })
    fireEvent.change(screen.getByLabelText('Observação do desfecho'), { target: { value: 'ver e-mail' } })
    fireEvent.click(screen.getByTestId('close-deal-confirm'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'won', reason: 'outro', note: 'Trocou de CNPJ — ver e-mail' }),
    ))
  })

  it('venda: valor final pré-preenchido; alterado, viaja no fechamento', async () => {
    const onConfirm = vi.fn(async () => {})
    render(<CloseDealReasonModal open onClose={vi.fn()} deal={SALES_DEAL} stage={SALES_WON} pipeline={SALES} onConfirm={onConfirm} />)
    const amount = screen.getByDisplayValue('1.500,00')
    fireEvent.change(amount, { target: { value: '120000' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Motivo do desfecho' }), { target: { value: 'fechou' } })
    fireEvent.click(screen.getByTestId('close-deal-confirm'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'fechou', amountCents: 120000 }),
    ))
  })

  it('venda com itens: o valor é a soma deles — mostrado, não editável (D4)', () => {
    const withItems: Deal = {
      ...SALES_DEAL,
      lineItems: [{ id: 'li', productId: 'p1', variationLabel: null, unitPriceCents: 150000, quantity: 1, discountCents: 0, order: 0 }],
    }
    render(<CloseDealReasonModal open onClose={vi.fn()} deal={withItems} stage={SALES_WON} pipeline={SALES} onConfirm={vi.fn(async () => {})} />)
    expect(screen.getByTestId('close-deal-amount-readonly')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('1.500,00')).toBeNull()
  })

  it('funil de processo não fala em dinheiro', () => {
    render(<CloseDealReasonModal open onClose={vi.fn()} deal={DEAL} stage={WON} pipeline={PIPE} onConfirm={vi.fn(async () => {})} />)
    expect(screen.queryByTestId('close-deal-amount-readonly')).toBeNull()
    expect(screen.queryByLabelText(/Valor final/i)).toBeNull()
  })
})
