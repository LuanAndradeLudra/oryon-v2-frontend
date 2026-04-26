import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max: number
  className?: string
  colorClass?: string
  showLabel?: boolean
}

export function ProgressBar({ value, max, className, colorClass, showLabel = false }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const color = colorClass ?? (pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-away' : 'bg-online')

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-surface-400">{value.toLocaleString('pt-BR')} usadas</span>
          <span className="text-xs text-surface-400">{max.toLocaleString('pt-BR')} total</span>
        </div>
      )}
    </div>
  )
}
