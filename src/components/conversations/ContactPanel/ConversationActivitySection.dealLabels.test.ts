// SCRUM-980 — visualForActionKey's deal_won/deal_lost cases hardcoded
// "ganho"/"perdido" regardless of pipeline kind. A funil de PROCESSO fecha
// em "Concluído"/"Cancelado", não em "ganho"/"perdido" — o rótulo agora lê
// metadata.pipelineKind (SCRUM-980) e resolve via pipelineKindOption,
// igual ao vocabulário que o backend já usa (terminalLabelsFor).
import { describe, it, expect } from 'vitest'
import { visualForActionKey } from './ConversationActivitySection'

describe('visualForActionKey — deal_won / deal_lost terminal labels (SCRUM-980)', () => {
  it('sales pipeline keeps the existing "ganho"/"perdido" vocabulary', () => {
    expect(visualForActionKey('deal_won', { dealTitle: 'Plano Anual', pipelineKind: 'sales' }).label)
      .toBe('Negócio "Plano Anual" ganho')
    expect(visualForActionKey('deal_lost', { dealTitle: 'Plano Anual', pipelineKind: 'sales' }).label)
      .toBe('Negócio "Plano Anual" perdido')
  })

  it('process pipeline uses "concluído"/"cancelado", not "ganho"/"perdido"', () => {
    expect(visualForActionKey('deal_won', { dealTitle: 'Chamado #42', pipelineKind: 'process' }).label)
      .toBe('Negócio "Chamado #42" concluído')
    expect(visualForActionKey('deal_lost', { dealTitle: 'Chamado #42', pipelineKind: 'process' }).label)
      .toBe('Negócio "Chamado #42" cancelado')
  })

  it('missing pipelineKind (backend anterior ao épico) defaults to sales vocabulary', () => {
    expect(visualForActionKey('deal_won', { dealTitle: 'X' }).label).toBe('Negócio "X" ganho')
  })

  it('deal_won still appends the amount when present, regardless of kind', () => {
    expect(visualForActionKey('deal_won', { dealTitle: 'X', pipelineKind: 'sales', amountCents: 150000 }).label)
      .toContain('R$')
  })
})
