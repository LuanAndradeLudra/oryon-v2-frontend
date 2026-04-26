import {
  CheckCircle2, UserCheck, MessageSquarePlus, Zap, ZapOff,
  AlertTriangle, Star, Bot,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ActivityEvent, ActivityEventType } from '@/types/dashboard'

const EVENT_CONFIG: Record<ActivityEventType, {
  icon: React.ReactNode
  iconClass: string
  bgClass: string
  text: (e: ActivityEvent) => string
}> = {
  conversation_resolved: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    iconClass: 'text-online', bgClass: 'bg-online/10',
    text: (e) => `${e.actorName} resolveu a conversa de ${e.subject}`,
  },
  conversation_assigned: {
    icon: <UserCheck className="w-3.5 h-3.5" />,
    iconClass: 'text-brand-400', bgClass: 'bg-brand-600/10',
    text: (e) => `${e.actorName} assumiu conversa de ${e.subject}`,
  },
  new_conversation: {
    icon: <MessageSquarePlus className="w-3.5 h-3.5" />,
    iconClass: 'text-brand-400', bgClass: 'bg-brand-600/10',
    text: (e) => `Nova conversa: ${e.subject}`,
  },
  agent_online: {
    icon: <Zap className="w-3.5 h-3.5" />,
    iconClass: 'text-online', bgClass: 'bg-online/10',
    text: (e) => `${e.actorName} entrou online`,
  },
  agent_offline: {
    icon: <ZapOff className="w-3.5 h-3.5" />,
    iconClass: 'text-surface-400', bgClass: 'bg-surface-800',
    text: (e) => `${e.actorName} ficou offline`,
  },
  sla_breach: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    iconClass: 'text-danger', bgClass: 'bg-danger/10',
    text: (e) => `SLA violado — ${e.subject}`,
  },
  csat_received: {
    icon: <Star className="w-3.5 h-3.5" />,
    iconClass: 'text-away', bgClass: 'bg-away/10',
    text: (e) => `Avaliação de ${e.subject} recebida por ${e.actorName}`,
  },
  bot_deflection: {
    icon: <Bot className="w-3.5 h-3.5" />,
    iconClass: 'text-violet-400', bgClass: 'bg-violet-500/10',
    text: (e) => `Bot atendeu ${e.subject} sem transferir`,
  },
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between flex-shrink-0">
        <p className="text-sm font-semibold text-surface-100">Atividade Recente</p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
          <span className="text-xs text-surface-500">Ao vivo</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1" style={{ maxHeight: 380 }}>
        {events.map((event) => {
          const cfg = EVENT_CONFIG[event.type]
          return (
            <div key={event.id} className="flex items-start gap-3 px-5 py-3 border-b border-surface-800/60 hover:bg-surface-800/30 transition-colors">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bgClass, cfg.iconClass)}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-200 leading-snug">{cfg.text(event)}</p>
                <p className="text-[10px] text-surface-500 mt-0.5">{formatRelativeTime(event.timestamp)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
