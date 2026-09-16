// ─── Tabs ─────────────────────────────────────────────────────────────────
// Tablist com indicador de sublinhado (2px) por aba — bate com a tela 1a
// (SCRUM-1097): rótulos simples, sublinhado só na ativa, contador numérico
// opcional ao lado do rótulo (`count`, ex. "Negócios 4"). Sem indicador
// animado/deslizante e sem navegação por seta entre abas — o mockup não
// pede nenhum dos dois.
//
// Sem padding horizontal / borda de container aqui de propósito — cada tela
// tem seu próprio espaçamento externo (AgentDetail usa `px-6`); passe pelo
// `className`.
//
// `accent`: opcional, categórico — mesmos tokens de acento já usados em
// outros lugares do app pra distinguir categorias (métodos HTTP, ações de
// handoff, atribuição de campanha em `AttributionTab.tsx`). Só a aba ATIVA
// recebe a cor (inativas continuam neutras) — com 1 seção visível por vez,
// nunca se compara duas cores lado a lado; o objetivo é dar identidade a
// cada seção sem virar um arco-íris na tela. Sem `accent`, sublinhado/texto
// na cor da marca (default).
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
  /** Contador opcional ao lado do rótulo (tela 1a: "Negócios 4"). Omitido =
   *  sem número — não invente uma contagem que o chamador não tem de verdade. */
  count?: number
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
            {tab.count !== undefined && (
              <span className={cn('text-[11px]', active ? 'text-surface-300' : 'text-surface-600')}>{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
