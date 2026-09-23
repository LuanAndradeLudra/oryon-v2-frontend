import type React from 'react'
import {
  Bell, MessageSquare, UserCheck, Bot, Sparkles, Clock, MessagesSquare, AtSign, Send, AlertCircle,
  Workflow, Zap, Plug, ShieldAlert,
} from 'lucide-react'

/** Metadados de notificação compartilhados pelo popover do sino (TopBar) e
 *  pela página /notifications — SCRUM-1097 (23/09). Só constantes/funções
 *  (fast-refresh exige componentes num arquivo à parte). */
export const TYPE_ICON: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  new_message: MessageSquare,
  conversation_assigned: UserCheck,
  conversation_transferred: UserCheck,
  agent_handoff: Bot,
  agent_ai_response: Sparkles,
  conversation_waiting: Clock,
  team_message: MessagesSquare,
  mention: AtSign,
  campaign_complete: Send,
  campaign_failed: AlertCircle,
  automation_executed: Workflow,
  automation_note: Zap,
  whatsapp_integration_error: Plug,
  security_alert: ShieldAlert,
}

export function iconFor(type: string): React.ComponentType<{ className?: string; strokeWidth?: number }> {
  return TYPE_ICON[type] ?? Bell
}

export const CATEGORY_CHIPS: Array<{ key: string; label: string; types: string[] }> = [
  { key: 'all', label: 'Todas', types: [] },
  { key: 'conversations', label: 'Conversas', types: ['new_message', 'conversation_assigned', 'conversation_transferred', 'agent_handoff', 'agent_ai_response', 'conversation_waiting'] },
  { key: 'team', label: 'Equipe', types: ['team_message', 'mention'] },
  { key: 'campaigns', label: 'Campanhas', types: ['campaign_complete', 'campaign_failed'] },
  { key: 'automations', label: 'Automações', types: ['automation_executed', 'automation_note'] },
  { key: 'security', label: 'Segurança', types: ['whatsapp_integration_error', 'security_alert'] },
]
