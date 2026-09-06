// ─── A5 / SCRUM-1016 — arquétipo → rascunho do Studio ────────────────────────
import { describe, it, expect } from 'vitest'
import { applyArchetype } from '@/components/agents/archetypes/applyArchetype'
import { ARCHETYPES, type Archetype } from '@/components/agents/archetypes/archetypes'
import { DEFAULT_DATA, type WizardData } from '@/components/agents/studio/types'
import { CRM_CAPABILITIES_CATALOG } from '@/components/agents/crmCapabilitiesCatalog'

const AGORA = new Date('2026-09-06T12:00:00.000Z')
const porId = (id: Archetype['id']) => ARCHETYPES.find((a) => a.id === id)!

/** O que o Studio recebe de verdade: os defaults com o arquétipo por cima. */
const rascunho = (a: Archetype): WizardData => ({ ...DEFAULT_DATA, ...applyArchetype(a, AGORA) })

describe('applyArchetype', () => {
  it.each(ARCHETYPES)('$nome — deixa vazio o que é do cliente', (arquetipo) => {
    const data = rascunho(arquetipo)
    // O coração da decisão: nome, objetivo e empresa são o que a etapa 1 vai
    // perguntar. Nenhum arquétipo tem como adivinhar isso, e chutar seria pior
    // que deixar em branco — a pessoa aceitaria o palpite sem ler.
    expect(data.name).toBe('')
    expect(data.objective).toBe('')
    expect(data.company_name).toBe('')
  })

  it.each(ARCHETYPES)('$nome — preenche comportamento, escopo e regras', (arquetipo) => {
    const data = rascunho(arquetipo)
    expect(data.sector).toBe(arquetipo.sector)
    expect(data.tone).toBe(arquetipo.tone)
    expect(data.response_style).toEqual(arquetipo.response_style)
    expect(data.can_do).toEqual(arquetipo.can_do)
    expect(data.cannot_do).toEqual(arquetipo.cannot_do)
  })

  it('produz um WizardData completo — nenhuma chave do default se perde', () => {
    const data = rascunho(porId('vendas'))
    expect(Object.keys(data).sort()).toEqual(Object.keys(DEFAULT_DATA).sort())
  })

  it.each(ARCHETYPES)('$nome — o chip de regras bate com o que chega no rascunho', (arquetipo) => {
    // A ponta final do critério "o chip não mente": não basta o dado do
    // arquétipo ter N regras, tem que ser N que entram no WizardData.
    expect(rascunho(arquetipo).handoff_rules).toHaveLength(arquetipo.handoff_rules.length)
  })

  it('materializa a regra inteira: id prefixado, prioridade pela ordem, habilitada', () => {
    const regras = rascunho(porId('vendas')).handoff_rules
    expect(regras.map((r) => r.id)).toEqual(['vendas-reembolso', 'vendas-reclamacao'])
    expect(regras.map((r) => r.priority)).toEqual([1, 2])
    for (const r of regras) {
      expect(r.enabled).toBe(true)
      // Veio de arquétipo escrito à mão, não de geração por IA — o Studio
      // mostra a origem na etapa "Passar para humano".
      expect(r.aiGenerated).toBe(false)
      expect(r.createdAt).toBe(AGORA.toISOString())
      expect(r.updatedAt).toBe(AGORA.toISOString())
    }
  })

  it('ids de regra não colidem entre arquétipos', () => {
    // Sem o prefixo do arquétipo, "reclamacao" de Vendas e uma futura
    // "reclamacao" de Suporte seriam a mesma regra para o backend.
    const todos = ARCHETYPES.flatMap((a) => applyArchetype(a, AGORA).handoff_rules.map((r) => r.id))
    expect(new Set(todos).size).toBe(todos.length)
  })

  it('liga as capacidades já com os limites conservadores do catálogo', () => {
    const { capabilities } = rascunho(porId('suporte')).crm_capabilities
    expect(capabilities.map((c) => c.id)).toEqual(porId('suporte').crm_capabilities)
    for (const cap of capabilities) expect(cap.enabled).toBe(true)

    const status = capabilities.find((c) => c.id === 'manage_conversation_status')!
    const doCatalogo = CRM_CAPABILITIES_CATALOG.find((c) => c.id === 'manage_conversation_status')!
    // Mesma composição do Step8Revisao: a IA não sai podendo marcar conversa
    // como resolvida sozinha só porque a pessoa clicou num arquétipo.
    expect(status.constraints).toEqual(doCatalogo.defaultConstraints)
  })

  it('o rascunho é uma cópia — mexer nele não contamina o arquétipo', () => {
    // `ARCHETYPES` é módulo compartilhado: um push no array do rascunho de uma
    // pessoa apareceria no card de todo mundo até o reload.
    const arquetipo = porId('vendas')
    const antes = [...arquetipo.can_do]
    const data = applyArchetype(arquetipo, AGORA)
    data.can_do.push('contaminado')
    data.response_style.push('contaminado')
    data.handoff_rules[0].keywords.push('contaminado')
    expect(arquetipo.can_do).toEqual(antes)
    expect(arquetipo.response_style).not.toContain('contaminado')
    expect(arquetipo.handoff_rules[0].keywords).not.toContain('contaminado')
  })

  it('duas chamadas não compartilham estrutura', () => {
    const a = applyArchetype(porId('vendas'), AGORA)
    const b = applyArchetype(porId('vendas'), AGORA)
    expect(a).toEqual(b)
    expect(a.handoff_rules[0]).not.toBe(b.handoff_rules[0])
    expect(a.can_do).not.toBe(b.can_do)
  })

  it('sem relógio injetado, carimba a hora da escolha', () => {
    const antes = Date.now()
    const { handoff_rules } = applyArchetype(porId('suporte'))
    const carimbo = Date.parse(handoff_rules[0].createdAt)
    expect(carimbo).toBeGreaterThanOrEqual(antes)
    expect(carimbo).toBeLessThanOrEqual(Date.now())
  })
})
