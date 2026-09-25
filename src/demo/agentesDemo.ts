import type { AgentConfig, AgentConfigWithTools, AgentCrmCapabilities, AgentKnowledgeDoc } from '@/services/agentsApi'
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
    system_prompt: id === 'ag-vendas' ? PROMPT_VENDAS : `Você é o ${nome} da Vértice Software. ${objetivo}`,
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

/**
 * As instruções do agente da história — o que ele é, o que pode oferecer e
 * quando chama uma pessoa. É daqui, da base de conhecimento e do catálogo
 * liberado que sai a resposta à Marina (R$ 375 por licença no anual).
 */
const PROMPT_VENDAS = [
  'Você é o Agente Vendas da Vértice Software, empresa de software de gestão para equipes comerciais.',
  '',
  'Seu papel: atender pedidos de proposta pelo WhatsApp, tirar dúvidas sobre os planos e avançar o negócio no funil.',
  '',
  'Como responder:',
  '- Use só valores e condições do catálogo liberado a você e da base de conhecimento.',
  '- Em setembro, quem renova com a equipe ganha suporte prioritário sem custo extra (ver "Renovação de setembro").',
  '- Seja direto e cordial; trate o cliente pelo primeiro nome.',
  '',
  'Quando chamar uma pessoa:',
  '- O cliente pede para falar com alguém ou quer fechar hoje.',
  '- Pedido de desconto fora da política comercial.',
].join('\n')

/** A base de conhecimento do Agente Vendas (aba Conhecimento). */
export const CONHECIMENTO_VENDAS: Array<AgentKnowledgeDoc & { content: string }> = [
  {
    id: 'kd-planos', agent_id: 'ag-vendas', tenant_id: TENANT, source_type: 'file', status: 'ready', chunk_count: 6, created_at: daysAgo(40),
    document_name: 'Planos e condições 2026.pdf',
    content_preview: 'Plano Pro: licença por usuário, com suporte prioritário. Anual: R$ 375 por licença. Mensal: R$ 39 por licença…',
    content: 'Plano Pro — licença por usuário, com suporte prioritário.\nAnual: R$ 375 por licença (pagamento único).\nMensal: R$ 39 por licença.\n\nPlano Essencial — suporte em horário comercial. Mensal: R$ 19 por licença.',
  },
  {
    id: 'kd-renovacao', agent_id: 'ag-vendas', tenant_id: TENANT, source_type: 'text', status: 'ready', chunk_count: 3, created_at: daysAgo(12),
    document_name: 'Renovação de setembro',
    content_preview: 'Em setembro, quem leva a equipe para o Plano Pro anual ganha suporte prioritário sem custo extra…',
    content: 'Campanha de renovação (setembro): quem leva a equipe para o Plano Pro anual ganha suporte prioritário sem custo extra. Válido para contratos a partir de 5 licenças.',
  },
  {
    id: 'kd-implantacao', agent_id: 'ag-vendas', tenant_id: TENANT, source_type: 'text', status: 'ready', chunk_count: 4, created_at: daysAgo(40),
    document_name: 'Implantação e treinamento',
    content_preview: 'A implantação assistida inclui configuração e treinamento da equipe, cobrada por loja…',
    content: 'A implantação assistida inclui configuração e treinamento da equipe, cobrada por loja. Prazo típico: duas semanas.',
  },
  {
    id: 'kd-politica', agent_id: 'ag-vendas', tenant_id: TENANT, source_type: 'file', status: 'ready', chunk_count: 5, created_at: daysAgo(64),
    document_name: 'Política comercial.pdf',
    content_preview: 'Descontos acima da tabela precisam de aprovação da equipe comercial…',
    content: 'Descontos acima da tabela precisam de aprovação da equipe comercial. O agente não oferece desconto fora desta política.',
  },
]

/** O que do catálogo o Agente Vendas pode citar (aba Catálogo). */
export const CATALOGO_VENDAS = ['pr-pro', 'pr-implantacao']

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
