// F10 (SCRUM-882/880) — o hook por trás de "Resolvida": sem flag ou sem alvo,
// resolve como sempre (nenhuma chamada a /deals além da consulta do alvo); com
// alvo, abre o popover e, ao confirmar, grava o valor (venda) e resolve com o
// desfecho; "só resolver" resolve sem dealOutcome.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { api, multi } = vi.hoisted(() => ({
  api: { conversationTarget: vi.fn(), get: vi.fn(), update: vi.fn(), list: vi.fn(), linkConversation: vi.fn() },
  multi: vi.fn(() => true),
}))
vi.mock('@/services/api', () => ({ dealsApi: api }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => multi() }))

import { useResolveWithOutcome, DEALS_INVALIDATE_EVENT } from './useResolveWithOutcome'
import type { AiDealTargetView } from '@/types'

const TARGET: AiDealTargetView = {
  target: 'origin_conversation', dealId: 'd1', pipelineId: 'p', pipelineName: 'Vendas', pipelineKind: 'sales',
  terminalLabels: { won: 'Ganho', lost: 'Perdido' }, currentStageLabel: 'Em negociação', stages: [],
  closeReasons: { won: [{ key: 'fechou', label: 'Fechou' }], lost: [{ key: 'preco', label: 'Preço' }] },
}

function Harness({ onResolve }: { onResolve: (o?: unknown) => Promise<void> | void }) {
  const r = useResolveWithOutcome({ conversationId: 'conv-1', contactId: 'c1', onResolve })
  return (
    <>
      <button onClick={() => void r.requestResolve()}>resolver</button>
      <span data-testid="state">{r.loading ? 'loading' : r.target ? `target:${r.target.pipelineName}:${r.currentAmountCents}:${r.hasLineItems ? 'items' : 'manual'}` : 'idle'}</span>
      <button onClick={() => void r.confirm({ dealOutcome: { outcome: 'won', reason: 'fechou' }, amountCents: 12990 })}>confirmar-com-valor</button>
      <button onClick={() => void r.confirm({})}>so-resolver</button>
    </>
  )
}

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
  multi.mockReturnValue(true)
  api.get.mockResolvedValue({ data: { id: 'd1', amountCents: 5000 } })
  api.update.mockResolvedValue({ data: {} })
  // Sem ambiguidade por padrão: `no_target` significa "não tem negócio".
  api.list.mockResolvedValue({ data: [] })
  api.linkConversation.mockResolvedValue({ data: {} })
})

describe('useResolveWithOutcome (F10)', () => {
  it('sem o flag: resolve direto, sem consultar o alvo', async () => {
    multi.mockReturnValue(false)
    const onResolve = vi.fn()
    render(<Harness onResolve={onResolve} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith())
    expect(api.conversationTarget).not.toHaveBeenCalled()
  })

  it('no_target: resolve como hoje e não abre o popover', async () => {
    api.conversationTarget.mockResolvedValue({ data: { target: 'no_target', stages: [] } })
    const onResolve = vi.fn()
    render(<Harness onResolve={onResolve} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith())
    expect(screen.getByTestId('state')).toHaveTextContent('idle')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('erro ao consultar o alvo (backend antigo): resolve como hoje', async () => {
    api.conversationTarget.mockRejectedValue(new Error('404'))
    const onResolve = vi.fn()
    render(<Harness onResolve={onResolve} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith())
  })

  it('com alvo em venda: abre com o valor atual; confirmar grava o valor e resolve com o desfecho', async () => {
    api.conversationTarget.mockResolvedValue({ data: TARGET })
    const onResolve = vi.fn()
    const listener = vi.fn()
    window.addEventListener(DEALS_INVALIDATE_EVENT, listener)
    render(<Harness onResolve={onResolve} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('target:Vendas:5000'))
    expect(onResolve).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('confirmar-com-valor'))
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('d1', { amountCents: 12990 }))
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith({ outcome: 'won', reason: 'fechou' }))
    expect(listener).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'))
    window.removeEventListener(DEALS_INVALIDATE_EVENT, listener)
  })

  it('B4 (SCRUM-930): negócio com itens de linha expõe hasLineItems=true', async () => {
    api.conversationTarget.mockResolvedValue({ data: TARGET })
    api.get.mockResolvedValue({ data: { id: 'd1', amountCents: 5000, lineItems: [{ id: 'li1' }] } })
    render(<Harness onResolve={vi.fn()} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('target:Vendas:5000:items'))
  })

  it('B4 (SCRUM-930): negócio sem itens (manual) expõe hasLineItems=false', async () => {
    api.conversationTarget.mockResolvedValue({ data: TARGET })
    render(<Harness onResolve={vi.fn()} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('target:Vendas:5000:manual'))
  })

  it('"só resolver": resolve sem dealOutcome e sem PATCH no registro', async () => {
    api.conversationTarget.mockResolvedValue({ data: { ...TARGET, pipelineKind: 'process' } })
    const onResolve = vi.fn()
    render(<Harness onResolve={onResolve} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('target:Vendas:null'))
    expect(api.get).not.toHaveBeenCalled() // processo: valor não se aplica
    fireEvent.click(screen.getByText('so-resolver'))
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(undefined))
    expect(api.update).not.toHaveBeenCalled()
  })
})

// C2 (SCRUM-933) — `no_target` tem duas causas e elas pedem respostas
// opostas: sem negócio nenhum, resolver calado; com N abertos e nenhum
// vinculado (multiplicidade da C1), perguntar em qual registrar o desfecho.
describe('useResolveWithOutcome — ambiguidade de N abertos (C2)', () => {
  const OPEN = [
    { id: 'd1', contactId: 'c1', title: 'Site institucional', status: 'open', pipelineId: 'p', stageId: 's', amountCents: 1500000 },
    { id: 'd2', contactId: 'c1', title: 'Manutenção mensal', status: 'open', pipelineId: 'p', stageId: 's', amountCents: 40000 },
  ]

  function PickerHarness({ onResolve }: { onResolve: (o?: unknown) => Promise<void> | void }) {
    const r = useResolveWithOutcome({ conversationId: 'conv-1', contactId: 'c1', onResolve })
    return (
      <>
        <button onClick={() => void r.requestResolve()}>resolver</button>
        <span data-testid="cands">{r.candidates ? r.candidates.map((c) => c.id).join(',') : 'none'}</span>
        <span data-testid="target">{r.target ? r.target.pipelineName : 'sem-alvo'}</span>
        <button onClick={() => void r.pickCandidate('d2')}>escolher-d2</button>
      </>
    )
  }

  it('no_target com 2 abertos e nenhum vinculado: oferece a escolha em vez de resolver', async () => {
    const onResolve = vi.fn()
    api.conversationTarget.mockResolvedValue({ data: { target: 'no_target' } })
    api.list.mockResolvedValue({ data: OPEN })
    render(<PickerHarness onResolve={onResolve} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(screen.getByTestId('cands')).toHaveTextContent('d2,d1'))
    expect(onResolve).not.toHaveBeenCalled()
  })

  it('no_target sem negócio nenhum: resolve como sempre, sem perguntar nada', async () => {
    const onResolve = vi.fn()
    api.conversationTarget.mockResolvedValue({ data: { target: 'no_target' } })
    api.list.mockResolvedValue({ data: [] })
    render(<PickerHarness onResolve={onResolve} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(onResolve).toHaveBeenCalled())
    expect(screen.getByTestId('cands')).toHaveTextContent('none')
  })

  it('no_target com UM aberto só: não é ambiguidade — resolve como sempre', async () => {
    const onResolve = vi.fn()
    api.conversationTarget.mockResolvedValue({ data: { target: 'no_target' } })
    api.list.mockResolvedValue({ data: [OPEN[0]] })
    render(<PickerHarness onResolve={onResolve} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(onResolve).toHaveBeenCalled())
    expect(screen.getByTestId('cands')).toHaveTextContent('none')
  })

  it('escolher grava o vínculo e segue para o desfecho no negócio escolhido', async () => {
    const onResolve = vi.fn()
    api.conversationTarget.mockResolvedValueOnce({ data: { target: 'no_target' } })
    api.list.mockResolvedValue({ data: OPEN })
    render(<PickerHarness onResolve={onResolve} />)
    fireEvent.click(screen.getByText('resolver'))
    await waitFor(() => expect(screen.getByTestId('cands')).toHaveTextContent('d2,d1'))

    api.conversationTarget.mockResolvedValueOnce({ data: { ...TARGET, dealId: 'd2' } })
    fireEvent.click(screen.getByText('escolher-d2'))
    await waitFor(() => expect(screen.getByTestId('target')).toHaveTextContent('Vendas'))
    expect(api.linkConversation).toHaveBeenCalledWith('d2', 'conv-1')
    // O popover de desfecho assume o alvo — a lista de candidatos sai da tela.
    expect(screen.getByTestId('cands')).toHaveTextContent('none')
    expect(onResolve).not.toHaveBeenCalled()
  })
})
