// ─── OnboardingStep ────────────────────────────────────────────────────────
// Uma linha do checklist (`.oi` do mockup): o marcador numerado à esquerda, o
// texto no meio, a ação à direita.
//
// UNIDADE: as medidas de caixa casam com a unidade do mockup. `--spacing` é
// `.25rem` e o desktop tem `:root{font-size:110%}`, então `p-4` desenha 17.6px,
// não 16. Onde o mockup escreve px literal (e aqui escreve em tudo), vai valor
// arbitrário literal.
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { accentColor, tint } from '@/components/ui/accentColor'
import type { StepStatus } from './onboardingState'

interface OnboardingStepProps {
  /** 1, 2 ou 3 — o número que o marcador mostra quando o passo não está feito. */
  index: number
  status: StepStatus
  title: string
  description: string
  /** Linha extra abaixo da descrição: o subtítulo da linha conectada, ou o
   *  chip de "em análise". Ausente quando não há dado — nunca uma frase de
   *  enchimento. */
  meta?: ReactNode
  /** Botão(ões) da direita. */
  action?: ReactNode
}

/** `.onb .oi.done .on` = verde a 14%; `.cur` = marca a 14% com anel; `.todo` =
 *  cinza. Verde aqui é FAMÍLIA DE STATUS (`--color-status-active`, #4ADE80),
 *  não acento categórico — o mockup pede exatamente esse hex. */
const MARKER_STYLE: Record<StepStatus, React.CSSProperties> = {
  done: {
    backgroundColor: 'color-mix(in srgb, var(--color-status-active) 14%, transparent)',
    color: 'var(--color-status-active)',
  },
  current: {
    backgroundColor: tint('brand', 14),
    color: accentColor('brand'),
    boxShadow: `0 0 0 1px ${tint('brand', 40)}`,
  },
  todo: {},
}

export function OnboardingStep({ index, status, title, description, meta, action }: OnboardingStepProps) {
  const done = status === 'done'
  return (
    <div
      className={cn(
        'grid grid-cols-[40px_1fr_auto] items-center gap-[16px] py-[16px] px-[28px]',
        'border-b border-surface-800 last:border-b-0',
        // `.onb .oi.todo{opacity:.6}` — o passo que ainda não é a vez fica
        // atrás, sem sumir: quem está começando precisa ver o caminho inteiro.
        status === 'todo' && 'opacity-60',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'w-[40px] h-[40px] rounded-[12px] flex items-center justify-center',
          'font-display font-bold text-[15px]',
          status === 'todo' && 'bg-surface-700 text-surface-500',
        )}
        style={MARKER_STYLE[status]}
      >
        {done ? <Check className="w-[18px] h-[18px]" /> : index}
      </span>

      <div className="min-w-0">
        <div className="font-semibold text-surface-100">{title}</div>
        <div className="text-xs text-surface-400">{description}</div>
        {meta && <div className="flex items-center gap-1.5 mt-2 flex-wrap">{meta}</div>}
      </div>

      <div className="flex flex-col gap-1.5 items-stretch">{action}</div>
    </div>
  )
}
