// ─── Category Pills (admin) ────────────────────────────────────────────────
// Replaces the <select> for category on the skill template editor. Pills are
// quicker to scan, surface the icon used elsewhere in the product (cards,
// tabs, assign flow), and keep the form visually anchored.

import { Stethoscope, Users, Calendar, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type CategoryKey = 'clinic' | 'crm' | 'calendar' | 'custom'

interface CategoryDef {
  value: CategoryKey
  label: string
  hint: string
  Icon: LucideIcon
}

// Order matters — the editor renders these left-to-right and we want the
// most common (clinic) at the front.
const CATEGORIES: CategoryDef[] = [
  { value: 'clinic',   label: 'Clínicas',    hint: 'Saúde, agendamento médico',          Icon: Stethoscope },
  { value: 'crm',      label: 'CRM',         hint: 'Vendas, contatos, oportunidades',    Icon: Users },
  { value: 'calendar', label: 'Calendário',  hint: 'Agendas e eventos genéricos',        Icon: Calendar },
  { value: 'custom',   label: 'Custom',      hint: 'Integrações específicas do cliente', Icon: Sparkles },
]

interface Props {
  value: string
  onChange: (next: CategoryKey) => void
  disabled?: boolean
}

export function CategoryPills({ value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label="Categoria" className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const active = value === cat.value
        return (
          <button
            key={cat.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(cat.value)}
            className={cn(
              'group inline-flex items-center gap-2 px-3 py-2 rounded-lg ring-1 transition-colors text-sm',
              active
                ? 'bg-status-active-bg text-status-active ring-status-active-border'
                : 'bg-surface-900 text-surface-300 ring-surface-700 hover:bg-surface-800 hover:text-surface-100',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            title={cat.hint}
          >
            <cat.Icon className="w-4 h-4" strokeWidth={1.75} />
            <span className="font-medium">{cat.label}</span>
          </button>
        )
      })}
    </div>
  )
}
