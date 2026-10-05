import type { Ref } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * A NARRAÇÃO — o que está acontecendo agora, numa pílula entre os títulos e o
 * palco.
 *
 * Decisão do PO (24/09): as anotações saíram de dentro das telas (poluíam a
 * cena) e vieram para cá. Até 30/09 a pílula tinha as cores INVERTIDAS em
 * relação ao tema; com os botões do Hero (cápsula clara), ela virou vidro
 * com texto claro para não parecer um botão (decisão do PO, 30/09).
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
          // 30/09 (PO): vidro com texto claro — antes era uma cápsula CLARA, igual
          // ao botão principal logo acima, e parecia clicável. Agora o único
          // elemento cheio e claro do Hero é a ação principal; a legenda é
          // narração e pertence visualmente à demonstração.
          'bg-[color-mix(in_srgb,var(--color-surface-900)_72%,transparent)] text-surface-100 backdrop-blur-md',
          'ring-1 ring-inset ring-[var(--landing-borda)]',
          // Tema claro: o vidro sumia no fundo claro do Hero — cápsula branca
          // sólida, contorno de verdade e texto escuro (o botão lá é preto).
          '[[data-theme=light]_&]:bg-white [[data-theme=light]_&]:ring-[#C6C6CC] [[data-theme=light]_&]:text-[#18181B]',
          'shadow-[0_10px_30px_-14px_rgba(0,0,0,.6)] [[data-theme=light]_&]:shadow-[0_8px_24px_-14px_rgba(11,13,24,.25)]',
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
            className="text-center text-[13.5px] sm:text-[14px] font-medium leading-[1.35] tracking-[-0.01em] text-balance"
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
