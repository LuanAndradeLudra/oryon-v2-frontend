// ─── Tabs ─────────────────────────────────────────────────────────────────
// Tablist com indicador de sublinhado (2px) por aba — extraído do padrão
// hand-rolled já aprovado visualmente em AgentDetail.tsx (Fase 3 do plano de
// reestilização de Disparos/Agentes: consolidar a peça repetida antes de
// repintar, pra não duplicar trabalho quando o visual mudar de verdade na
// Fase 5). Marcação e comportamento preservados 1:1 do original — sem
// indicador animado/deslizante e sem navegação por seta entre abas, porque
// o original também não tinha nenhum dos dois.
//
// Sem padding horizontal / borda de container aqui de propósito — cada tela
// tem seu próprio espaçamento externo (AgentDetail usa `px-6`); passe pelo
// `className`.
//
// `accent` (Fase 5a): opcional, categórico — mesmos tokens de acento já
// usados em outros lugares do app pra distinguir categorias (métodos HTTP,
// ações de handoff, atribuição de campanha em `AttributionTab.tsx`). Só a
// aba ATIVA recebe a cor (inativas continuam neutras) — com 1 seção visível
// por vez, nunca se compara duas cores lado a lado; o objetivo é dar
// identidade a cada seção sem virar um arco-íris na tela. Sem `accent`,
// comportamento idêntico ao lift original (sublinhado/texto na cor da marca).
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TabAccent = 'blue' | 'green' | 'violet' | 'amber' | 'rose' | 'cyan'

// Classes completas e estáticas (o scanner do Tailwind não resolve
// `text-accent-${accent}` interpolado — precisa achar a string literal).
const ACCENT_CLASSES: Record<TabAccent, string> = {
  blue:   'text-accent-blue border-accent-blue',
  green:  'text-accent-green border-accent-green',
  violet: 'text-accent-violet border-accent-violet',
  amber:  'text-accent-amber border-accent-amber',
  rose:   'text-accent-rose border-accent-rose',
  cyan:   'text-accent-cyan border-accent-cyan',
}

export interface TabOption<T extends string> {
  id: T
  label: ReactNode
  icon?: ReactNode
  /** Cor categórica quando esta aba está ativa. Omitido = cor da marca (default). */
  accent?: TabAccent
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
      {tabs.map((tab) => {
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
              active
                ? tab.accent ? ACCENT_CLASSES[tab.accent] : 'text-surface-50 border-brand-500'
                : 'text-surface-500 border-transparent hover:text-surface-300',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
