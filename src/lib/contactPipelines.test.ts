// F11 (SCRUM-884/885/886) — chips por registro aberto, stepper, ordenação e "movido por".
import { describe, it, expect } from 'vitest'
import { openPipelineChips, stepperFor, splitDeals, movedByLabel, moveTargets } from './contactPipelines'
import type { Deal, Pipeline, PipelineStage } from '@/types'

const st = (id: string, label: string, order: number, extra: Partial<PipelineStage> = {}): PipelineStage => ({ id, tenantId: 't', pipelineId: 'p', key: id, label, color: `#${id}`, order, isWon: false, isLost: false, ...extra })
const SUPORTE: Pipeline = {
  id: 'p', tenantId: 't', name: 'Suporte', color: '#14b8a6', order: 0, isDefault: false, isArchived: false, kind: 'process', openDealsCount: 0,
  stages: [st('s3', 'Concluído', 3, { isWon: true }), st('s1', 'Novo', 1), st('s2', 'Em atendimento', 2), st('s4', 'Cancelado', 4, { isLost: true })],
}
const VENDAS: Pipeline = { ...SUPORTE, id: 'v', name: 'Vendas', kind: undefined }
const base: Deal = { id: 'd', contactId: 'c', title: 'x', status: 'open', pipelineId: 'p', stageId: 's2', amountCents: 0 }

describe('contactPipelines (F11)', () => {
  it('openPipelineChips: um chip por funil com registro aberto, com tipo e etapa', () => {
    const chips = openPipelineChips([
      { pipelineId: 'p', pipelineName: 'Suporte', pipelineColor: '#000', count: 2, openCount: 1, wonCount: 1, totalCents: 0, openCents: 0, wonCents: 0, stageLabel: 'Em atendimento' },
      { pipelineId: 'v', pipelineName: 'Vendas', pipelineColor: '#111', count: 1, openCount: 0, wonCount: 1, totalCents: 0, openCents: 0, wonCents: 0 },
      { pipelineId: 'zzz', pipelineName: 'Antigo', pipelineColor: '#222', count: 1, openCount: 1, wonCount: 0, totalCents: 0, openCents: 0, wonCents: 0 },
    ], [SUPORTE, VENDAS])
    expect(chips).toEqual([
      { pipelineId: 'p', pipelineName: 'Suporte', color: '#14b8a6', stageLabel: 'Em atendimento', kind: 'process' },
      { pipelineId: 'zzz', pipelineName: 'Antigo', color: '#222', stageLabel: null, kind: 'sales' },
    ])
  })

  it('stepperFor: aberto → feitas/atual/a fazer só nas normais; fechado → todas feitas + terminal', () => {
    expect(stepperFor(SUPORTE, base).map((s) => `${s.label}:${s.state}`)).toEqual(['Novo:done', 'Em atendimento:current'])
    expect(stepperFor(SUPORTE, { ...base, status: 'lost', stageId: 's4' }).map((s) => `${s.label}:${s.state}`)).toEqual(['Novo:done', 'Em atendimento:done', 'Cancelado:lost'])
    expect(stepperFor(SUPORTE, { ...base, status: 'won', stageId: 's3' }).at(-1)).toMatchObject({ label: 'Concluído', state: 'won' })
  })

  it('splitDeals: abertos por criação desc, fechados por fechamento desc', () => {
    const { open, closed } = splitDeals([
      { ...base, id: 'a', createdAt: '2026-08-01' },
      { ...base, id: 'b', createdAt: '2026-08-10' },
      { ...base, id: 'c', status: 'won', closedAt: '2026-07-01' },
      { ...base, id: 'd', status: 'lost', closedAt: '2026-07-20' },
    ])
    expect(open.map((d) => d.id)).toEqual(['b', 'a'])
    expect(closed.map((d) => d.id)).toEqual(['d', 'c'])
  })

  it('movedByLabel: humano pelo nome, IA/automação/campanha pelo tipo; nada sem informação', () => {
    expect(movedByLabel({ lastMovedByKind: 'user', lastMovedByActorName: 'Renata C.' })).toBe('Renata C.')
    expect(movedByLabel({ lastMovedByKind: 'ai', lastMovedByActorName: null })).toBe('IA')
    expect(movedByLabel({ lastMovedByKind: 'journey', lastMovedByActorName: null })).toBe('automação')
    expect(movedByLabel({ lastMovedByKind: 'campaign', lastMovedByActorName: null })).toBe('campanha')
    expect(movedByLabel({ lastMovedByKind: null, lastMovedByActorName: null, createdByKind: 'ai' })).toBe('IA')
    expect(movedByLabel({ lastMovedByKind: null, lastMovedByActorName: null })).toBeNull()
  })

  it('moveTargets: normais exceto a atual, depois os terminais', () => {
    const t = moveTargets(SUPORTE, 's2')
    expect(t.normal.map((s) => s.label)).toEqual(['Novo'])
    expect(t.terminal.map((s) => s.label)).toEqual(['Concluído', 'Cancelado'])
  })
})
