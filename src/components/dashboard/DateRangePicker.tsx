import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import type { DateRange } from '@/types/dashboard'

// PL-C2-FAR-1: só "Hoje"/"7 dias" — "30 dias" e "Este mês" saíram porque
// nenhuma fonte de dado do Dashboard (KPIs, VolumeChart) tem mais que 7 dias
// de janela hoje (`getMessagesAnalytics` no backend busca sempre `weekAgo`);
// oferecer as duas opções sem dado por trás era um controle inerte (P14).
// Reintroduzir quando o backend aceitar uma janela maior.
const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hoje'     },
  { value: '7d',    label: '7 dias'   },
]

// R2-DASH-03 (mock 1b): o período no slot da TopBar é UMA pílula de seleção
// ("Hoje ⌄": h28, raio 7, borda --bd2, 12/600), não um grupo de 4 botões.
export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  const [open, setOpen] = useState(false)
  const current = DATE_RANGE_OPTIONS.find((o) => o.value === value) ?? DATE_RANGE_OPTIONS[0]
  return (
    <Dropdown
      open={open}
      onClose={() => setOpen(false)}
      align="right"
      className="w-36"
      anchor={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bd2)] text-xs font-semibold text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
        >
          {current.label}
          <ChevronDown className="w-3 h-3 text-surface-500" />
        </button>
      }
    >
      <div className="px-1 py-1 flex flex-col gap-0.5">
        {DATE_RANGE_OPTIONS.map((opt) => (
          <DropdownItem
            key={opt.value}
            active={opt.value === value}
            onClick={() => { onChange(opt.value); setOpen(false) }}
          >
            {opt.label}
          </DropdownItem>
        ))}
      </div>
    </Dropdown>
  )
}
