// ─── applyArchetype (A5 / SCRUM-1016) ────────────────────────────────────────
// Arquétipo → estado inicial do rascunho do Studio. É o valor da tela inteira:
// a galeria só existe para que a pessoa chegue no passo 1 com tom, escopo,
// regras de transferência e capacidades já preenchidos.
//
// Devolve `Partial<WizardData>` de propósito. O que falta aqui — `name`,
// `objective`, `company_name` — é justamente o que a etapa 1 vai perguntar, e
// não existe arquétipo capaz de adivinhar: é a identidade do cliente, não o
// comportamento do agente. Preencher com palpite seria pior que deixar vazio.
import type { AgentCrmCapabilities, HandoffRule } from '@/services/agentsApi'
import type { WizardData } from '@/components/agents/studio/types'
import { CRM_CAPABILITIES_CATALOG } from '@/components/agents/crmCapabilitiesCatalog'
import type { Archetype } from './archetypes'

/**
 * Campos do `WizardData` que um arquétipo preenche. Declarado como tipo para
 * que acrescentar um campo ao arquétipo sem decidir se ele entra no rascunho
 * seja um erro de compilação, não um esquecimento silencioso.
 */
export type ArchetypeDraft = Pick<
  WizardData,
  'sector' | 'tone' | 'response_style' | 'can_do' | 'cannot_do' | 'handoff_rules' | 'crm_capabilities'
>

/**
 * @param agora injetável só para o teste ser determinístico; em produção é o
 *   relógio de verdade. Os timestamps são do instante da escolha porque a regra
 *   nasce aqui — o dado do arquétipo não carrega data.
 */
export function applyArchetype(arquetipo: Archetype, agora: Date = new Date()): ArchetypeDraft {
  const timestamp = agora.toISOString()

  const handoff_rules: HandoffRule[] = arquetipo.handoff_rules.map((regra, i) => ({
    id: `${arquetipo.id}-${regra.id}`,
    name: regra.name,
    description: regra.description,
    // A ordem do dado é a prioridade — ninguém mantém número à mão.
    priority: i + 1,
    enabled: true,
    matchMode: regra.matchMode,
    keywords: [...regra.keywords],
    action: regra.action,
    // Vem de um arquétipo escrito à mão, não de geração por IA. A flag muda o
    // rótulo de origem que o Studio mostra na etapa "Passar para humano".
    aiGenerated: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }))

  const crm_capabilities: AgentCrmCapabilities = {
    capabilities: arquetipo.crm_capabilities.map((id) => {
      // Mesma composição do Step8Revisao: ligar uma capacidade traz junto os
      // limites conservadores do catálogo (ex.: não deixar a IA marcar uma
      // conversa como "Resolvida" sozinha). A pessoa afrouxa depois, na aba
      // "Capacidades", onde tem contexto pra isso.
      const entry = CRM_CAPABILITIES_CATALOG.find((c) => c.id === id)
      return {
        id,
        enabled: true,
        ...(entry?.defaultConstraints ? { constraints: entry.defaultConstraints } : {}),
      }
    }),
  }

  return {
    sector: arquetipo.sector,
    tone: arquetipo.tone,
    // Cópias: o rascunho é mutável e não pode escrever de volta no arquétipo,
    // que é um módulo compartilhado por toda a galeria.
    response_style: [...arquetipo.response_style],
    can_do: [...arquetipo.can_do],
    cannot_do: [...arquetipo.cannot_do],
    handoff_rules,
    crm_capabilities,
  }
}
