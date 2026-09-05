import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SECTION, SECTION_GROUPS, SECTION_IDS, SECTIONS,
  isSectionId, sectionById, sectionCounter, sectionsInGroup, ungroupedSections,
} from './sectionNavCore'

describe('sectionNav — catálogo', () => {
  it('tem exatamente as 10 seções do mockup, sem id duplicado', () => {
    expect(SECTIONS).toHaveLength(10)
    expect(new Set(SECTIONS.map(s => s.id)).size).toBe(10)
    expect(SECTIONS.map(s => s.id)).toEqual([...SECTION_IDS])
  })

  it('agrupa exatamente como o mockup — "Visão geral" fora de grupo', () => {
    expect(ungroupedSections().map(s => s.id)).toEqual(['overview'])
    expect(sectionsInGroup('Cérebro').map(s => s.id)).toEqual(['prompt', 'knowledge', 'catalog'])
    expect(sectionsInGroup('Comportamento').map(s => s.id)).toEqual(['capabilities', 'skills', 'tools'])
    expect(sectionsInGroup('Limites').map(s => s.id)).toEqual(['criteria', 'rules'])
    expect(sectionsInGroup('Resultado').map(s => s.id)).toEqual(['metrics'])
  })

  it('não deixa seção órfã: agrupadas + sem grupo cobrem as 10', () => {
    const grouped = SECTION_GROUPS.flatMap(g => sectionsInGroup(g))
    expect(grouped.length + ungroupedSections().length).toBe(SECTIONS.length)
  })

  it('usa só acentos por token, nunca hex (Carta de Padrões §7)', () => {
    for (const s of SECTIONS) {
      expect(s.accent).not.toMatch(/^#/)
      expect(['brand', 'blue', 'green', 'violet', 'amber', 'rose', 'cyan']).toContain(s.accent)
    }
  })

  it('valida a seção da URL e tem um default utilizável', () => {
    expect(isSectionId('rules')).toBe(true)
    expect(isSectionId('nao-existe')).toBe(false)
    expect(isSectionId(undefined)).toBe(false)
    expect(isSectionId('')).toBe(false)
    expect(isSectionId(DEFAULT_SECTION)).toBe(true)
  })

  it('sectionById devolve a definição certa', () => {
    expect(sectionById('tools').label).toBe('Ferramentas')
    expect(sectionById('overview').group).toBeUndefined()
  })
})

describe('sectionNav — contadores', () => {
  it('sem dado nenhum, nenhuma seção mostra contador', () => {
    for (const id of SECTION_IDS) {
      expect(sectionCounter(id)).toBeNull()
    }
  })

  it('"Visão geral" e "Métricas" nunca têm contador, mesmo com dados', () => {
    const cheios = {
      promptVersion: 3, knowledgeReady: 4, catalogItems: 128,
      capabilitiesEnabled: 3, capabilitiesTotal: 7, skillsActive: 4,
      toolWarnings: 1, criteriaCount: 4, rulesActive: 3,
    }
    expect(sectionCounter('overview', cheios)).toBeNull()
    expect(sectionCounter('metrics', cheios)).toBeNull()
  })

  it('formata os 4 tipos do mockup', () => {
    expect(sectionCounter('prompt', { promptVersion: 3 })).toEqual({ kind: 'text', text: 'v3' })
    expect(sectionCounter('knowledge', { knowledgeReady: 4 })).toEqual({ kind: 'text', text: '4' })
    expect(sectionCounter('catalog', { catalogItems: 128 })).toEqual({ kind: 'text', text: '128' })
    expect(sectionCounter('capabilities', { capabilitiesEnabled: 3, capabilitiesTotal: 7 }))
      .toEqual({ kind: 'text', text: '3/7' })
    expect(sectionCounter('tools', { toolWarnings: 1 })).toEqual({ kind: 'warning', text: '!' })
  })

  it('zero é contagem legítima e aparece — menos onde zero significa "nada a dizer"', () => {
    expect(sectionCounter('knowledge', { knowledgeReady: 0 })).toEqual({ kind: 'text', text: '0' })
    expect(sectionCounter('rules', { rulesActive: 0 })).toEqual({ kind: 'text', text: '0' })
    // Sem aviso de token não há `!` — um "0" aqui pareceria contagem de
    // ferramentas, que é outra coisa.
    expect(sectionCounter('tools', { toolWarnings: 0 })).toBeNull()
    // Sem AS.2 não existe versão publicada; `v0` não é um estado real.
    expect(sectionCounter('prompt', { promptVersion: 0 })).toBeNull()
  })

  it('não inventa fração com metade dos números', () => {
    expect(sectionCounter('capabilities', { capabilitiesEnabled: 3 })).toBeNull()
    expect(sectionCounter('capabilities', { capabilitiesTotal: 7 })).toBeNull()
    expect(sectionCounter('capabilities', { capabilitiesEnabled: 0, capabilitiesTotal: 7 }))
      .toEqual({ kind: 'text', text: '0/7' })
  })

  it('trata null/undefined/NaN como ausência de dado, sem quebrar', () => {
    expect(sectionCounter('knowledge', { knowledgeReady: null })).toBeNull()
    expect(sectionCounter('knowledge', { knowledgeReady: undefined })).toBeNull()
    expect(sectionCounter('knowledge', { knowledgeReady: NaN })).toBeNull()
    expect(sectionCounter('catalog', { catalogItems: Infinity })).toBeNull()
  })
})
