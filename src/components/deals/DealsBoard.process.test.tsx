// F8 (SCRUM-869/870) — board por tipo de funil.
//   * process: contato como título, nenhum R$ na tela, terminais Concluído/
//     Cancelado, chip de origem, quem moveu, tempo na etapa e telefone
//   * sales: renderiza exatamente como antes (título, valor, ganho/perdido)
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))

import { DealsBoard } from './DealsBoard'
import type { Deal, Pipeline, PipelineStage } from '@/types'

const stage = (id: string, label: string, extra: Partial<PipelineStage> = {}): PipelineStage => ({
  id, tenantId: 't', pipelineId: 'p', key: id, label, color: '#6366f1', order: 0, isWon: false, isLost: false, ...extra,
})
const STAGES = [
  stage('s1', 'Enviado'),
  stage('s2', 'Respondeu'),
  stage('s3', 'Confirmado', { isWon: true }),
  stage('s4', 'Não confirmou', { isLost: true }),
]
const PROCESS: Pipeline = {
  id: 'p', tenantId: 't', name: 'Confirmação de consulta', color: '#14b8a6', order: 0, isDefault: false, isArchived: false,
  kind: 'process', terminalLabels: { won: 'Concluído', lost: 'Cancelado' }, stages: STAGES, openDealsCount: 2,
}
const SALES: Pipeline = { ...PROCESS, id: 'ps', name: 'Vendas', kind: 'sales', terminalLabels: { won: 'Ganho', lost: 'Perdido' } }

const NOW = Date.now()
const deal = (over: Partial<Deal>): Deal => ({
  id: 'd', contactId: 'c', title: 'Título do registro', status: 'open', pipelineId: 'p', stageId: 's1', amountCents: 15_000,
  contact: { id: 'c', displayName: 'Mariana Souza', profilePicUrl: null, phone: '(22) 9 9712-4410' },
  originKind: 'campaign', originLabel: 'Confirmação 28/08', lastMovedByKind: 'ai',
  stageEnteredAt: new Date(NOW - 3 * 3_600_000).toISOString(),
  ...over,
})

describe('DealsBoard — funil de PROCESSO (F8)', () => {
  it('título = contato, sem R$, terminais Concluído/Cancelado, origem + IA + tempo + telefone no card', () => {
    const onOpenContact = vi.fn()
    render(<DealsBoard stages={STAGES} dealsByStage={{ s1: [deal({})] }} onMoveStage={vi.fn()} pipeline={PROCESS} onOpenContact={onOpenContact} />)

    expect(screen.getByTestId('process-card-title')).toHaveTextContent('Mariana Souza')
    expect(screen.queryByText('Título do registro')).toBeNull()
    expect(document.body.textContent).not.toMatch(/R\$/)
    expect(screen.getByText('concluído')).toBeInTheDocument()
    expect(screen.getByText('cancelado')).toBeInTheDocument()
    expect(screen.queryByText('ganho')).toBeNull()
    expect(screen.getByTestId('process-card-origin')).toHaveTextContent('Campanha · Confirmação 28/08')
    expect(screen.getByText('IA')).toBeInTheDocument()
    expect(screen.getByTestId('process-card-time')).toHaveTextContent('3 h na etapa')
    expect(screen.getByText('(22) 9 9712-4410')).toBeInTheDocument()
    expect(screen.getAllByText('Nenhum registro').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByTestId('process-card-title'))
    expect(onOpenContact).toHaveBeenCalledWith('c')
  })

  it('selo "auto" para movimento por evento/automação; sem selo quando um humano moveu', () => {
    const { rerender } = render(
      <DealsBoard stages={STAGES} dealsByStage={{ s1: [deal({ lastMovedByKind: 'campaign' })] }} onMoveStage={vi.fn()} pipeline={PROCESS} />,
    )
    expect(screen.getByText('auto')).toBeInTheDocument()
    rerender(<DealsBoard stages={STAGES} dealsByStage={{ s1: [deal({ lastMovedByKind: 'user' })] }} onMoveStage={vi.fn()} pipeline={PROCESS} />)
    expect(screen.queryByText('auto')).toBeNull()
    expect(screen.queryByText('IA')).toBeNull()
  })

  it('registro fechado mostra "fechado há …" a partir de closedAt', () => {
    const closed = deal({ status: 'won', stageId: 's3', closedAt: new Date(NOW - 2 * 3_600_000).toISOString() })
    render(<DealsBoard stages={STAGES} dealsByStage={{ s3: [closed] }} onMoveStage={vi.fn()} pipeline={PROCESS} />)
    expect(screen.getByTestId('process-card-time')).toHaveTextContent('fechado há 2 h')
  })
})

describe('DealsBoard — funil de VENDA continua como antes (regressão)', () => {
  it('título do negócio, valor, total da coluna, chips ganho/perdido e linha do contato', () => {
    const sales = deal({ pipelineId: 'ps', amountCents: 15_000, lastMovedByKind: 'user' })
    render(<DealsBoard stages={STAGES} dealsByStage={{ s1: [sales] }} onMoveStage={vi.fn()} pipeline={SALES} />)
    const card = screen.getByText('Título do registro').closest('div')!
    expect(card).toBeInTheDocument()
    expect(screen.getAllByText('R$ 150,00').length).toBeGreaterThanOrEqual(1) // valor do card (+ total da coluna)
    expect(screen.getByText('ganho')).toBeInTheDocument()
    expect(screen.getByText('perdido')).toBeInTheDocument()
    expect(screen.queryByTestId('process-card-title')).toBeNull()
    expect(within(screen.getByText('Mariana Souza').closest('button')!).getByText('ver contato')).toBeInTheDocument()
    expect(screen.getAllByText('Nenhum negócio').length).toBeGreaterThan(0)
  })

  it('sem `pipeline` (chamador antigo) também renderiza como venda', () => {
    render(<DealsBoard stages={STAGES} dealsByStage={{ s1: [deal({})] }} onMoveStage={vi.fn()} />)
    expect(screen.getByText('Título do registro')).toBeInTheDocument()
    expect(screen.getByText('ganho')).toBeInTheDocument()
  })
})

// ─── D2 (SCRUM-935) — card de venda com dono/previsão/tempo/origem (F-FUNIL-11) ───
describe('DealsBoard — card de VENDA com dono, previsão, tempo na etapa e origem (F-FUNIL-11)', () => {
  it('mostra o dono resolvido via `users`, a previsão de fechamento e a origem', () => {
    const USERS = [{ id: 'u1', tenantId: 't', email: 'ana@x.com', firstName: 'Ana', lastName: 'Souza', role: 'agent', isActive: true }] as never
    const sales = deal({
      pipelineId: 'ps',
      ownerUserId: 'u1',
      expectedCloseAt: '2026-09-20T12:00:00.000Z', // meio-dia UTC — data estável em qualquer timezone do runner
      originKind: 'manual',
    })
    render(<DealsBoard stages={STAGES} dealsByStage={{ s1: [sales] }} onMoveStage={vi.fn()} pipeline={SALES} users={USERS} />)
    expect(screen.getByTestId('sales-card-owner')).toHaveTextContent('Ana Souza')
    expect(screen.getByTestId('sales-card-forecast')).toHaveTextContent('20/09')
    expect(screen.getByTestId('sales-card-origin')).toHaveTextContent('Manual')
    expect(screen.getByTestId('sales-card-time')).toHaveTextContent('3 h na etapa')
  })

  it('sem dono/previsão: "Sem dono" e "sem previsão" — nada inventado', () => {
    const sales = deal({ pipelineId: 'ps', ownerUserId: undefined, expectedCloseAt: undefined })
    render(<DealsBoard stages={STAGES} dealsByStage={{ s1: [sales] }} onMoveStage={vi.fn()} pipeline={SALES} />)
    expect(screen.getByTestId('sales-card-owner')).toHaveTextContent('Sem dono')
    expect(screen.getByTestId('sales-card-forecast')).toHaveTextContent('sem previsão')
  })
})

// ─── D2 (SCRUM-935) — faixa de contexto única (F-FUNIL-10) ────────────────────
describe('DealsBoard — UMA faixa de contexto (F-FUNIL-10)', () => {
  it('com `pipeline`, mostra tipo do funil, entradas, contagens e total numa faixa só', () => {
    const sales = deal({ pipelineId: 'ps', amountCents: 15_000, originKind: 'campaign', originLabel: 'Confirmação 28/08' })
    render(<DealsBoard stages={STAGES} dealsByStage={{ s1: [sales] }} onMoveStage={vi.fn()} pipeline={SALES} />)
    const strip = screen.getByTestId('board-context-strip')
    expect(strip).toHaveTextContent('Vendas')
    expect(within(strip).getByTestId('board-stats')).toHaveTextContent('1 aberto')
    expect(strip).toHaveTextContent('Entradas:')
    expect(strip).toHaveTextContent('campanha Confirmação 28/08')
  })

  it('sem `pipeline` (chamador antigo), não renderiza faixa nenhuma', () => {
    render(<DealsBoard stages={STAGES} dealsByStage={{ s1: [deal({})] }} onMoveStage={vi.fn()} />)
    expect(screen.queryByTestId('board-context-strip')).toBeNull()
  })
})

// ─── D2 (SCRUM-935) — "Mover ▾" por toque e clique no card abre a ficha (F-FUNIL-09) ───
describe('DealsBoard — "Mover ▾" por toque e clique no card (F-FUNIL-09)', () => {
  it('"Mover ▾" lista as OUTRAS etapas e chama onMoveStage — mesmo caminho do drag', () => {
    const onMoveStage = vi.fn()
    const sales = deal({ pipelineId: 'ps', stageId: 's1' })
    render(<DealsBoard stages={STAGES} dealsByStage={{ s1: [sales] }} onMoveStage={onMoveStage} pipeline={SALES} />)
    fireEvent.click(screen.getByRole('button', { name: /Mover .* para outra etapa/ }))
    // "Confirmado" aparece 2x (cabeçalho da coluna + opção do menu) — a opção é um <button>.
    fireEvent.click(screen.getByRole('button', { name: 'Confirmado' }))
    expect(onMoveStage).toHaveBeenCalledWith(sales, 's3')
  })

  it('clicar no CORPO do card chama onOpenDeal com o id do negócio', () => {
    const onOpenDeal = vi.fn()
    const sales = deal({ pipelineId: 'ps', id: 'deal-42' })
    render(<DealsBoard stages={STAGES} dealsByStage={{ s1: [sales] }} onMoveStage={vi.fn()} pipeline={SALES} onOpenDeal={onOpenDeal} />)
    fireEvent.click(screen.getByText('Título do registro'))
    expect(onOpenDeal).toHaveBeenCalledWith('deal-42')
  })

  it('clicar no chip do CONTATO não abre a ficha do negócio (abre o contato)', () => {
    const onOpenDeal = vi.fn()
    const onOpenContact = vi.fn()
    const sales = deal({ pipelineId: 'ps', id: 'deal-42' })
    render(
      <DealsBoard
        stages={STAGES}
        dealsByStage={{ s1: [sales] }}
        onMoveStage={vi.fn()}
        pipeline={SALES}
        onOpenDeal={onOpenDeal}
        onOpenContact={onOpenContact}
      />,
    )
    fireEvent.click(screen.getByText('Mariana Souza').closest('button')!)
    expect(onOpenContact).toHaveBeenCalledWith('c')
    expect(onOpenDeal).not.toHaveBeenCalled()
  })
})
