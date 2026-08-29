// F10 (SCRUM-881) — motivo do catálogo por tipo e valor opcional em venda.
import { describe, it, expect } from 'vitest'
import {
  decisionOptions, reasonsFor, amountApplies, confirmLabel, parseBrlToCents, formatCentsBRL, buildResolvePayload,
} from './resolveOutcome'
import type { AiDealTargetView } from '@/types'

const SALES: AiDealTargetView = {
  target: 'origin_conversation', dealId: 'd1', pipelineId: 'p', pipelineName: 'Vendas', pipelineKind: 'sales',
  terminalLabels: { won: 'Ganho', lost: 'Perdido' }, currentStageKey: 'em-negociacao', currentStageLabel: 'Em negociação',
  stages: [], closeReasons: { won: [{ key: 'fechou', label: 'Fechou' }], lost: [{ key: 'preco', label: 'Preço' }, { key: 'outro', label: 'Outro' }] },
}
const PROCESS: AiDealTargetView = {
  ...SALES, pipelineName: 'Suporte', pipelineKind: 'process', terminalLabels: { won: 'Concluído', lost: 'Cancelado' }, currentStageLabel: 'Em atendimento',
  closeReasons: { won: [{ key: 'concluido', label: 'Concluído' }], lost: [{ key: 'cancelado_pelo_cliente', label: 'Cancelado pelo cliente' }] },
}

describe('resolveOutcome (F10)', () => {
  it('opções e rótulos seguem o vocabulário do tipo', () => {
    expect(decisionOptions(SALES).map((o) => o.label)).toEqual(['Fechou', 'Não fechou', 'Sem decisão'])
    expect(decisionOptions(PROCESS).map((o) => o.label)).toEqual(['Concluiu', 'Não concluiu', 'Sem decisão'])
    expect(decisionOptions(PROCESS)[2].hint).toContain('Em atendimento')
    expect(confirmLabel(SALES, 'won')).toBe('Resolver e marcar Ganho')
    expect(confirmLabel(PROCESS, 'lost')).toBe('Resolver e marcar Cancelado')
    expect(confirmLabel(SALES, 'none')).toBe('Só resolver')
  })

  it('motivos vêm do catálogo do tipo, por desfecho; sem catálogo → "Outro"', () => {
    expect(reasonsFor(SALES, 'lost').map((r) => r.key)).toEqual(['preco', 'outro'])
    expect(reasonsFor(PROCESS, 'won').map((r) => r.key)).toEqual(['concluido'])
    expect(reasonsFor(SALES, 'none')).toEqual([])
    expect(reasonsFor({ ...SALES, closeReasons: undefined }, 'won')).toEqual([{ key: 'outro', label: 'Outro' }])
  })

  it('valor só em venda + fechou', () => {
    expect(amountApplies(SALES, 'won')).toBe(true)
    expect(amountApplies(SALES, 'lost')).toBe(false)
    expect(amountApplies(PROCESS, 'won')).toBe(false)
  })

  it('parseBrlToCents aceita os formatos comuns e rejeita lixo', () => {
    expect(parseBrlToCents('129')).toBe(12900)
    expect(parseBrlToCents('129,90')).toBe(12990)
    expect(parseBrlToCents('R$ 1.290,50')).toBe(129050)
    expect(parseBrlToCents('1290.5')).toBe(129050)
    expect(parseBrlToCents('1.290')).toBe(129000)
    expect(parseBrlToCents('')).toBeNull()
    expect(parseBrlToCents('abc')).toBeNaN()
    expect(formatCentsBRL(12990)).toMatch(/129,90/)
  })

  it('buildResolvePayload: sem decisão → sem dealOutcome; fechou em venda com valor novo → amountCents', () => {
    expect(buildResolvePayload({ target: SALES, decision: 'none', reason: '', note: '', amountRaw: '', currentAmountCents: 0 }))
      .toEqual({ payload: {} })
    expect(buildResolvePayload({ target: SALES, decision: 'won', reason: '', note: '', amountRaw: '', currentAmountCents: 0 }))
      .toEqual({ error: 'Escolha um motivo.' })
    expect(buildResolvePayload({ target: SALES, decision: 'won', reason: 'fechou', note: ' Plano Família ', amountRaw: '129,90', currentAmountCents: 0 }))
      .toEqual({ payload: { dealOutcome: { outcome: 'won', reason: 'fechou', note: 'Plano Família' }, amountCents: 12990 } })
    // valor igual ao atual não gera PATCH
    expect(buildResolvePayload({ target: SALES, decision: 'won', reason: 'fechou', note: '', amountRaw: '129,90', currentAmountCents: 12990 }))
      .toEqual({ payload: { dealOutcome: { outcome: 'won', reason: 'fechou', note: undefined } } })
    expect(buildResolvePayload({ target: SALES, decision: 'won', reason: 'fechou', note: '', amountRaw: 'x', currentAmountCents: 0 }))
      .toEqual({ error: 'Valor inválido — use 129,90.' })
    // perdeu / processo: valor ignorado mesmo se digitado
    expect(buildResolvePayload({ target: PROCESS, decision: 'won', reason: 'concluido', note: '', amountRaw: '50', currentAmountCents: 0 }))
      .toEqual({ payload: { dealOutcome: { outcome: 'won', reason: 'concluido', note: undefined } } })
  })
})
