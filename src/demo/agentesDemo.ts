import type { AgentConfig, AgentConfigWithTools, AgentCrmCapabilities } from '@/services/agentsApi'
import { daysAgo, hoursAgo } from '@/components/landing/stage/hero/heroClock'
import { HERO } from '@/components/landing/stage/hero/heroRealData'

/**
 * Os agentes do tenant de demonstração, no formato do agent-server.
 *
 * As permissões do Agente Vendas são as MESMAS que a história mostra — e só
 * elas: responder, etiquetar, mudar a situação, avançar o negócio para etapa
 * não terminal (`canClose: false`) e chamar uma pessoa. Fechar venda fica
 * desligado, como o backend exige.
 */

const TENANT = 'demo-tenant'

const CRM_VENDAS: AgentCrmCapabilities = {
  capabilities: [
    { id: 'manage_conversation_status', enabled: true, constraints: { allowedStatuses: ['pending'] } },
    { id: 'assign_conversation_to_user', enabled: true },
    { id: 'manage_conversation_tags', enabled: true },
    { id: 'tag_contact', enabled: true },
    { id: 'manage_contact_pipeline', enabled: true },
    { id: 'manage_deal_pipeline', enabled: true, constraints: { canClose: false, canEnter: false, allowBackward: false } },
  ],
}

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
    system_prompt: `Você é o ${nome} da Vértice Software. ${objetivo}`,
    handoff_rules: { rules: [] },
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

export const AGENTES_DEMO: AgentConfig[] = [
  agente(
    'ag-vendas', HERO.agent, '💼', 'Comercial',
    'Atende pedidos de proposta, consulta o catálogo, qualifica e avança o negócio no funil. Chama uma pessoa para fechar.',
    'active', 1_284, CRM_VENDAS,
  ),
  agente(
    'ag-suporte', 'Agente Suporte', '🛟', 'Suporte',
    'Responde dúvidas de uso com a base de conhecimento e abre chamado para a equipe quando precisa.',
    'active', 3_917,
  ),
  agente(
    'ag-posvenda', 'Agente Pós-venda', '🤝', 'Sucesso do cliente',
    'Acompanha renovações e coleta a avaliação do atendimento.',
    'paused', 402,
  ),
]

export function agenteComFerramentas(id: string): AgentConfigWithTools {
  const base = AGENTES_DEMO.find((a) => a.id === id) ?? AGENTES_DEMO[0]
  return { ...base, tools: [] }
}
