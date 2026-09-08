// F10 (SCRUM-880/881/882/883) — prancheta 5: três saídas, motivo do catálogo por
// tipo, valor só em venda + fechou, "Só resolver" mantém o registro aberto,
// vocabulário de processo, Esc fecha, foco inicial na 1ª opção.
//
// B4 (SCRUM-930): o campo de valor vira "Confirmar valor" — editável (modo
// manual, sem itens) ou somente leitura com "ajustar itens" (modo items).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { openDeal } = vi.hoisted(() => ({ openDeal: vi.fn() }))
vi.mock('@/contexts/DealPanelContext', () => ({ useDealPanel: () => ({ openDeal }) }))

import { ResolveOutcomePanel, ResolveOutcomePopover } from './ResolveOutcomePopover'
import { formatCentsBRL } from '@/lib/resolveOutcome'
import type { AiDealTargetView } from '@/types'

const SALES: AiDealTargetView = {
  target: 'origin_conversation', dealId: 'd1', pipelineId: 'p', pipelineName: 'Vendas', pipelineKind: 'sales',
  terminalLabels: { won: 'Ganho', lost: 'Perdido' }, currentStageKey: 'em-negociacao', currentStageLabel: 'Em negociação', stages: [],
  closeReasons: { won: [{ key: 'fechou', label: 'Fechou' }], lost: [{ key: 'preco', label: 'Preço' }, { key: 'outro', label: 'Outro' }] },
}
const PROCESS: AiDealTargetView = {
  ...SALES, pipelineName: 'Suporte', pipelineKind: 'process', terminalLabels: { won: 'Concluído', lost: 'Cancelado' }, currentStageLabel: 'Em atendimento',
  closeReasons: { won: [{ key: 'concluido', label: 'Concluído' }], lost: [{ key: 'cancelado_pelo_cliente', label: 'Cancelado pelo cliente' }, { key: 'outro', label: 'Outro' }] },
}

function setup(target = SALES, extra: Partial<React.ComponentProps<typeof ResolveOutcomePanel>> = {}) {
  const onConfirm = vi.fn(async () => {})
  const onCancel = vi.fn()
  render(<ResolveOutcomePanel target={target} contactName="Mariana" currentAmountCents={5000} hasLineItems={false} busy={false} onConfirm={onConfirm} onCancel={onCancel} {...extra} />)
  return { onConfirm, onCancel }
}

describe('ResolveOutcomePanel (F10)', () => {
  it('venda: "Fechou" vem selecionado, motivo único já escolhido, valor pré-preenchido; confirmar manda desfecho + valor novo', async () => {
    const { onConfirm } = setup()
    expect(screen.getByTestId('resolve-summary')).toHaveTextContent('Mariana está em Vendas · Em negociação')
    expect(screen.getByTestId('resolve-won')).toBeChecked()
    await waitFor(() => expect(screen.getByTestId('resolve-won')).toHaveFocus())
    expect(screen.getByTestId('resolve-reason-select')).toHaveValue('fechou')
    expect(screen.getByTestId('resolve-amount')).toHaveValue('50,00')
    expect(screen.getByTestId('resolve-confirm')).toHaveTextContent('Resolver e marcar Ganho')
    fireEvent.change(screen.getByTestId('resolve-amount'), { target: { value: '129,90' } })
    fireEvent.change(screen.getByLabelText('Observação do desfecho'), { target: { value: 'Adesão ao plano Família' } })
    fireEvent.click(screen.getByTestId('resolve-confirm'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({
      dealOutcome: { outcome: 'won', reason: 'fechou', note: 'Adesão ao plano Família' },
      amountCents: 12990,
    }))
  })

  it('B4 (SCRUM-930): modo manual (sem itens) — "Confirmar valor" pré-preenchido e editável', () => {
    setup(SALES, { hasLineItems: false })
    const input = screen.getByTestId('resolve-amount')
    expect(input).toHaveValue('50,00')
    expect(input).not.toHaveAttribute('readonly')
    expect(screen.queryByTestId('resolve-adjust-items')).toBeNull()
  })

  it('B4 (SCRUM-930): modo items (negócio com itens) — "Confirmar valor" pré-preenchido, somente leitura, com "ajustar itens"', async () => {
    const { onConfirm } = setup(SALES, { hasLineItems: true })
    const input = screen.getByTestId('resolve-amount')
    expect(input).toHaveValue(formatCentsBRL(5000))
    expect(input).toHaveAttribute('readonly')
    fireEvent.click(screen.getByTestId('resolve-adjust-items'))
    expect(openDeal).toHaveBeenCalledWith('d1')
    // Confirmar sem editar não manda amountCents — a ficha é quem soma os itens.
    fireEvent.click(screen.getByTestId('resolve-confirm'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({
      dealOutcome: { outcome: 'won', reason: 'fechou', note: undefined },
    }))
  })

  it('"Não fechou": motivos de perda, sem campo de valor, exige motivo; "Preço" → dealOutcome lost', async () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByTestId('resolve-lost'))
    expect(screen.queryByTestId('resolve-amount')).toBeNull()
    expect(screen.getByTestId('resolve-confirm')).toHaveTextContent('Resolver e marcar Perdido')
    fireEvent.click(screen.getByTestId('resolve-confirm'))
    expect(screen.getByText('Escolha um motivo.')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.change(screen.getByTestId('resolve-reason-select'), { target: { value: 'preco' } })
    fireEvent.click(screen.getByTestId('resolve-confirm'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ dealOutcome: { outcome: 'lost', reason: 'preco', note: undefined } }))
  })

  it('"Sem decisão" esconde motivo/valor e deixa só "Só resolver" → payload vazio (registro segue aberto)', async () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByTestId('resolve-none'))
    expect(screen.queryByTestId('resolve-reason-select')).toBeNull()
    expect(screen.queryByTestId('resolve-confirm')).toBeNull()
    fireEvent.click(screen.getByTestId('resolve-only'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({}))
  })

  it('"Só resolver" com "Fechou" marcado também resolve sem desfecho', async () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByTestId('resolve-only'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({}))
  })

  it('processo: vocabulário "Concluiu / Não concluiu", terminais Concluído/Cancelado, nunca pede valor', () => {
    setup(PROCESS, { currentAmountCents: null })
    expect(screen.getByText('Concluiu')).toBeInTheDocument()
    expect(screen.getByText('Não concluiu')).toBeInTheDocument()
    expect(screen.queryByTestId('resolve-amount')).toBeNull()
    expect(screen.getByTestId('resolve-confirm')).toHaveTextContent('Resolver e marcar Concluído')
    fireEvent.click(screen.getByTestId('resolve-lost'))
    expect(screen.getByTestId('resolve-confirm')).toHaveTextContent('Resolver e marcar Cancelado')
  })

  it('erro da API aparece inline; Esc chama onCancel', async () => {
    const onConfirm = vi.fn(async () => { throw { response: { status: 400, data: { message: 'Motivo de desfecho inválido para este tipo de funil.' } } } })
    const onCancel = vi.fn()
    render(<ResolveOutcomePanel target={SALES} contactName="Mariana" currentAmountCents={0} hasLineItems={false} busy={false} onConfirm={onConfirm} onCancel={onCancel} />)
    fireEvent.click(screen.getByTestId('resolve-confirm'))
    await waitFor(() => expect(screen.getByText('Motivo de desfecho inválido para este tipo de funil.')).toBeInTheDocument())
    fireEvent.keyDown(screen.getByTestId('resolve-outcome-panel'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('ResolveOutcomePopover (F10-883)', () => {
  it('não renderiza sem alvo; desktop = dialog ancorado; mobile = bottom sheet', () => {
    const base = { contactName: 'Mariana', currentAmountCents: 0, hasLineItems: false, busy: false, onConfirm: vi.fn(async () => {}), onCancel: vi.fn() }
    const { rerender, container } = render(<ResolveOutcomePopover open mobile={false} target={null} {...base} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<ResolveOutcomePopover open mobile={false} target={SALES} {...base} />)
    expect(screen.getByRole('dialog', { name: 'Resolver com desfecho' })).toBeInTheDocument()
    rerender(<ResolveOutcomePopover open mobile target={SALES} {...base} />)
    expect(screen.getByTestId('resolve-outcome-panel')).toBeInTheDocument()
  })
})
