import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationSearchProps {
  value: string
  onChange: (v: string) => void
  className?: string
}

const DEBOUNCE_MS = 300

export function ConversationSearch({ value, onChange, className }: ConversationSearchProps) {
  // SCRUM-1096 — a busca passou a casar também por CONTEÚDO de mensagem
  // (EXISTS + GIN em `messages`), bem mais pesada que o ILIKE de contato que
  // existia antes. Sem debounce, cada tecla disparava um fetch completo.
  // `draft` é o que o input mostra na hora (digitação sempre responsiva);
  // `onChange` (que dispara o fetch, via `filters.search` no componente pai)
  // só é chamado 300ms depois de parar de digitar.
  const [draft, setDraft] = useState(value)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Mudança vinda de fora (ex.: "limpar filtros" no componente pai) precisa
  // refletir no input mesmo sem o usuário ter digitado nada.
  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (draft === value) return
    timeoutRef.current = setTimeout(() => onChangeRef.current(draft), DEBOUNCE_MS)
    return () => clearTimeout(timeoutRef.current)
  }, [draft, value])

  const clear = () => {
    clearTimeout(timeoutRef.current)
    setDraft('')
    onChangeRef.current('')
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
      <input
        type="search"
        inputMode="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Buscar conversas ou mensagens..."
        className={cn(
          'w-full pl-9 pr-9 py-2 rounded-lg text-sm',
          'bg-surface-800 border border-surface-700 text-surface-100',
          'placeholder:text-surface-500',
          'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
          'transition-all',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      {draft && (
        <button
          onClick={clear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
