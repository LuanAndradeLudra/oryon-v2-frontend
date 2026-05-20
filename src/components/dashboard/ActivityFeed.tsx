import {
  CheckCircle2, UserCheck, MessageSquarePlus, Zap, ZapOff,
  AlertTriangle, Star, Bot, Activity,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ActorChip } from '@/components/ui/ActorChip'
import type { ActivityEvent, ActivityEventType } from '@/types/dashboard'

// Each entry maps an ActivityEventType to its ICON only — the text comes
// from DashboardPage, which delegates to activityFormatter.formatActivity.
// This split keeps copy decisions (a fast-changing concern) in one file
// (activityFormatter.ts) instead of scattered across templates here.
//
// `event.subject` is the full PT-BR sentence prepared upstream; we render
// it as-is. If a future caller still wants to render an ActivityFeed
// without going through DashboardPage, the fallback `'Atividade do
// sistema'` keeps the row visible.
const EVENT_CONFIG: Record<ActivityEventType, {
  icon: React.ReactNode
  iconClass: string
  bgClass: string
}> = {
  conversation_resolved: { icon: <CheckCircle2 className="w-3.5 h-3.5" />,     iconClass: 'text-online',       bgClass: 'bg-online/10'        },
  conversation_assigned: { icon: <UserCheck className="w-3.5 h-3.5" />,        iconClass: 'text-brand-400',    bgClass: 'bg-brand-600/10'     },
  new_conversation:      { icon: <MessageSquarePlus className="w-3.5 h-3.5" />,iconClass: 'text-brand-400',    bgClass: 'bg-brand-600/10'     },
  agent_online:          { icon: <Zap className="w-3.5 h-3.5" />,              iconClass: 'text-online',       bgClass: 'bg-online/10'        },
  agent_offline:         { icon: <ZapOff className="w-3.5 h-3.5" />,           iconClass: 'text-surface-400',  bgClass: 'bg-surface-800'      },
  sla_breach:            { icon: <AlertTriangle className="w-3.5 h-3.5" />,    iconClass: 'text-danger',       bgClass: 'bg-danger/10'        },
  csat_received:         { icon: <Star className="w-3.5 h-3.5" />,             iconClass: 'text-away',         bgClass: 'bg-away/10'          },
  bot_deflection:        { icon: <Bot className="w-3.5 h-3.5" />,              iconClass: 'text-violet-400',   bgClass: 'bg-violet-500/10'    },
  system_event:          { icon: <Activity className="w-3.5 h-3.5" />,         iconClass: 'text-surface-300',  bgClass: 'bg-surface-700/40'   },
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  // The Atividade Recente panel must match the height of its grid sibling
  // (the Performance table), not grow with its own content. Two layers:
  //
  //   • Outer wrapper: `relative h-full` — fills the grid cell stretched
  //     by `items-stretch` (the grid's default). Its own height comes
  //     from the sibling, NOT from its children, because…
  //   • Inner overlay: `absolute inset-0 flex flex-col` — pulled out of
  //     the normal flow with absolute positioning, so the activity list
  //     never inflates the row's intrinsic height. The header is
  //     `flex-shrink-0`, the scroll area gets `flex-1 min-h-0`, which is
  //     the canonical pattern for filling the remaining space and
  //     enabling overflow within a flex column.
  //
  // Net effect: panel == sibling table height, always. No magic numbers.
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden h-full relative min-h-[320px]">
      <div className="absolute inset-0 flex flex-col">
        <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-surface-100">Atividade Recente</p>
            <p className="text-[10px] text-surface-500 mt-0.5">Últimas 4 horas</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
            <span className="text-xs text-surface-500">Ao vivo</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
        {events.length === 0 && (
          <div className="px-5 py-8 text-center text-xs text-surface-500">
            Nenhuma atividade recente.
          </div>
        )}
        {events.map((event) => {
          // Defensive: if some future ActivityEventType sneaks in without a
          // config, fall through to system_event so we never destructure
          // `undefined.icon` and crash the whole panel.
          const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.system_event
          // Layout: ícone da operação à esquerda; descrição passiva no
          // topo do bloco direito; rodapé com timestamp à esquerda e
          // ActorChip (ícone monocromático + nome) à direita.
          return (
            <div key={event.id} className="flex items-start gap-3 px-5 py-3 border-b border-surface-800/60 hover:bg-surface-800/30 transition-colors">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bgClass, cfg.iconClass)}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-200 leading-snug">
                  {event.subject || 'Atividade do sistema'}
                </p>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-[10px] text-surface-500 flex-shrink-0">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                  <ActorChip
                    actorType={event.actorType}
                    actorName={event.actorName}
                    maxNameWidth={140}
                    className="text-[10px]"
                  />
                </div>
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
