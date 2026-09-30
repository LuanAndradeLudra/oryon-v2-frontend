import type { Ref } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * A NARRAÇÃO — o que está acontecendo agora, numa pílula entre os títulos e o
 * palco.
 *
 * Decisão do PO (24/09): as anotações saíram de dentro das telas (poluíam a
 * cena) e vieram para cá, com as cores INVERTIDAS em relação ao tema — fundo
 * claro e texto escuro no tema escuro, o contrário no claro. Os tokens
 * `surface-50` e `surface-950` já se invertem entre os temas.
 *
 * Geometria estável (25/09): a FAIXA tem altura fixa por regime — uma linha a
 * partir de `sm` (a frase mais longa tem ~60 caracteres e cabe), duas no
 * celular — e a pílula fica centrada nela. Trocar de frase nunca empurra o
 * palco. A largura da pílula DESLIZA de uma frase para a outra (`layout`), em
 * vez de saltar. A pílula é o ponto de partida do conector até o alvo
 * (`HeroFoco`), por isso expõe a sua ref.
 */
export function HeroNarracao({ texto, className, pilulaRef }: {
  texto: string
  className?: string
  pilulaRef?: Ref<HTMLDivElement>
}) {
  const semMovimento = useReducedMotion()
  return (
    <div
      className={cn('flex h-[58px] sm:h-[40px] items-center justify-center', className)}
      aria-live="polite"
    >
      <motion.div
        ref={pilulaRef}
        layout={!semMovimento}
        transition={{ layout: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
        style={{ borderRadius: 999 }}
        className={cn(
          'relative inline-flex max-w-full items-center gap-2.5 px-4 py-2',
          'bg-surface-50 text-surface-950',
          'shadow-[0_10px_30px_-12px_rgba(0,0,0,.55)] [[data-theme=light]_&]:shadow-[0_10px_30px_-12px_rgba(11,13,24,.35)]',
        )}
      >
        <motion.span layout="position" aria-hidden className="relative flex h-2 w-2 flex-shrink-0">
          {!semMovimento && <span className="absolute inset-0 rounded-full bg-brand-500/60 animate-ping" />}
          <span className="relative h-2 w-2 rounded-full bg-brand-500" />
        </motion.span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={texto}
            layout="position"
            className="text-[13.5px] sm:text-[14px] font-semibold leading-[1.35] tracking-[-0.01em] text-balance"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(3px)' }}
            transition={{ duration: semMovimento ? 0 : 0.45, ease: 'easeOut' }}
          >
            {texto}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
