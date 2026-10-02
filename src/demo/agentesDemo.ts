import type { Practitioner } from '@/types'
import type { AgentConfig, HandoffRule, AgentConfigWithTools, AgentCrmCapabilities, AgentKnowledgeDoc } from '@/services/agentsApi'
import { daysAgo, hoursAgo } from '@/components/landing/stage/hero/heroClock'
import { HERO } from '@/components/landing/stage/hero/heroRealData'
import { PERFIL } from '@/components/landing/stage/hero/perfisDemo'

/**
 * Os agentes do tenant de demonstração, no formato do agent-server. Os textos
 * (instruções, conhecimento, catálogo, regras) vêm do perfil da área
 * (`perfisDemo.ts`); a clínica é o padrão.
 *
 * As permissões do Agente Recepção são as MESMAS que a história mostra — e só
 * elas: responder, etiquetar, mudar a situação, avançar o registro para etapa
 * não terminal (`canClose: false`) e chamar uma pessoa. Confirmar (ganho) fica
 * desligado, como o backend exige.
 */

const TENANT = 'demo-tenant'

const CRM_RECEPCAO: AgentCrmCapabilities = {
  capabilities: [
    { id: 'manage_conversation_status', enabled: true, constraints: { allowedStatuses: ['pending'] } },
    { id: 'assign_conversation_to_user', enabled: true },
    { id: 'manage_conversation_tags', enabled: true },
    { id: 'tag_contact', enabled: true },
    { id: 'manage_contact_pipeline', enabled: true },
    { id: 'manage_deal_pipeline', enabled: true, constraints: { canClose: false, canEnter: false, allowBackward: false } },
  ],
}

/** Regras de transferência do agente da história (seção Transferência da demo). */
const REGRAS_RECEPCAO: HandoffRule[] = PERFIL.regras.map((r, i) => ({
  id: r.id, name: r.nome, priority: i + 1, enabled: true, matchMode: 'any_keyword',
  keywords: r.palavras, action: 'human_handoff', department: r.departamento,
  ...(r.resposta ? { template: r.resposta } : {}),
  aiGenerated: i === 0, createdAt: hoursAgo(300 - i * 10), updatedAt: hoursAgo(i === 0 ? 48 : 290),
}))

function agente(
  id: string, nome: string, icon: string, setor: string, objetivo: string,
  status: AgentConfig['status'], conversas: number, crm?: AgentCrmCapabilities,
): AgentConfig {
  return {
    id,
    tenant_id: TENANT,
    created_by: 'demo-user-1',
    name: nome,
    icon,
    sector: setor,
    objective: objetivo,
    status,
    system_prompt: id === 'ag-recepcao' ? PROMPT_RECEPCAO : `Você é o ${nome} da ${PERFIL.empresa}. ${objetivo}`,
    handoff_rules: { rules: id === 'ag-recepcao' ? REGRAS_RECEPCAO : [] },
    channels: { whatsapp: { number: '+55 47 3030-1100', enabled: status === 'active' } },
    wizard_config: {},
    crm_capabilities: crm ?? { capabilities: [] },
    ai_handoff_pause_minutes: null,
    ai_inbound_debounce_seconds: null,
    test_count: 24,
    last_tested_at: hoursAgo(20),
    conversation_count: conversas,
    created_at: daysAgo(96),
    updated_at: daysAgo(2),
  }
}

/**
 * As instruções do agente da história — o que ele é, o que pode informar e
 * quando chama uma pessoa. É daqui, da base de conhecimento e do catálogo
 * liberado que sai a resposta da história.
 */
const PROMPT_RECEPCAO = PERFIL.agente.prompt

/** A base de conhecimento do agente da história (aba Conhecimento). */
export const CONHECIMENTO_RECEPCAO: Array<AgentKnowledgeDoc & { content: string }> = PERFIL.conhecimento.map((d) => ({
  id: d.id, agent_id: 'ag-recepcao', tenant_id: TENANT, source_type: d.tipo, status: 'ready', chunk_count: d.trechos,
  created_at: daysAgo(d.dias), document_name: d.nome, content_preview: d.previa, content: d.conteudo,
}))

/** O que do catálogo o Agente Recepção pode citar (aba Catálogo). */
export const CATALOGO_RECEPCAO = PERFIL.catalogoDoAgente

/** Profissionais do registro da empresa; a recepção cita só a Dra. Helena. */
export const PROFISSIONAIS_DEMO: Practitioner[] = [
  { id: 'prof-helena', name: HERO.doctor, category: PERFIL.agente.setor, active: true, order: 0, notes: 'Atende à tarde' },
  { id: 'prof-rafael', name: 'Dr. Rafael', category: 'Nutrição', active: true, order: 1 },
]
export const PROFISSIONAIS_RECEPCAO = ['prof-helena']

export const AGENTES_DEMO: AgentConfig[] = [
  agente('ag-recepcao', HERO.agent, PERFIL.agente.icone, PERFIL.agente.setor, PERFIL.agente.objetivo, 'active', 1_284, CRM_RECEPCAO),
  ...PERFIL.agente.outros.map((o) => agente(o.id, o.nome, o.icone, o.setor, o.objetivo, o.status, o.conversas)),
]

export function agenteComFerramentas(id: string): AgentConfigWithTools {
  const base = AGENTES_DEMO.find((a) => a.id === id) ?? AGENTES_DEMO[0]
  return { ...base, tools: [] }
}
