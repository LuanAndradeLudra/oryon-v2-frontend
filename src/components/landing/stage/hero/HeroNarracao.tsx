import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * A NARRAÇÃO — o que está acontecendo agora, numa pílula entre os títulos e o
 * palco.
 *
 * Decisão do PO (24/09): as anotações saíram de dentro das telas (poluíam a
 * cena) e vieram para cá, com as cores INVERTIDAS em relação ao tema — fundo
 * claro e texto escuro no tema escuro, o contrário no claro — para se
 * destacarem da página sem disputar com o produto. Os tokens `surface-50` e
 * `surface-950` já se invertem entre os temas, então a inversão é automática.
 *
 * A frase troca a cada acontecimento (desfoque → nítido), sincronizada com o
 * anel de luz que aponta o elemento dentro do palco.
 */
export function HeroNarracao({ texto, className }: { texto: string; className?: string }) {
  const semMovimento = useReducedMotion()
  return (
    <div className={cn('flex justify-center', className)} aria-live="polite">
      <div
        className={cn(
          'relative inline-flex min-h-[38px] max-w-full items-center gap-2.5 rounded-full px-4 py-2',
          'bg-surface-50 text-surface-950',
          'shadow-[0_10px_30px_-12px_rgba(0,0,0,.55)] [[data-theme=light]_&]:shadow-[0_10px_30px_-12px_rgba(11,13,24,.35)]',
        )}
      >
        <span aria-hidden className="relative flex h-2 w-2 flex-shrink-0">
          {!semMovimento && <span className="absolute inset-0 rounded-full bg-brand-500/60 animate-ping" />}
          <span className="relative h-2 w-2 rounded-full bg-brand-500" />
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={texto}
            className="text-[14px] font-semibold leading-snug tracking-[-0.01em]"
            initial={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -5, filter: 'blur(3px)' }}
            transition={{ duration: semMovimento ? 0 : 0.32, ease: 'easeOut' }}
          >
            {texto}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
