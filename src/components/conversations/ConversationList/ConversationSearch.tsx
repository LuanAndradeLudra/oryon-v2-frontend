import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationSearchProps {
  value: string
  onChange: (v: string) => void
  className?: string
}

export function ConversationSearch({ value, onChange, className }: ConversationSearchProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar conversas"
        className={cn(
          'w-full h-7 pl-8 pr-8 rounded-sm text-xs',
          'bg-surface-800 border border-[var(--bd2)] text-surface-100',
          'placeholder:text-surface-500',
          'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
          'transition-all',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
