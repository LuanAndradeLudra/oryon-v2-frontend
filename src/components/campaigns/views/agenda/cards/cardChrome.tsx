// ─── Peças compartilhadas dos cartões da agenda ────────────────────────────
// O `.evc` do mockup: grid de 3 colunas (identidade / miolo / ações) com
// variação de borda e fundo por estado.
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CardTone = 'default' | 'sending' | 'paused' | 'failed' | 'draft' | 'cancelled'

const toneClass: Record<CardTone, string> = {
  default:   'border-surface-700 bg-surface-800',
  sending:   'border-status-pending/40 bg-linear-90 from-status-pending/6 from-0% to-surface-800 to-40%',
  // `paused` NÃO herda a moldura neutra do `default`: pausada e enviando
  // aparecem lado a lado no mesmo dia oferecendo ações opostas (Retomar x
  // Pausar), e sem borda própria a única diferença entre os dois cartões seria
  // a palavra do botão. Borda tracejada além da cor: no tema claro os dois
  // âmbares são próximos, e forma separa onde luminância sozinha não separa.
  paused:    'border-status-paused/55 border-dashed bg-surface-800',
  failed:    'border-danger/35 bg-surface-800',
  draft:     'border-surface-700 border-dashed bg-transparent',
  // Cancelada continua no dia em que estava agendada, esmaecida e sem ações:
  // sumir com ela deixaria a tela mentindo sobre o que aconteceu no dia
  // (decisão 10 do Maestro).
  cancelled: 'border-surface-800 bg-transparent opacity-55',
}

interface CardFrameProps {
  tone?: CardTone
  title: ReactNode
  meta?: ReactNode
  middle?: ReactNode
  actions?: ReactNode
}

export function CardFrame({ tone = 'default', title, meta, middle, actions }: CardFrameProps) {
  return (
    <div
      className={cn(
        'rounded-[18px] border py-[14px] px-4 mb-2.5 transition-colors',
        'grid gap-[18px] items-center',
        'grid-cols-1 md:grid-cols-[1.5fr_1fr_auto]',
        toneClass[tone],
        tone !== 'cancelled' && 'hover:border-surface-600',
      )}
    >
      <div className="min-w-0">
        <div className="text-[15.4px] font-semibold text-surface-100 flex items-center gap-2 flex-wrap">
          {title}
        </div>
        {meta && (
          <div className="text-[12.5px] text-surface-400 mt-[3px] flex gap-1.5 items-center flex-wrap">
            {meta}
          </div>
        )}
      </div>
      <div className="min-w-0">{middle}</div>
      <div className="flex gap-1 items-center justify-end">{actions}</div>
    </div>
  )
}

/** `<code>` do mockup — nome técnico do template. */
export function CodeTag({ children }: { children: ReactNode }) {
  return (
    <code className="text-[11px] bg-surface-700 px-1.5 py-px rounded text-surface-200">
      {children}
    </code>
  )
}

export function MetaSeparator() {
  return <span aria-hidden="true" className="text-surface-600">·</span>
}
