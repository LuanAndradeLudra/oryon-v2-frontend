import { Home, MessageSquare, Users, Kanban, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Trilho de módulos do shell — decorativo. Só módulos que existem e estão
 * ligados (Início, Conversas, Leads, Funis, Disparos); nada de
 * Agendamentos/Copilot/etc. Ativo = --rowhover + filete inset de marca (mesma
 * gramática da linha ativa da lista). Duas escalas literais (mobile/`lg:`,
 * razão 2×) — técnica da Attio (dissecção 24/09): sem `transform: scale`.
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
    <div className="w-[26px] lg:w-[52px] flex-shrink-0 flex flex-col items-center gap-0.5 lg:gap-1 py-1.5 lg:py-3 border-r border-[0.5px] lg:border-[1px] border-surface-700 bg-surface-900">
      {ITEMS.map(({ id, Icon }) => (
        <span
          key={id}
          className={cn(
            'w-4 h-4 lg:w-8 lg:h-8 rounded-[3px] lg:rounded-[6px] flex items-center justify-center text-surface-500',
            id === active && 'bg-[var(--rowhover)] text-surface-100 shadow-[inset_1px_0_0_0_var(--color-brand-500)] lg:shadow-[inset_2px_0_0_0_var(--color-brand-500)]',
          )}
        >
          <Icon className="w-2 h-2 lg:w-4 lg:h-4" strokeWidth={1.75} />
        </span>
      ))}
    </div>
  )
}
