import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Cor do selo de lead score por banda: alta (verde) / média (âmbar) / baixa (vermelho).
 *  Mantém a escala que o ContactRow já usava no texto (>=80 / >=50), agora unificada
 *  num único selo cheio (.color-chip) para linha, kanban e lista mobile. */
function bandChip(score: number): string {
  if (score >= 80) return 'var(--color-status-active)'
  if (score >= 50) return 'var(--color-status-pending)'
  return 'var(--color-danger)'
}

interface LeadScorePillProps {
  score: number
  /** Mostra o ícone de estrela (padrão). Desligue onde já existe um rótulo "Lead score:". */
  showIcon?: boolean
  className?: string
}

/** Selo único de lead score — mesmo visual cheio em todos os contextos (linha, kanban, mobile). */
export function LeadScorePill({ score, showIcon = true, className }: LeadScorePillProps) {
  return (
    <span
      title={`Lead score: ${score}/100 — calculado pela IA a partir de engajamento, intenção e perfil. ${score >= 80 ? 'Lead quente' : score >= 50 ? 'Lead morno' : 'Lead frio'}.`}
      className={cn(
        'color-chip inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
        className,
      )}
      style={{ ['--chip']: bandChip(score) } as React.CSSProperties}
    >
      {showIcon && <Star className="w-2.5 h-2.5" />}
      {score}
    </span>
  )
}
