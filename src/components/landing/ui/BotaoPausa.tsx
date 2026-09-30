import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Pausar/retomar uma demonstração que roda sozinha (lote 4, 30/09): as duas
 * auditorias pedem controle para movimento automático com mais de 5 s. Mesmo
 * desenho do botão do palco do Hero.
 */
export function BotaoPausa({ pausado, onAlternar, className }: { pausado: boolean; onAlternar: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-pressed={pausado}
      aria-label={pausado ? 'Retomar a demonstração' : 'Pausar a demonstração'}
      className={cn(
        'inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-surface-400 transition-colors hover:bg-white/[.06] hover:text-surface-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    >
      {pausado ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
    </button>
  )
}
