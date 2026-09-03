// ─── Tabs ─────────────────────────────────────────────────────────────────
// Tablist com indicador de sublinhado (2px) por aba — extraído do padrão
// hand-rolled já aprovado visualmente em AgentDetail.tsx (Fase 3 do plano de
// reestilização de Disparos/Agentes: consolidar a peça repetida antes de
// repintar, pra não duplicar trabalho quando o visual mudar de verdade na
// Fase 5). Comportamento e marcação preservados 1:1 do original — isto é
// extração, não redesenho: sem indicador animado/deslizante e sem navegação
// por seta entre abas, porque o original também não tinha nenhum dos dois.
//
// Sem padding horizontal / borda de container aqui de propósito — cada tela
// tem seu próprio espaçamento externo (AgentDetail usa `px-6`); passe pelo
// `className`.

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabOption<T extends string> {
  id: T
  label: ReactNode
  icon?: ReactNode
}

interface TabsProps<T extends string> {
  tabs: TabOption<T>[]
  value: T
  onChange: (id: T) => void
  /** aria-label do grupo (obrigatório para leitores de tela). */
  label: string
  className?: string
}

export function Tabs<T extends string>({ tabs, value, onChange, label, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex items-center gap-1 border-b border-surface-800/60 flex-shrink-0 overflow-x-auto', className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
            value === tab.id
              ? 'text-surface-50 border-brand-500'
              : 'text-surface-500 border-transparent hover:text-surface-300',
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
