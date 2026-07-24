import { cn } from '@/lib/utils'

interface RadioOptionListProps {
  /** Groups the native radios so keyboard arrow-nav and a11y stay correct. */
  name: string
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  /** Renders an extra "no selection" radio at the top, e.g. "Nenhum setor". Omit to force a selection. */
  noneLabel?: string
  emptyMessage?: string
  className?: string
}

function RadioOptionRow({ name, checked, label, onSelect }: { name: string; checked: boolean; label: string; onSelect: () => void }) {
  return (
    <label
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none',
        checked ? 'border-brand-500/60 bg-brand-900/20' : 'border-surface-700 hover:border-surface-600',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="accent-brand-500"
      />
      <span className="text-sm text-surface-200">{label}</span>
    </label>
  )
}

/** Single-select list of radio rows — for backend fields that hold exactly one value (e.g. departmentId). */
export function RadioOptionList({ name, options, value, onChange, noneLabel, emptyMessage, className }: RadioOptionListProps) {
  return (
    <div className={cn('flex flex-col gap-1 max-h-40 overflow-y-auto', className)}>
      {noneLabel && (
        <RadioOptionRow name={name} checked={value === ''} label={noneLabel} onSelect={() => onChange('')} />
      )}
      {options.map((opt) => (
        <RadioOptionRow key={opt.id} name={name} checked={value === opt.id} label={opt.label} onSelect={() => onChange(opt.id)} />
      ))}
      {options.length === 0 && emptyMessage && (
        <p className="text-xs text-surface-500 px-1">{emptyMessage}</p>
      )}
    </div>
  )
}
