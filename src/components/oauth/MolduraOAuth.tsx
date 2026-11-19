import type { ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { OryonLogo } from '@/components/brand/OryonLogo'

/** A curva das transições do OAuth: sai rápido e assenta devagar (sem "quique"). */
export const CURVA_SUAVE = [0.22, 1, 0.36, 1] as const

/**
 * ORY-96/97 — a moldura das telas do OAuth ("Conectar à Oryon" e a aprovação de ações):
 * logo da Oryon e um cartão centralizado, sem o app em volta. Claro e escuro pelos tokens.
 *
 * Revisão de 18/11 (pedido do João): transições suaves. O cartão entra com um leve deslize, a
 * largura muda sem salto e o conteúdo troca com um cruzamento (carregando → pedido → decidido).
 * Com "reduzir movimento" no sistema, sobra só o esmaecer (`MotionConfig reducedMotion="user"`).
 */
export function MolduraOAuth({
  titulo,
  children,
  largura = 'padrao',
  rodapeFixo = largura === 'larga',
  chave,
}: {
  titulo: string
  children: ReactNode
  /**
   * Tela de aprovação (18/11): `larga` para ler a ação inteira (a mensagem, o prompt novo…).
   * 19/11 (pedido do João): o consentimento usa `ampla` — duas colunas em tela grande, para caber
   * inteiro na tela, sem rolagem (com zoom de 125% também).
   */
  largura?: 'padrao' | 'larga' | 'ampla'
  /**
   * Os botões ficam presos no pé do cartão (a tela de aprovação): sem o espaço de baixo, para eles
   * não colarem na borda da tela. Padrão: só na largura larga, como antes.
   */
  rodapeFixo?: boolean
  /** Muda quando o conteúdo muda de etapa: o conteúdo antigo sai e o novo entra suavemente. */
  chave?: string
}) {
  // 19/11 (pedido do João): no consentimento (`ampla`), o bloco segue a altura da tela do
  // aparelho e a página não rola; o que não couber rola DENTRO do bloco (quem usa a moldura
  // separa o corpo que rola do rodapé fixo).
  const naAlturaDaTela = largura === 'ampla'
  return (
    <MotionConfig reducedMotion="user">
      {/* Revisão ORY-94 (2ª rodada): o app trava a rolagem no html/body/#root; fora do AppShell,
          a tela precisa rolar sozinha (senão "Aprovar" e "Recusar" ficam fora do alcance no celular).
          Tela de aprovação (larga): sem o espaço de baixo, os botões fixos colam na borda da tela
          (o `sticky` respeita o espaçamento interno da área que rola). */}
      <div
        className={`h-[100dvh] w-full bg-surface-950 flex flex-col items-center px-3 sm:px-4 ${
          naAlturaDaTela
            ? 'overflow-hidden pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]'
            : `overflow-y-auto overscroll-contain pt-[calc(2.5rem+env(safe-area-inset-top))] ${
                rodapeFixo ? 'pb-[env(safe-area-inset-bottom)]' : 'pb-[calc(2.5rem+env(safe-area-inset-bottom))]'
              }`
        }`}
      >
        <h1 className="sr-only">{titulo}</h1>
        <OryonLogo className={`shrink-0 text-surface-50 select-none ${naAlturaDaTela ? 'h-6 sm:h-7 mb-3 sm:mb-4' : 'h-7 mb-6'}`} />
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: CURVA_SUAVE }}
          className={`w-full ${
            naAlturaDaTela
              ? 'max-w-2xl lg:max-w-5xl min-h-0 shrink flex flex-col overflow-hidden'
              : largura === 'larga'
                ? 'max-w-2xl shrink-0'
                : 'max-w-md shrink-0'
          } bg-surface-800 rounded-[12px] p-4 sm:p-6 transition-[max-width] duration-300 ease-out motion-reduce:transition-none`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={chave ?? 'conteudo'}
              className={naAlturaDaTela ? 'min-h-0 flex flex-col' : undefined}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: CURVA_SUAVE }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>
    </MotionConfig>
  )
}
