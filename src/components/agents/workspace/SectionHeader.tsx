// ─── Cabeçalho de seção (A2 / SCRUM-1013) ────────────────────────────────────
// `.sech` do mockup: barra de acento + título + descrição à esquerda, ações à
// direita. Deixado de fora da fatia 2 de propósito — enquanto as seções eram
// wrappers finos sobre tabs que já têm título próprio, ele duplicaria o
// cabeçalho. Entra junto com o restyle de cada seção.

import type { ReactNode } from 'react'
import { accentColor, type Accent } from '@/components/ui/accentColor'

interface SectionHeaderProps {
  title: string
  /** `.sd` — uma linha dizendo o que a seção faz. */
  description?: ReactNode
  accent: Accent
  /** Botões/chips à direita (`Editar`, `Regenerar`, `Conectar`…). */
  actions?: ReactNode
}

export function SectionHeader({ title, description, accent, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4.5 pb-3.5 border-b border-surface-800">
      <div className="min-w-0">
        <h2 className="text-[22px] text-surface-50 font-bold flex items-center gap-2.5 leading-tight">
          <span
            // Barra `.ax` — decorativa: a cor repete o acento que a nav já
            // mostra no ícone da seção ativa, e o título ao lado já nomeia a
            // seção. Anunciá-la seria ruído.
            aria-hidden="true"
            className="w-1.5 h-[22px] rounded-[3px] shrink-0"
            style={{ backgroundColor: accentColor(accent) }}
          />
          <span className="truncate">{title}</span>
        </h2>
        {description && (
          <div className="text-[13px] text-surface-400 mt-[3px]">{description}</div>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  )
}
