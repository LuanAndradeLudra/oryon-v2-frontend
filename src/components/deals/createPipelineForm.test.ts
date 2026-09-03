import { describe, it, expect } from 'vitest'
import {
  stagesFromTemplate,
  stagesFromAiSuggestion,
  fallbackStages,
  defaultTemplateFor,
  addNormalStage,
  removeStage,
  renameStage,
  reorderNormalStages,
  orderedStages,
  createBlocker,
  toCreatePipelineDto,
  type DraftStage,
} from './createPipelineForm'
import type { PipelineTemplate } from '@/types'

const SUPORTE: PipelineTemplate = {
  key: 'suporte', kind: 'process', name: 'Suporte', description: 'x', isDefault: true,
  stages: [
    { key: 'novo', label: 'Novo', color: '#6366f1' },
    { key: 'em-atendimento', label: 'Em atendimento', color: '#f59e0b' },
    { key: 'concluido', label: 'Concluído', color: '#10b981', isWon: true },
    { key: 'cancelado', label: 'Cancelado', color: '#ef4444', isLost: true },
  ],
}
const VENDAS: PipelineTemplate = {
  key: 'vendas-padrao', kind: 'sales', name: 'Vendas padrão', description: 'x', isDefault: true,
  stages: [
    { key: 'novo', label: 'Novo', color: '#6366f1' },
    { key: 'ganho', label: 'Ganho', color: '#10b981', isWon: true },
    { key: 'perdido', label: 'Perdido', color: '#ef4444', isLost: true },
  ],
}
const VENDAS_BRANCO: PipelineTemplate = { ...VENDAS, key: 'vendas-em-branco', name: 'Em branco', isDefault: false }

describe('createPipelineForm — F7 (SCRUM-865/866)', () => {
  it('stagesFromTemplate mapeia isWon/isLost para os papéis e mantém a ordem', () => {
    const draft = stagesFromTemplate(SUPORTE)
    expect(draft.map((s) => s.role)).toEqual(['normal', 'normal', 'won', 'lost'])
    expect(draft.map((s) => s.label)).toEqual(['Novo', 'Em atendimento', 'Concluído', 'Cancelado'])
    expect(new Set(draft.map((s) => s.id)).size).toBe(4)
  })

  it('defaultTemplateFor escolhe o isDefault do tipo (senão o primeiro do tipo; null sem nenhum)', () => {
    expect(defaultTemplateFor([VENDAS_BRANCO, VENDAS, SUPORTE], 'sales')?.key).toBe('vendas-padrao')
    expect(defaultTemplateFor([VENDAS_BRANCO, SUPORTE], 'sales')?.key).toBe('vendas-em-branco')
    expect(defaultTemplateFor([VENDAS], 'process')).toBeNull()
  })

  it('fallbackStages (backend sem /templates) nasce válido, com os terminais do tipo', () => {
    const p = fallbackStages('process')
    expect(p.map((s) => [s.role, s.label])).toEqual([['normal', 'Novo'], ['won', 'Concluído'], ['lost', 'Cancelado']])
    expect(fallbackStages('sales').map((s) => s.label)).toEqual(['Novo', 'Ganho', 'Perdido'])
  })

  it('terminais são fixos: removeStage não remove Ganho/Perdido, só etapas normais', () => {
    const draft = stagesFromTemplate(SUPORTE)
    const won = draft.find((s) => s.role === 'won')!
    expect(removeStage(draft, won.id)).toHaveLength(4)
    const novo = draft[0]
    expect(removeStage(draft, novo.id).map((s) => s.label)).toEqual(['Em atendimento', 'Concluído', 'Cancelado'])
    expect(removeStage(draft, 'nao-existe')).toHaveLength(4)
  })

  it('terminais são renomeáveis (renameStage vale para qualquer papel)', () => {
    const draft = stagesFromTemplate(SUPORTE)
    const won = draft.find((s) => s.role === 'won')!
    const renamed = renameStage(draft, won.id, 'Matriculado')
    expect(renamed.find((s) => s.role === 'won')?.label).toBe('Matriculado')
    expect(renamed.find((s) => s.role === 'won')?.role).toBe('won')
  })

  it('addNormalStage insere ANTES dos terminais e alterna as cores', () => {
    let draft = stagesFromTemplate(VENDAS)
    draft = addNormalStage(draft, 'Proposta')
    draft = addNormalStage(draft, 'Negociação')
    expect(draft.map((s) => s.label)).toEqual(['Novo', 'Proposta', 'Negociação', 'Ganho', 'Perdido'])
    expect(draft[1].color).not.toBe(draft[2].color)
  })

  it('reorderNormalStages mantém os terminais no fim; orderedStages normaliza a ordem', () => {
    const draft = stagesFromTemplate(SUPORTE)
    const [a, b] = draft.filter((s) => s.role === 'normal')
    const reordered = reorderNormalStages(draft, [b, a])
    expect(reordered.map((s) => s.label)).toEqual(['Em atendimento', 'Novo', 'Concluído', 'Cancelado'])
    const scrambled: DraftStage[] = [draft[3], draft[2], draft[0], draft[1]]
    expect(orderedStages(scrambled).map((s) => s.role)).toEqual(['normal', 'normal', 'won', 'lost'])
  })

  it('createBlocker: nome → ≥1 etapa normal → nenhum rótulo vazio → null', () => {
    const draft = stagesFromTemplate(SUPORTE)
    expect(createBlocker('   ', draft)).toBe('name')
    const onlyTerminals = draft.filter((s) => s.role !== 'normal')
    expect(createBlocker('Suporte', onlyTerminals)).toBe('no_normal_stage')
    expect(createBlocker('Suporte', renameStage(draft, draft[0].id, ' '))).toBe('empty_label')
    expect(createBlocker('Suporte', draft)).toBeNull()
  })

  it('toCreatePipelineDto envia kind + stages[] na ordem canônica com isWon/isLost só nos terminais (key fica com o backend)', () => {
    const draft = stagesFromTemplate(SUPORTE)
    const dto = toCreatePipelineDto('  Suporte ', 'process', '#14b8a6', draft)
    expect(dto).toMatchObject({ name: 'Suporte', kind: 'process', color: '#14b8a6' })
    expect(dto.stages).toEqual([
      { label: 'Novo', color: '#6366f1' },
      { label: 'Em atendimento', color: '#f59e0b' },
      { label: 'Concluído', color: '#10b981', isWon: true },
      { label: 'Cancelado', color: '#ef4444', isLost: true },
    ])
    expect(dto.stages.some((s) => 'key' in s)).toBe(false)
  })

  // ── F13-904: sugestão da IA vira rascunho, não configuração aplicada ───────
  describe('stagesFromAiSuggestion', () => {
    it('usa só as normais sugeridas e mantém os terminais DO TIPO (invariante I2 é do funil, não do modelo)', () => {
      const draft = stagesFromAiSuggestion(
        [
          { label: 'Primeiro contato', color: '#111111' },
          { label: 'Diagnóstico' },
          { label: 'Fechado', isTerminal: true },
        ],
        'process',
      )

      expect(draft.map((s) => [s.label, s.role])).toEqual([
        ['Primeiro contato', 'normal'],
        ['Diagnóstico', 'normal'],
        ['Concluído', 'won'],
        ['Cancelado', 'lost'],
      ])
      // Cor sugerida é respeitada; sem cor, entra o rodízio.
      expect(draft[0].color).toBe('#111111')
      expect(draft[1].color).toBeTruthy()
    })

    it('rótulos vazios ou só espaço são descartados; sobra tudo vazio → cai no rascunho mínimo do tipo', () => {
      const draft = stagesFromAiSuggestion([{ label: '   ' }, { label: '' }], 'sales')

      expect(draft.map((s) => s.role)).toEqual(['normal', 'won', 'lost'])
      expect(draft[1].label).toBe('Ganho')
    })

    it('corta em 8 normais — sugestão é ponto de partida, não board infinito', () => {
      const many = Array.from({ length: 20 }, (_, i) => ({ label: `Etapa ${i + 1}` }))

      const draft = stagesFromAiSuggestion(many, 'sales')

      expect(draft.filter((s) => s.role === 'normal')).toHaveLength(8)
      expect(draft).toHaveLength(10)
    })

    it('rótulo gigante é truncado (o backend deriva a key a partir dele)', () => {
      const draft = stagesFromAiSuggestion([{ label: 'x'.repeat(200) }], 'sales')

      expect(draft[0].label).toHaveLength(60)
    })
  })
})
