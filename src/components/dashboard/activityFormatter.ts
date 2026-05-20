// ─── Activity Feed — formatador humano por action ─────────────────────────
//
// O backend grava `activity_logs` com action_names técnicos
// (contact_updated, conversation_ai_pause_updated, …) e uma `description`
// que nem sempre está em português amigável — bulk imports, integrações
// e endpoints automatizados acabam logando sem cuidado de copy.
//
// Este módulo é a camada de tradução do dashboard. Convenção de escrita:
//   • Voz PASSIVA, foco na operação, não no ator. O ator vai pra um
//     bloco separado no rodapé do card (Avatar + nome). Aqui a frase
//     deve ler como o cabeçalho de uma notificação: "Contato X atualizado",
//     "Etiqueta 'VIP' criada", "Conversa de João resolvida".
//   • Particípio passado concorda com o gênero do substantivo
//     (criada/criado, atualizada/atualizado).
//   • Aspas duplas para nomes livres de etiqueta, estágio, modelo;
//     sem aspas para nomes próprios de pessoas/contatos.
//   • Uma linha. CSS pode quebrar em 2, mais que isso é ruído.
//
// Manter este arquivo em lockstep com os pontos de chamada do
// `@AuditLog` no backend (backend/src/**/*.controller.ts) e
// `appLogger.logActivity` no frontend. Quando entrar action nova:
//   1. Adicione uma entrada em FORMATTERS.
//   2. Se merece ícone próprio (status/assign/etc.), ajuste também
//      `pickActivityType` e o EVENT_CONFIG do ActivityFeed.tsx.
//   3. Senão, cai automaticamente no ícone genérico do `system_event`.

import type { ActivityEventType } from '@/types/dashboard'

interface FormatterCtx {
  /** Display name resolvido pelo backend (entityName → contato → entityId). */
  s: string
  /** Bag de metadata.details (from/to, new_status, enabled, etc.). */
  d: Record<string, unknown>
}

type Formatter = (ctx: FormatterCtx) => string

const FORMATTERS: Record<string, Formatter> = {
  // ── Contatos ────────────────────────────────────────────────────────────
  contact_created:                 ({ s }) => `Contato ${s || 'sem identificação'} criado`,
  contact_updated:                 ({ s }) => `Contato ${s || 'sem identificação'} atualizado`,
  contact_deleted:                 ({ s }) => `Contato ${s || 'sem identificação'} excluído`,
  contact_stage_changed:           ({ s, d }) => {
    const from = d.from ? ` de "${d.from}"` : ''
    const to   = d.to   ? ` para "${d.to}"`  : ''
    return `${s || 'Contato sem nome'}, movido${from}${to}`.trim()
  },
  contact_score_updated:           ({ s }) => `Lead score de ${s || 'um contato'} atualizado`,
  contact_ai_profile_generated:    ({ s }) => `Perfil de IA gerado para o contato ${s || 'sem identificação'}`,
  contact_ai_profile_applied:      ({ s }) => `Perfil de IA aplicado ao contato ${s || 'sem identificação'}`,
  contact_template_sent:           ({ s }) => `Modelo enviado para ${s || 'um contato'}`,
  contact_custom_fields_updated:   ({ s }) => `Campos personalizados de ${s || 'um contato'} atualizados`,
  contacts_bulk_stage_updated:     () => `Estágio de vários contatos atualizado em lote`,
  contacts_bulk_tags_updated:      () => `Etiquetas de vários contatos atualizadas em lote`,
  contacts_bulk_opt_in_updated:    () => `Opt-in de vários contatos atualizado em lote`,
  contacts_bulk_deleted:           () => `Vários contatos excluídos em lote`,

  // ── Conversas ───────────────────────────────────────────────────────────
  conversation_resolved:           ({ s }) => `Conversa de ${s || 'um cliente'} resolvida`,
  conversation_status_changed:     ({ s, d }) => {
    const to = d.to ? ` para "${d.to}"` : ''
    return `Status da conversa de ${s || 'um cliente'} alterado${to}`
  },
  conversation_status_updated:     ({ s, d }) => {
    const to = d.to ? ` para "${d.to}"` : ''
    return `Status da conversa de ${s || 'um cliente'} alterado${to}`
  },
  conversation_assigned:           ({ s }) => `Conversa de ${s || 'um cliente'} atribuída a um atendente`,
  conversation_transferred:        ({ s }) => `Conversa de ${s || 'um cliente'} transferida`,
  conversation_tag_added:          ({ s }) => `Etiqueta adicionada à conversa de ${s || 'um cliente'}`,
  conversation_tag_removed:        ({ s }) => `Etiqueta removida da conversa de ${s || 'um cliente'}`,
  conversation_ai_pause_updated:   ({ s }) => `Pausa da IA ajustada na conversa de ${s || 'um cliente'}`,
  conversation_analysis_triggered: ({ s }) => `Análise da conversa de ${s || 'um cliente'} iniciada`,
  conversation_analysis_confirmed: ({ s }) => `Análise da conversa de ${s || 'um cliente'} confirmada`,
  message_sent:                    ({ s }) => `Mensagem enviada na conversa de ${s || 'um cliente'}`,
  conversation_created:            ({ s }) => `Nova conversa iniciada com ${s || 'um cliente'}`,
  new_conversation:                ({ s }) => `Nova conversa iniciada com ${s || 'um cliente'}`,

  // ── Etiquetas (tags) ────────────────────────────────────────────────────
  tag_created:                     ({ s }) => `Etiqueta "${s || 'sem identificação'}" criada`,
  tag_updated:                     ({ s }) => `Etiqueta "${s || 'sem identificação'}" editada`,
  tag_deleted:                     ({ s }) => `Etiqueta "${s || 'sem identificação'}" excluída`,

  // ── Estágios do funil ──────────────────────────────────────────────────
  stage_created:                   ({ s }) => `Estágio "${s || 'sem identificação'}" criado`,
  stage_updated:                   ({ s }) => `Estágio "${s || 'sem identificação'}" editado`,
  stage_deleted:                   ({ s }) => `Estágio "${s || 'sem identificação'}" excluído`,
  stage_reordered:                 () => `Estágios do funil reordenados`,

  // ── Setores / Departamentos ────────────────────────────────────────────
  department_created:              ({ s }) => `Setor "${s || 'sem identificação'}" criado`,
  department_updated:              ({ s }) => `Setor "${s || 'sem identificação'}" editado`,
  department_deleted:              ({ s }) => `Setor "${s || 'sem identificação'}" excluído`,

  // ── Usuários da equipe ─────────────────────────────────────────────────
  user_login:                      () => `Login na plataforma`,
  user_logged_in:                  () => `Login na plataforma`,
  user_logout:                     () => `Sessão encerrada`,
  user_logged_out:                 () => `Sessão encerrada`,
  user_password_changed:           () => `Senha alterada`,
  user_self_updated:               () => `Perfil atualizado`,
  user_invited:                    ({ s }) => `${s || 'Usuário sem nome'} convidado para a equipe`,
  user_invitation_resent:          ({ s }) => `Convite reenviado para ${s || 'um usuário'}`,
  user_updated:                    ({ s }) => `Usuário ${s || 'sem identificação'} atualizado`,
  user_created:                    ({ s }) => `Usuário ${s || 'sem identificação'} criado`,
  user_deactivated:                ({ s }) => `Usuário ${s || 'sem identificação'} desativado`,
  user_role_changed:               ({ s }) => `Papel do usuário ${s || 'sem identificação'} alterado`,
  role_changed:                    ({ s }) => `Papel do usuário ${s || 'sem identificação'} alterado`,

  // ── Campanhas (disparos) ───────────────────────────────────────────────
  campaign_created:                ({ s }) => `Campanha "${s || 'sem identificação'}" criada`,
  campaign_updated:                ({ s }) => `Campanha "${s || 'sem identificação'}" editada`,
  campaign_sent:                   ({ s }) => `Campanha "${s || 'sem identificação'}" disparada`,
  campaign_deleted:                ({ s }) => `Campanha "${s || 'sem identificação'}" excluída`,
  campaign_line_changed:           ({ s }) => `Linha de envio da campanha "${s || 'sem identificação'}" ajustada`,
  campaign_wizard_completed:       ({ s }) => `Configuração da campanha "${s || 'sem identificação'}" concluída`,

  // ── Modelos (templates Meta) ───────────────────────────────────────────
  template_created:                ({ s }) => `Modelo "${s || 'sem identificação'}" criado`,
  template_updated:                ({ s }) => `Modelo "${s || 'sem identificação'}" editado`,
  template_deleted:                ({ s }) => `Modelo "${s || 'sem identificação'}" excluído`,
  template_duplicated:             ({ s }) => `Modelo "${s || 'sem identificação'}" duplicado`,
  template_duplicated_to_line:     ({ s }) => `Modelo "${s || 'sem identificação'}" replicado para outra linha`,
  template_line_changed:           ({ s }) => `Linha de envio do modelo "${s || 'sem identificação'}" ajustada`,
  templates_synced:                () => `Modelos sincronizados com a Meta`,

  // ── Respostas rápidas ──────────────────────────────────────────────────
  canned_response_created:         ({ s }) => `Resposta rápida "${s || 'sem identificação'}" criada`,
  canned_response_updated:         ({ s }) => `Resposta rápida "${s || 'sem identificação'}" editada`,
  canned_response_deleted:         ({ s }) => `Resposta rápida "${s || 'sem identificação'}" excluída`,

  // ── Automações ─────────────────────────────────────────────────────────
  automation_created:              ({ s }) => `Automação "${s || 'sem identificação'}" criada`,
  automation_updated:              ({ s }) => `Automação "${s || 'sem identificação'}" editada`,
  automation_toggled:              ({ s, d }) => {
    const isEnabled = d.enabled === true || d.isActive === true
    const verb = isEnabled ? 'ativada' : 'pausada'
    return `Automação "${s || 'sem identificação'}" ${verb}`
  },
  automation_deleted:              ({ s }) => `Automação "${s || 'sem identificação'}" excluída`,
  automation_line_changed:         ({ s }) => `Linha da automação "${s || 'sem identificação'}" ajustada`,

  // ── Campos personalizados ──────────────────────────────────────────────
  custom_field_created:            ({ s }) => `Campo personalizado "${s || 'sem identificação'}" criado`,
  custom_field_updated:            ({ s }) => `Campo personalizado "${s || 'sem identificação'}" editado`,
  custom_field_deleted:            ({ s }) => `Campo personalizado "${s || 'sem identificação'}" excluído`,

  // ── Organização ────────────────────────────────────────────────────────
  organization_updated:            () => `Dados da empresa atualizados`,

  // ── Hub de contexto / IA ───────────────────────────────────────────────
  company_brain_updated:           () => `Contexto da empresa atualizado`,
  company_brain_synced_to_rag:     () => `Contexto sincronizado com a base de conhecimento`,
  knowledge_base_updated:          () => `Base de conhecimento atualizada`,

  // ── Preferências de notificação ────────────────────────────────────────
  notification_preference_updated:        () => `Preferência de notificação atualizada`,
  notification_preferences_bulk_updated:  () => `Várias preferências de notificação atualizadas`,
  notification_preference_reset:          () => `Preferências de notificação restauradas ao padrão`,

  // ── Canais internos (chat interno) ─────────────────────────────────────
  internal_channel_created:         ({ s }) => `Canal interno "${s || 'sem identificação'}" criado`,
  internal_channel_deleted:         ({ s }) => `Canal interno "${s || 'sem identificação'}" excluído`,
  internal_message_sent:            ({ s }) => `Mensagem enviada no canal "${s || 'um canal'}"`,
  internal_message_deleted:         ({ s }) => `Mensagem apagada no canal "${s || 'um canal'}"`,
  internal_channel_members_added:   ({ s }) => `Membros adicionados ao canal "${s || 'um canal'}"`,
  internal_channel_member_removed:  ({ s }) => `Membro removido do canal "${s || 'um canal'}"`,

  // ── Mídia ──────────────────────────────────────────────────────────────
  media_uploaded:                   ({ s }) => `Arquivo "${s || 'sem identificação'}" enviado`,

  // ── WhatsApp / Meta ────────────────────────────────────────────────────
  meta_oauth_started:                () => `Conexão com a Meta iniciada`,
  meta_business_created:             ({ s }) => `Negócio "${s || 'sem identificação'}" conectado à Meta`,
  meta_phone_verification_requested: () => `Verificação de número WhatsApp solicitada`,
  meta_phone_verified:               () => `Número WhatsApp verificado`,
  meta_setup_finalized:              () => `Configuração da Meta concluída`,
  whatsapp_number_set_primary:       ({ s }) => `Número "${s || 'sem identificação'}" definido como principal`,
  whatsapp_number_updated:           ({ s }) => `Número WhatsApp "${s || 'sem identificação'}" atualizado`,
  whatsapp_number_removed:           () => `Número WhatsApp desconectado`,
  waba_system_user_token_generated:  () => `Novo token de sistema da Meta gerado`,
  waba_resubscribed:                 () => `Inscrição da Meta reativada`,

  // ── LGPD / Compliance ──────────────────────────────────────────────────
  lgpd_contact_data_exported:        ({ s }) => `Dados do contato ${s || 'sem identificação'} exportados (LGPD)`,
  lgpd_contact_data_erased:          ({ s }) => `Dados do contato ${s || 'sem identificação'} apagados (LGPD)`,
  lgpd_data_erased:                  () => `Apagamento de dados executado (LGPD)`,

  // ── Agentes IA (Agent Builder) ─────────────────────────────────────────
  agent_created:                     ({ s }) => `Agente IA "${s || 'sem identificação'}" criado`,
  agent_updated:                     ({ s }) => `Agente IA "${s || 'sem identificação'}" atualizado`,
  agent_deleted:                     ({ s }) => `Agente IA "${s || 'sem identificação'}" excluído`,
  agent_status_changed:              ({ s, d }) => {
    const to = d.new_status ? ` para "${d.new_status}"` : ''
    return `Status do agente IA "${s || 'sem identificação'}" alterado${to}`
  },
  agent_prompt_updated:              ({ s }) => `Prompt do agente IA "${s || 'sem identificação'}" atualizado`,
  agent_prompt_generated:            ({ s }) => `Prompt gerado para o agente IA "${s || 'sem identificação'}"`,
  agent_handoff_rules_updated:       ({ s }) => `Regras de handoff do agente IA "${s || 'sem identificação'}" atualizadas`,
  agent_decision_criteria_updated:   ({ s }) => `Critérios de decisão do agente IA "${s || 'sem identificação'}" atualizados`,
  agent_tool_added:                  ({ s }) => `Ferramenta adicionada ao agente IA "${s || 'sem identificação'}"`,
  agent_tool_updated:                ({ s }) => `Ferramenta do agente IA "${s || 'sem identificação'}" editada`,
  agent_tool_deleted:                ({ s }) => `Ferramenta removida do agente IA "${s || 'sem identificação'}"`,
  agent_faq_added:                   ({ s }) => `FAQ adicionada ao agente IA "${s || 'sem identificação'}"`,
  agent_faq_updated:                 ({ s }) => `FAQ do agente IA "${s || 'sem identificação'}" editada`,
  agent_faq_deleted:                 ({ s }) => `FAQ removida do agente IA "${s || 'sem identificação'}"`,
  agent_builder_completed:           ({ s }) => `Criação do agente IA "${s || 'sem identificação'}" concluída`,
  handoff_rule_generated:            ({ s }) => `Regra de handoff gerada para o agente IA "${s || 'sem identificação'}"`,
  human_handoff:                     ({ s }) => `Conversa de ${s || 'um cliente'} transferida para atendente humano`,
  external_redirect:                 ({ s }) => `Cliente ${s || 'sem identificação'} redirecionado para canal externo`,

  // ── Eventos sintéticos do dashboard ────────────────────────────────────
  sla_breach:                        ({ s }) => `SLA estourado na conversa de ${s || 'um cliente'}`,
  csat_received:                     ({ s }) => `Avaliação CSAT recebida de ${s || 'um cliente'}`,
  bot_deflection:                    ({ s }) => `Bot atendeu ${s || 'um cliente'} sem precisar transferir`,
  agent_online:                      () => `Status alterado para online`,
  agent_offline:                     () => `Status alterado para offline`,

  // ── Artefatos do Copilot ───────────────────────────────────────────────
  artifact_updated:                  () => `Artefato atualizado`,
  artifact_generated:                () => `Artefato gerado`,

  // ── Contas de anúncio (Meta/Google Ads) ───────────────────────────────
  ad_account_disconnected:           () => `Conta de anúncios desconectada`,
  ad_account_synced:                 () => `Conta de anúncios sincronizada`,
}

/**
 * Map de actions que merecem ÍCONE específico na timeline. As demais
 * caem no genérico 'system_event' (ícone Activity). Decisões aqui são
 * sobre o ícone, não sobre o texto — o texto sempre vem do FORMATTERS.
 */
export function pickActivityType(action: string): ActivityEventType {
  switch (action) {
    case 'conversation_resolved':
      return 'conversation_resolved'
    case 'conversation_status_updated':
    case 'conversation_status_changed':
      return 'conversation_resolved'
    case 'conversation_assigned':
    case 'conversation_transferred':
      return 'conversation_assigned'
    case 'conversation_created':
    case 'new_conversation':
      return 'new_conversation'
    case 'user_login':
    case 'user_logged_in':
    case 'agent_online':
      return 'agent_online'
    case 'user_logout':
    case 'user_logged_out':
    case 'agent_offline':
      return 'agent_offline'
    case 'sla_breach':
      return 'sla_breach'
    case 'csat_received':
      return 'csat_received'
    case 'bot_deflection':
      return 'bot_deflection'
    default:
      return 'system_event'
  }
}

/**
 * Renderiza a frase descritiva da operação (voz passiva, sem o ator).
 * O ator é exibido separadamente como Avatar + nome no rodapé do card,
 * então o texto aqui foca exclusivamente em O QUE aconteceu.
 *
 * Nunca devolve a `description` crua do backend — actions desconhecidas
 * caem no fallback humanizado abaixo.
 */
export function formatActivity(input: {
  action: string
  subject: string
  details?: Record<string, unknown>
}): string {
  const ctx: FormatterCtx = {
    s: input.subject || '',
    d: input.details ?? {},
  }
  const formatter = FORMATTERS[input.action]
  if (formatter) return formatter(ctx)
  // Fallback: action desconhecida vira "Xyz done" capitalizado, ainda
  // legível. Evita mostrar `contact_updated contact` crú na UI.
  const base = humanize(input.action)
  return ctx.s ? `${base} — ${ctx.s}` : base
}

function humanize(action: string): string {
  if (!action) return 'Ação desconhecida'
  return action
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}
