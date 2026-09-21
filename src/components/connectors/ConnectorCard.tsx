import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ConnectorStatusChip, ConnectorComingSoonChip } from './ConnectorBadges'
import { ConnectorTile } from './ConnectorTile'
import type { Connector } from './connectorsMock'

const STATUS_BADGE: Partial<Record<Connector['status'], { label: string; tone: 'success' | 'warning'; icon?: typeof Check }>> = {
  installed: { label: 'Instalado', tone: 'success', icon: Check },
  business: { label: 'Business', tone: 'warning', icon: Lock },
}

interface ConnectorCardProps {
  connector: Connector
  onOpen: () => void
}

export function ConnectorCard({ connector, onOpen }: ConnectorCardProps) {
  const badge = STATUS_BADGE[connector.status]
  const comingSoon = connector.status === 'comingSoon'

  const cta = (() => {
    if (connector.status === 'installed') return { label: 'Gerenciar', variant: 'neutral' as const }
    if (connector.status === 'business') return { label: 'Ver planos', variant: 'neutral' as const }
    if (connector.status === 'comingSoon') return { label: 'Priorizar', variant: 'ghost' as const }
    return { label: 'Conectar', variant: 'primary' as const }
  })()

  const metric = connector.status === 'installed'
    ? `${connector.agentsUsing ?? 0} agente${connector.agentsUsing === 1 ? '' : 's'}`
    : comingSoon
      ? (connector.requestCount != null ? `${connector.requestCount} pedidos` : undefined)
      : undefined

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex flex-col text-left rounded-lg border bg-surface-800 p-3.5 gap-2.5 transition-colors',
        comingSoon
          ? 'border-dashed border-[var(--bd2)]'
          : 'border-surface-700',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <ConnectorTile connector={connector} />
        {comingSoon ? (
          <ConnectorComingSoonChip />
        ) : badge && (
          <ConnectorStatusChip label={badge.label} tone={badge.tone} icon={badge.icon && <badge.icon className="w-2.5 h-2.5" />} />
        )}
      </div>

      <div className="min-w-0">
        <p className={cn('text-[13px] font-semibold truncate', comingSoon ? 'text-surface-400' : 'text-surface-100')}>
          {connector.name}
        </p>
        <p className="text-2xs text-surface-500 truncate">{connector.category} · por {connector.vendor}</p>
      </div>

      <p className={cn('text-xs leading-[1.45] flex-1', comingSoon ? 'text-surface-500' : 'text-surface-400')}>
        {connector.description}
      </p>

      <div className={cn('flex items-center gap-2 pt-0.5', metric ? 'justify-between' : 'justify-end')}>
        {metric && <span className={cn('text-2xs', comingSoon ? 'text-surface-500' : 'text-surface-400')}>{metric}</span>}
        <Button
          size="sm"
          variant={cta.variant}
          className={cta.variant === 'ghost' ? 'text-surface-400' : undefined}
          onClick={(e) => { e.stopPropagation(); onOpen() }}
        >
          {cta.label}
        </Button>
      </div>
    </button>
  )
}
