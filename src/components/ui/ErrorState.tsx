// ─── Error State ─────────────────────────────────────────────────────────────
// Contraparte do EmptyState para falhas de carregamento. Uma falha de fetch
// NUNCA deve ser silenciada (`.catch(() => {})`) — o usuário precisa saber que
// houve erro (e não "0 resultados") e ter um caminho de recuperação.
//
// SCRUM-1097: mesmo vocabulário do EmptyState (spec 1a EMPTY-01..05) —
// moldura tracejada --bd2, raio 8, alinhado à esquerda, ícone 20px, 13/600,
// dica 12px --tx2, CTA Button neutral sm.

import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface Props {
  title?: string
  /** Detalhe opcional (ex.: mensagem da API já humanizada). */
  hint?: string
  onRetry?: () => void
  retryLabel?: string
  /** Variante compacta para regiões pequenas (painéis, cards). */
  compact?: boolean
  className?: string
}

export function ErrorState({
  title = 'Não foi possível carregar',
  hint = 'Verifique sua conexão e tente novamente.',
  onRetry,
  retryLabel = 'Tentar novamente',
  compact = false,
  className,
}: Props) {
  return (
    <div
      role="alert"
      className={cn(
        'mt-3 flex flex-col items-start gap-1.5 px-4 rounded-lg border border-dashed border-[var(--bd2)]',
        compact ? 'py-3' : 'py-[18px]',
        className,
      )}
    >
      <AlertTriangle className="w-5 h-5 text-warning" strokeWidth={1.75} />
      <p className="text-[13px] font-semibold text-surface-100">{title}</p>
      {hint && <p className="text-xs text-surface-400 leading-normal max-w-md">{hint}</p>}
      {onRetry && (
        <div className="mt-1">
          <Button type="button" variant="neutral" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
