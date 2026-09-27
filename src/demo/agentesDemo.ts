import type { AgentConfig, HandoffRule, AgentConfigWithTools, AgentCrmCapabilities, AgentKnowledgeDoc } from '@/services/agentsApi'
import { daysAgo, hoursAgo } from '@/components/landing/stage/hero/heroClock'
import { HERO } from '@/components/landing/stage/hero/heroRealData'

/**
 * Os agentes do tenant de demonstração (Clínica Vitalis), no formato do
 * agent-server.
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

/** Regras de transferência do Agente Recepção (seção Transferência da demo). */
const REGRAS_RECEPCAO: HandoffRule[] = [
  { id: 'hr-encaixe', name: 'Encaixe ou urgência', priority: 1, enabled: true, matchMode: 'any_keyword',
    keywords: ['encaixe', 'urgente', 'hoje', 'dor', 'sangrando'], action: 'human_handoff', department: 'Recepção',
    template: 'Claro! Já chamei a recepção para ver o encaixe com você por aqui mesmo.',
    aiGenerated: true, createdAt: hoursAgo(300), updatedAt: hoursAgo(48) },
  { id: 'hr-clinica', name: 'Dúvida clínica', priority: 2, enabled: true, matchMode: 'any_keyword',
    keywords: ['sintoma', 'remédio', 'resultado de exame', 'posso tomar'], action: 'human_handoff', department: 'Dra. Helena',
    aiGenerated: false, createdAt: hoursAgo(290), updatedAt: hoursAgo(290) },
  { id: 'hr-humano', name: 'Pedido de uma pessoa', priority: 3, enabled: true, matchMode: 'any_keyword',
    keywords: ['falar com alguém', 'atendente', 'pessoa', 'humano'], action: 'human_handoff', department: 'Recepção',
    aiGenerated: false, createdAt: hoursAgo(290), updatedAt: hoursAgo(290) },
]

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
    system_prompt: id === 'ag-recepcao' ? PROMPT_RECEPCAO : `Você é o ${nome} da Clínica Vitalis. ${objetivo}`,
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
 * quando chama uma pessoa. É daqui, da base de conhecimento, do catálogo
 * liberado e da agenda que sai a resposta à Marina (R$ 180 no particular,
 * Unimed com guia, quinta às 14h30).
 */
const PROMPT_RECEPCAO = [
  'Você é o Agente Recepção da Clínica Vitalis, clínica de dermatologia em Joinville.',
  '',
  'Seu papel: atender pacientes pelo WhatsApp, informar valores e convênios, oferecer horários e marcar consultas e retornos.',
  '',
  'Como responder:',
  '- Use só valores e condições do catálogo liberado a você e da base de conhecimento.',
  '- Ofereça apenas horários que vieram da agenda da clínica; nunca invente um horário.',
  '- Convênios: só os da lista "Convênios aceitos"; com guia autorizada.',
  '- Seja direto e cordial; trate o paciente pelo primeiro nome.',
  '',
  'Quando chamar uma pessoa:',
  '- O paciente pede para falar com alguém, quer um encaixe ou diz que é urgente.',
  '- Dúvida clínica, pedido de desconto ou orientação sobre exames.',
].join('\n')

/** A base de conhecimento do Agente Recepção (aba Conhecimento). */
export const CONHECIMENTO_RECEPCAO: Array<AgentKnowledgeDoc & { content: string }> = [
  {
    id: 'kd-tabela', agent_id: 'ag-recepcao', tenant_id: TENANT, source_type: 'file', status: 'ready', chunk_count: 6, created_at: daysAgo(40),
    document_name: 'Tabela de consultas 2026.pdf',
    content_preview: 'Consulta dermatológica: R$ 250 (particular). Retorno em até 30 dias: R$ 180. Laser fracionado: R$ 450 por sessão…',
    content: 'Consulta dermatológica — R$ 250 no particular.\nConsulta de retorno (até 30 dias após a consulta) — R$ 180.\nLaser fracionado — R$ 450 por sessão; pacote de três sessões com desconto.',
  },
  {
    id: 'kd-convenios', agent_id: 'ag-recepcao', tenant_id: TENANT, source_type: 'text', status: 'ready', chunk_count: 3, created_at: daysAgo(12),
    document_name: 'Convênios aceitos',
    content_preview: 'Atendemos Unimed, Bradesco Saúde e SulAmérica, com guia autorizada. Procedimentos estéticos só no particular…',
    content: 'Convênios aceitos: Unimed, Bradesco Saúde e SulAmérica, sempre com guia autorizada antes da consulta. Procedimentos estéticos (laser, peeling) são atendidos só no particular.',
  },
  {
    id: 'kd-preparo', agent_id: 'ag-recepcao', tenant_id: TENANT, source_type: 'text', status: 'ready', chunk_count: 4, created_at: daysAgo(40),
    document_name: 'Preparo e orientações',
    content_preview: 'Chegar com 10 minutos de antecedência; trazer documento com foto e a carteirinha do convênio…',
    content: 'Chegar com 10 minutos de antecedência. Trazer documento com foto e, no convênio, a carteirinha e a guia. Para mapeamento de pintas, vir sem maquiagem e sem esmalte.',
  },
  {
    id: 'kd-cancelamento', agent_id: 'ag-recepcao', tenant_id: TENANT, source_type: 'file', status: 'ready', chunk_count: 5, created_at: daysAgo(64),
    document_name: 'Política de cancelamento.pdf',
    content_preview: 'Cancelamentos e remarcações com até 24 horas de antecedência, sem custo…',
    content: 'Cancelamentos e remarcações com até 24 horas de antecedência não têm custo. O agente não oferece desconto nem exceção fora desta política.',
  },
]

/** O que do catálogo o Agente Recepção pode citar (aba Catálogo). */
export const CATALOGO_RECEPCAO = ['pr-consulta', 'pr-retorno']

export const AGENTES_DEMO: AgentConfig[] = [
  agente(
    'ag-recepcao', HERO.agent, '🩺', 'Recepção',
    'Atende pacientes, informa valores e convênios, oferece horários da agenda e marca consultas. Chama uma pessoa para encaixes e urgências.',
    'active', 1_284, CRM_RECEPCAO,
  ),
  agente(
    'ag-resultados', 'Agente Resultados', '📄', 'Exames',
    'Avisa quando o resultado de exame está disponível e orienta a retirada.',
    'active', 3_917,
  ),
  agente(
    'ag-posconsulta', 'Agente Pós-consulta', '🤝', 'Cuidado continuado',
    'Acompanha o pós-consulta e lembra o retorno.',
    'paused', 402,
  ),
]

export function agenteComFerramentas(id: string): AgentConfigWithTools {
  const base = AGENTES_DEMO.find((a) => a.id === id) ?? AGENTES_DEMO[0]
  return { ...base, tools: [] }
}
