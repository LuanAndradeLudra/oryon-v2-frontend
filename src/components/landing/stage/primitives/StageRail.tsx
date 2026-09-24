import { Home, MessageSquare, Users, Kanban, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Trilho de módulos do shell — decorativo. Só módulos que existem e estão ligados
 * (Início, Conversas, Leads, Funis, Disparos); nada de Agendamentos/Copilot/etc.
 * Ativo = --rowhover + inset 2px brand (mesma gramática da linha ativa da lista).
 */
const ITEMS = [
  { id: 'home', Icon: Home },
  { id: 'inbox', Icon: MessageSquare },
  { id: 'leads', Icon: Users },
  { id: 'funil', Icon: Kanban },
  { id: 'disparo', Icon: Megaphone },
] as const

export function StageRail({ active }: { active: (typeof ITEMS)[number]['id'] }) {
  return (
    <div className="w-[52px] flex-shrink-0 flex flex-col items-center gap-1 py-3 border-r border-surface-700 bg-surface-900">
      {ITEMS.map(({ id, Icon }) => (
        <span
          key={id}
          className={cn(
            'w-8 h-8 rounded-sm flex items-center justify-center text-surface-500',
            id === active && 'bg-[var(--rowhover)] text-surface-100 shadow-[inset_2px_0_0_0_var(--color-brand-500)]',
          )}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </span>
      ))}
    </div>
  )
}
