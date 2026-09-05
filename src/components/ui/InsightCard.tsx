// ─── InsightCard ───────────────────────────────────────────────────────────
// Cartão de atenção/sugestão — extraído de `.att` (`design-system/fluxos-src/
// p1b-extra.html`), usado no Command Deck (Atenção/Pulso), Workspace
// (Conhecimento), Agenda, Composer e Construtor de público. `tone='dashed'`
// é o padrão específico de "Sugestão da IA" (borda tracejada, fundo
// transparente, ícone sparkles, accent='brand') visto em todas essas telas.
//
// NOTA: existe uma função local (não exportada) de mesmo nome em
// `src/components/dashboard/AiInsightsSection.tsx` — anatomia diferente
// (framer-motion, chip de categoria + prioridade), tela fora deste épico.
// Sem colisão de import (a outra é module-local, nunca exportada).
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { accentColor, tint, type Accent } from './accentColor'

interface InsightCardProps {
  icon: ReactNode
  accent?: Accent
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
  tone?: 'default' | 'dashed'
  className?: string
}

export function InsightCard({
  icon,
  accent = 'brand',
  title,
  description,
  actions,
  tone = 'default',
  className,
}: InsightCardProps) {
  const dashed = tone === 'dashed'

  return (
    <div
      className={cn(
        'rounded-2xl border border-surface-700 p-3 flex gap-3 items-start',
        dashed ? 'border-dashed bg-transparent' : 'bg-surface-800',
        className,
      )}
    >
      <span
        className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 [&>svg]:w-[15px] [&>svg]:h-[15px]"
        style={{ backgroundColor: tint(accent, 16), color: accentColor(accent) }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.2px] font-semibold text-surface-100">{title}</div>
        <div className="text-xs text-surface-400 mt-0.5 leading-relaxed">{description}</div>
        {actions && <div className="flex gap-1.5 mt-2">{actions}</div>}
      </div>
    </div>
  )
}
