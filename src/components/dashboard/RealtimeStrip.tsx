import { Users, MessageSquare, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RealtimeStatus } from '@/types/dashboard'

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m`
}

export function RealtimeStrip({ status }: { status: RealtimeStatus }) {
  // Mobile: flex-wrap em vez de overflow-x — fila/espera são MÉTRICAS DE
  // ALERTA e nunca podem ficar fora da tela (era o que acontecia com o
  // scroll horizontal). Em sm+ mantém a linha única de 40px.
  return (
    <div
      role="status"
      aria-label="Métricas em tempo real"
      className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 sm:px-6 py-2 sm:py-0 sm:h-10 bg-surface-950 border-b border-surface-800 text-xs flex-shrink-0"
    >
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-online" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Ao Vivo</span>
      </div>

      <div className="w-px h-4 bg-surface-800 hidden sm:block" />

      <div className="flex items-center gap-1.5 text-surface-400">
        <Users className="w-3.5 h-3.5 text-surface-600" />
        <span>Usuários:</span>
        <span className="font-semibold text-online tabular-nums">{status.agentsOnline}/{status.agentsTotal}</span>
      </div>

      <div className="w-px h-4 bg-surface-800 hidden sm:block" />

      <div className="flex items-center gap-1.5 text-surface-400">
        <MessageSquare className="w-3.5 h-3.5 text-surface-600" />
        <span>Ativas:</span>
        <span className="font-semibold text-surface-100 tabular-nums">{status.activeConversations}</span>
      </div>

      <div className="w-px h-4 bg-surface-800 hidden sm:block" />

      <div className="flex items-center gap-1.5 text-surface-400">
        <Clock className="w-3.5 h-3.5 text-surface-600" />
        <span>Em fila:</span>
        <span className={cn(
          'font-semibold tabular-nums',
          status.queued > 10 ? 'text-away' : 'text-surface-100',
        )}>
          {status.queued}
        </span>
      </div>

      <div className="w-px h-4 bg-surface-800 hidden sm:block" />

      <div className="flex items-center gap-1.5 text-surface-400">
        <CheckCircle2 className="w-3.5 h-3.5 text-surface-600" />
        <span>Espera:</span>
        <span className={cn(
          'font-semibold tabular-nums',
          status.avgWaitSeconds > 180 ? 'text-danger' : status.avgWaitSeconds > 90 ? 'text-away' : 'text-online',
        )}>
          {formatWait(status.avgWaitSeconds)}
        </span>
      </div>
    </div>
  )
}
