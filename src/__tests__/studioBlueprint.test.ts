import { describe, it, expect } from 'vitest'
import type { HandoffRule } from '@/services/agentsApi'
import { DEFAULT_DATA, type WizardData } from '@/components/agents/studio/types'
import { blueprintSlots, formatHandoffRules } from '@/components/agents/studio/blueprint/blueprintSlots'
import { stepSummary } from '@/components/agents/studio/blueprint/stepSummary'
import { lacunas, lacunaPrincipal } from '@/components/agents/studio/blueprint/lacunas'

function regra(over: Partial<HandoffRule> = {}): HandoffRule {
  return {
    id: 'r1', name: 'Financeiro', priority: 1, enabled: true,
    matchMode: 'any_keyword', keywords: ['reembolso', 'estorno'],
    action: 'human_handoff', department: 'Setor Financeiro',
    aiGenerated: false, createdAt: '', updatedAt: '',
    ...over,
  }
}

function draft(over: Partial<WizardData> = {}): WizardData {
  return { ...DEFAULT_DATA, ...over }
}

// ─── blueprintSlots ──────────────────────────────────────────────────────────

describe('blueprintSlots', () => {
  it('um rascunho em branco dá os 7 encaixes, todos vazios', () => {
    const slots = blueprintSlots(DEFAULT_DATA)
    expect(slots).toHaveLength(7)
    expect(slots.every(s => !s.filled)).toBe(true)
    expect(slots.map(s => s.key)).toEqual([
      'objetivo', 'negocio', 'pode', 'nao-pode', 'handoff', 'conhecimento', 'system-prompt',
    ])
  })

  it('encaixe vazio diz de qual etapa ele vem', () => {
    const porChave = Object.fromEntries(blueprintSlots(DEFAULT_DATA).map(s => [s.key, s.value]))
    expect(porChave['objetivo']).toMatch(/Etapa 1/)
    expect(porChave['pode']).toMatch(/Etapa 3/)
    expect(porChave['negocio']).toMatch(/Etapa 4/)
    expect(porChave['handoff']).toMatch(/Etapa 5/)
    expect(porChave['conhecimento']).toMatch(/Etapa 6/)
    expect(porChave['system-prompt']).toMatch(/Etapa 7/)
  })

  it('só o encaixe de handoff ocupa a linha inteira', () => {
    expect(blueprintSlots(DEFAULT_DATA).filter(s => s.wide).map(s => s.key)).toEqual(['handoff'])
  })

  it('os acentos categóricos são nomes válidos, nunca hex', () => {
    // Carta de Padrões §7: cor categórica só via --color-accent-*.
    const validos = ['blue', 'green', 'violet', 'amber', 'rose', 'cyan', 'brand']
    for (const slot of blueprintSlots(DEFAULT_DATA)) {
      if (slot.accent !== null) expect(validos).toContain(slot.accent)
    }
    expect(blueprintSlots(DEFAULT_DATA).filter(s => s.accent === null).map(s => s.key))
      .toEqual(['conhecimento', 'system-prompt'])
  })

  it('preenche objetivo, escopo e conhecimento conforme o rascunho anda', () => {
    const slots = blueprintSlots(draft({
      objective: 'Qualificar leads e conduzir ao checkout.',
      can_do: ['Aplicar cupons', 'Consultar estoque'],
      cannot_do: ['Prometer prazos'],
      knowledge_docs: [{ id: 'k1', name: 'frete.pdf', content: '...', source_type: 'file' }],
    }))
    const porChave = Object.fromEntries(slots.map(s => [s.key, s]))
    expect(porChave['objetivo'].filled).toBe(true)
    expect(porChave['objetivo'].value).toBe('Qualificar leads e conduzir ao checkout.')
    expect(porChave['pode'].value).toBe('Aplicar cupons · Consultar estoque')
    expect(porChave['nao-pode'].value).toBe('Prometer prazos')
    expect(porChave['conhecimento'].value).toBe('1 fonte')
  })

  it('o resumo do negócio corta a descrição na primeira frase', () => {
    const slot = blueprintSlots(draft({
      company_name: 'Nuvem Moda',
      company_description: 'Moda feminina. Coleção cápsula mensal, troca em 30 dias.',
      faqs: [{ question: 'a', answer: 'b' }, { question: 'c', answer: 'd' }],
    })).find(s => s.key === 'negocio')!
    expect(slot.filled).toBe(true)
    expect(slot.value).toBe('Nuvem Moda · Moda feminina · 2 FAQs')
  })

  it('conta 1 FAQ no singular', () => {
    const slot = blueprintSlots(draft({ company_name: 'X', faqs: [{ question: 'a', answer: 'b' }] }))
      .find(s => s.key === 'negocio')!
    expect(slot.value).toBe('X · 1 FAQ')
  })
})

// ─── formatHandoffRules ──────────────────────────────────────────────────────

describe('formatHandoffRules', () => {
  it('formata palavras → destino', () => {
    expect(formatHandoffRules(draft({ handoff_rules: [regra()] })))
      .toBe('reembolso · estorno → Setor Financeiro')
  })

  it('junta várias regras', () => {
    const rules = [regra(), regra({ id: 'r2', keywords: ['procon'], department: 'Ana Ribeiro' })]
    expect(formatHandoffRules(draft({ handoff_rules: rules })))
      .toBe('reembolso · estorno → Setor Financeiro ·  · procon → Ana Ribeiro')
  })

  it('ignora regra desativada e regra sem palavra-chave', () => {
    const rules = [regra({ enabled: false }), regra({ id: 'r2', keywords: [] })]
    expect(formatHandoffRules(draft({ handoff_rules: rules }))).toBe('')
  })

  it('sem department, mostra o que a ação faz em vez de um destino vazio', () => {
    expect(formatHandoffRules(draft({ handoff_rules: [regra({ department: undefined })] })))
      .toBe('reembolso · estorno → Atendimento humano')
  })
})

// ─── stepSummary ─────────────────────────────────────────────────────────────

describe('stepSummary', () => {
  it('etapas em branco não inventam resumo', () => {
    for (const step of [1, 2, 3, 4, 5]) {
      expect(stepSummary(step, DEFAULT_DATA)).toBe('')
    }
  })

  it('traduz os códigos de setor, tom e idioma para o rótulo da UI', () => {
    const d = draft({ name: 'Sofia', sector: 'ecommerce', tone: 'entusiasmado', language: 'pt-BR' })
    expect(stepSummary(1, d)).toBe('Sofia · E-commerce / Varejo')
    expect(stepSummary(2, d)).toBe('Entusiasmado · Português')
  })

  it('conta escopo, FAQs e regras', () => {
    const d = draft({
      can_do: ['a', 'b', 'c'], cannot_do: ['x', 'y'],
      company_name: 'Nuvem Moda', faqs: [{ question: 'q', answer: 'a' }],
      handoff_rules: [regra(), regra({ id: 'r2' })],
    })
    expect(stepSummary(3, d)).toBe('3 pode · 2 não pode')
    expect(stepSummary(4, d)).toBe('Nuvem Moda · 1 FAQ')
    expect(stepSummary(5, d)).toBe('2 regras')
  })

  it('conta só as regras ativas', () => {
    const d = draft({ handoff_rules: [regra(), regra({ id: 'r2', enabled: false })] })
    expect(stepSummary(5, d)).toBe('1 regra')
  })

  it('etapas 6, 7 e 8 têm texto de espera', () => {
    expect(stepSummary(6, DEFAULT_DATA)).toBe('nada ainda')
    expect(stepSummary(7, DEFAULT_DATA)).toBe('a IA monta o cérebro')
    expect(stepSummary(8, DEFAULT_DATA)).toBe('publicar ou testar')
    expect(stepSummary(6, draft({ knowledge_docs: [{ id: 'k', name: 'n', content: 'c', source_type: 'file' }] })))
      .toBe('1 fonte')
    expect(stepSummary(7, draft({ generated_prompt: 'Você é a Sofia.' }))).toBe('prompt gerado')
  })
})

// ─── lacunas ─────────────────────────────────────────────────────────────────

describe('lacunas', () => {
  it('um rascunho em branco tem lacuna de conhecimento, limites, handoff e escopo', () => {
    expect(lacunas(DEFAULT_DATA).map(l => l.key))
      .toEqual(['sem-conhecimento', 'sem-limites', 'sem-handoff', 'sem-escopo'])
  })

  it('o card mostra a primeira lacuna aberta', () => {
    expect(lacunaPrincipal(DEFAULT_DATA)?.key).toBe('sem-conhecimento')
    expect(lacunaPrincipal(DEFAULT_DATA)?.texto).toMatch(/etapa 6/)
  })

  it('cada lacuna some quando o que faltava é preenchido', () => {
    const completo = draft({
      knowledge_docs: [{ id: 'k', name: 'n', content: 'c', source_type: 'file' }],
      cannot_do: ['Prometer prazos'],
      can_do: ['Consultar estoque'],
      handoff_rules: [regra()],
    })
    expect(lacunas(completo)).toEqual([])
    expect(lacunaPrincipal(completo)).toBeNull()
  })

  it('acusa regra ativa sem palavra-chave, que nunca dispararia', () => {
    const d = draft({
      knowledge_docs: [{ id: 'k', name: 'n', content: 'c', source_type: 'file' }],
      cannot_do: ['x'], can_do: ['y'],
      handoff_rules: [regra(), regra({ id: 'r2', keywords: [] })],
    })
    const l = lacunas(d)
    expect(l.map(x => x.key)).toEqual(['regra-sem-gatilho'])
    expect(l[0].texto).toMatch(/nunca vai disparar/)
  })

  it('pluraliza o aviso de regra sem gatilho', () => {
    const d = draft({
      knowledge_docs: [{ id: 'k', name: 'n', content: 'c', source_type: 'file' }],
      cannot_do: ['x'], can_do: ['y'],
      handoff_rules: [regra({ keywords: [] }), regra({ id: 'r2', keywords: [] })],
    })
    expect(lacunaPrincipal(d)?.texto).toMatch(/2 regras .* nunca vão disparar/)
  })
})
