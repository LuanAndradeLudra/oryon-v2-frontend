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

// Tamanhos por TOKEN, não por literal (`p1b-extra.html:67`). A régua do
// CHECKLIST: espaçamento compara NOMINAL, fonte compara EMITIDO.
//   · `h2` 22px      → `text-xl`, que EMITE 22 no desktop (nominal 20 × 110%)
//   · `.sd` 13,2px   → `text-xs`, que EMITE exatamente 13,2
//   · `.ax` altura 22 → `h-5.5` (22 nominal)
//   · `.sd` margin 3 → `mt-0.75` (3 nominal)
// O `.sd` estava em `text-[13px]`: além de literal, era o valor ERRADO — 13
// contra os 13,2 do mockup. Foi anotado como "desvio consciente de 0,2px" numa
// época em que a régua ainda não estava provada; com a régua certa não há
// desvio nenhum, o token casa exato. O `rounded-[3px]` da barra CONTINUA
// literal de propósito: nenhum token emite 3px (`--radius-xs` é 4).
export function SectionHeader({ title, description, accent, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4.5 pb-3.5 border-b border-surface-800">
      <div className="min-w-0">
        <h2 className="text-xl text-surface-50 font-bold flex items-center gap-2.5 leading-tight">
          <span
            // Barra `.ax` — decorativa: a cor repete o acento que a nav já
            // mostra no ícone da seção ativa, e o título ao lado já nomeia a
            // seção. Anunciá-la seria ruído.
            aria-hidden="true"
            className="w-1.5 h-5.5 rounded-[3px] shrink-0"
            style={{ backgroundColor: accentColor(accent) }}
          />
          <span className="truncate">{title}</span>
        </h2>
        {description && (
          <div className="text-xs text-surface-400 mt-0.75">{description}</div>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  )
}
