// ─── Ao Vivo — o pulso da operação ───────────────────────────────────────────
// Substitui a antiga faixa horizontal (RealtimeStrip) por um cartão vivo no
// rail do dashboard: as métricas de tempo real deixam de ser um rodapé de
// leitura passiva e viram o primeiro objeto que o gestor enxerga. O cartão
// muda de tom quando a operação entra em alerta (fila alta / espera longa).

import { Users, MessageSquare, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RealtimeStatus } from '@/types/dashboard'

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m`
}

export function LiveNowCard({ status }: { status: RealtimeStatus }) {
  const queueAlert = status.queued > 10
  const waitAlert = status.avgWaitSeconds > 180
  const critical = queueAlert || waitAlert

  // DASH-QUEUE-01/CARD-11: gradiente em texto de KPI é proibido pela README —
  // cor sólida neutra pras métricas de volume, `--warning` pras de fila/espera.
  const metrics = [
    {
      icon: Users, label: 'Usuários online',
      value: `${status.agentsOnline}/${status.agentsTotal}`,
      valueClass: 'text-surface-100',
    },
    {
      icon: MessageSquare, label: 'Conversas ativas',
      value: status.activeConversations.toLocaleString('pt-BR'),
      valueClass: 'text-surface-100',
    },
    {
      icon: Clock, label: 'Em fila',
      value: String(status.queued),
      valueClass: 'text-warning',
    },
    {
      icon: CheckCircle2, label: 'Espera média',
      value: formatWait(status.avgWaitSeconds),
      valueClass: 'text-warning',
    },
  ]

  return (
    <div
      role="status"
      aria-label="Métricas em tempo real"
      className={cn(
        // DASH-* transversal: --sf/--bd/raio 8, sem sombra/glow fora de overlay.
        'bg-surface-800 border border-surface-700 rounded-lg p-5 transition-colors',
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex w-2 h-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-online opacity-60" />
          <span className="relative inline-flex rounded-full w-2 h-2 bg-online" />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Ao Vivo</p>
        {critical && (
          <span className="ml-auto text-[10px] font-semibold text-white bg-warning px-1.5 py-0.5 rounded-full">
            Atenção
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {metrics.map(({ icon: Icon, label, value, valueClass }) => (
          <div key={label} className="min-w-0">
            <div className="flex items-center gap-1.5 text-surface-500 mb-1">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] truncate">{label}</span>
            </div>
            <p className={cn('text-xl font-display font-bold tabular-nums leading-none', valueClass)}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
