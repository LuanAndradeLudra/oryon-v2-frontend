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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar conversas..."
        className={cn(
          'w-full pl-9 pr-9 py-2 rounded-lg text-sm',
          'bg-surface-800 border border-surface-700 text-surface-100',
          'placeholder:text-surface-500',
          'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
          'transition-all'
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
