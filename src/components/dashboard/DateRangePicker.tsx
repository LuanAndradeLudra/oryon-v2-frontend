import { cn } from '@/lib/utils'
import type { DateRange } from '@/types/dashboard'

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hoje'     },
  { value: '7d',    label: '7 dias'   },
  { value: '30d',   label: '30 dias'  },
  { value: 'month', label: 'Este mês' },
]

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  return (
    <div className="flex items-center rounded-xl bg-surface-900 border border-surface-800 p-0.5 gap-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-brand-600 text-surface-950'
              : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
