import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { SCHEDULE_AGENTS, SCHEDULE_TYPES } from './scheduleMock'

export type ScheduleViewMode = 'dia' | 'semana' | 'lista'

const VIEW_OPTIONS: { value: ScheduleViewMode; label: string }[] = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'lista', label: 'Lista' },
]

function FilterDropdown({
  label,
  activeLabel,
  options,
  value,
  onChange,
}: {
  label: string
  activeLabel: string
  options: readonly string[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dropdown
      open={open}
      onClose={() => setOpen(false)}
      align="right"
      className="min-w-[180px] p-1"
      anchor={
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="h-7 inline-flex items-center gap-[5px] rounded-sm border border-[var(--bd2)] px-[9px] text-xs font-semibold text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
        >
          {activeLabel}
          <ChevronDown className="w-3.5 h-3.5 text-surface-500" />
        </button>
      }
    >
      <DropdownItem onClick={() => { onChange(null); setOpen(false) }} active={value === null} icon={value === null ? Check : undefined}>
        {label}
      </DropdownItem>
      {options.map((opt) => (
        <DropdownItem
          key={opt}
          onClick={() => { onChange(opt); setOpen(false) }}
          active={value === opt}
          icon={value === opt ? Check : undefined}
        >
          {opt}
        </DropdownItem>
      ))}
    </Dropdown>
  )
}

interface ScheduleToolbarProps {
  periodLabel: string
  /** Semana ISO — canvas 2d: "semana 38". */
  weekNumber?: number
  viewMode: ScheduleViewMode
  onViewModeChange: (mode: ScheduleViewMode) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  agentFilter: string | null
  onAgentFilterChange: (v: string | null) => void
  typeFilter: string | null
  onTypeFilterChange: (v: string | null) => void
  /** Ação primária da página (PO 01/10: saiu da TopBar), à direita dos filtros. */
  actions?: React.ReactNode
}

export function ScheduleToolbar({
  periodLabel,
  weekNumber,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
  agentFilter,
  onAgentFilterChange,
  typeFilter,
  onTypeFilterChange,
  actions,
}: ScheduleToolbarProps) {
  return (
    <div className="flex items-center gap-2 h-11 px-4 border-b border-surface-700 bg-surface-800 flex-shrink-0 flex-wrap">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Semana anterior"
          className="w-7 h-7 inline-flex items-center justify-center rounded-sm border border-[var(--bd2)] text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Próxima semana"
          className="w-7 h-7 inline-flex items-center justify-center rounded-sm border border-[var(--bd2)] text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <Button size="sm" variant="neutral" onClick={onToday}>Hoje</Button>

      <div className="flex items-baseline min-w-0 ml-1.5">
        <span className="text-sm font-bold text-surface-100 truncate" style={{ letterSpacing: '-.01em' }}>{periodLabel}</span>
        <span className="text-xs font-medium text-surface-500 flex-shrink-0 ml-1">{viewMode}{weekNumber != null ? ` ${weekNumber}` : ''}</span>
      </div>

      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        <SegmentedControl label="Visualização" options={VIEW_OPTIONS} value={viewMode} onChange={onViewModeChange} />
        <FilterDropdown
          label="Todos os agentes"
          activeLabel={agentFilter ?? 'Todos os agentes'}
          options={SCHEDULE_AGENTS}
          value={agentFilter}
          onChange={onAgentFilterChange}
        />
        <FilterDropdown
          label="Tipo"
          activeLabel={typeFilter ?? 'Tipo'}
          options={SCHEDULE_TYPES}
          value={typeFilter}
          onChange={onTypeFilterChange}
        />
        {actions}
      </div>
    </div>
  )
}
