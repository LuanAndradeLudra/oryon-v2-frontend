import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// Badges de estado do catálogo/modal (README §3.10): chip de STATUS = suave,
// via `.color-chip-soft` + `--chip` (só etiquetas usam `.color-chip` cheio).

interface StatusChipProps {
  label: string
  tone: 'success' | 'warning'
  icon?: React.ReactNode
  /** `lg` = chips do modal de detalhe (canvas 3d: h20 px7 11px). */
  size?: 'sm' | 'lg'
  className?: string
}

export function ConnectorStatusChip({ label, tone, icon, size = 'sm', className }: StatusChipProps) {
  return (
    <span
      className={cn(
        'color-chip-soft inline-flex items-center gap-1 rounded-[5px] border font-bold flex-shrink-0',
        size === 'lg' ? 'h-5 px-[7px] text-[11px]' : 'h-[18px] px-1.5 text-[10.5px]',
        className,
      )}
      style={{ ['--chip']: tone === 'success' ? 'var(--color-success)' : 'var(--color-warning)' } as React.CSSProperties}
    >
      {icon}
      {label}
    </span>
  )
}

export function ConnectorComingSoonChip({ size = 'sm', className }: { size?: 'sm' | 'lg'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[5px] border border-surface-700 bg-[var(--sf2)] font-bold text-surface-400 flex-shrink-0',
          size === 'lg' ? 'h-5 px-[7px] text-[11px]' : 'h-[18px] px-1.5 text-[10.5px]',
        className,
      )}
    >
      {/* Clock não existe no set da casa (cai no lucide real, traço 2 por
          padrão) — ao lado do Check/Lock (traço 1.75) nos outros badges do
          mesmo grid, ficava mais grosso. */}
      <Clock className="w-2.5 h-2.5" strokeWidth={1.75} />
      Em breve
    </span>
  )
}
