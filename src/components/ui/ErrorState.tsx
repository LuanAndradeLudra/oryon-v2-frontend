// ─── Error State ─────────────────────────────────────────────────────────────
// Contraparte do EmptyState para falhas de carregamento. Uma falha de fetch
// NUNCA deve ser silenciada (`.catch(() => {})`) — o usuário precisa saber que
// houve erro (e não "0 resultados") e ter um caminho de recuperação.

import { AlertTriangle } from 'lucide-react'
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
        'flex flex-col items-center justify-center text-center rounded-xl',
        'bg-surface-900/40 border border-dashed border-surface-700',
        compact ? 'py-6 px-4' : 'py-16 px-6',
        className,
      )}
    >
      <AlertTriangle className={cn('text-warning mb-3', compact ? 'w-6 h-6' : 'w-10 h-10')} strokeWidth={1.5} />
      <p className={cn('text-surface-300 font-medium mb-1', compact && 'text-sm')}>{title}</p>
      {hint && <p className={cn('text-surface-500 max-w-md', compact ? 'text-xs' : 'text-sm')}>{hint}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-medium transition-colors"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
