import { StagePoster } from '@/components/landing/stage'
import { cn } from '@/lib/utils'
import { howItWorks, LANDING_ANCHORS } from '../landingCopy'

/**
 * Três quadros da MESMA conversa (IA → transferência → humano) no palco
 * compacto — o produto explicando o fluxo, em vez de ícone genérico.
 *
 * Corte de altura no celular (medido: 2111px, a seção mais pesada da página
 * em 390): 3 posters empilhados é 3× a altura de 1. A partir de md continua
 * 3 colunas com poster cada (o pedido do PO); abaixo de md só o 1º passo
 * mostra o quadro — os outros 2 viram lista compacta (título + texto).
 */
export function HowItWorks() {
  return (
    <section
      id={LANDING_ANCHORS.comoFunciona}
      data-section="como-funciona"
      className="scroll-mt-16 border-t border-surface-700 bg-surface-950 py-12 sm:py-16"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
        <h2 className="max-w-[24ch] font-display font-extrabold tracking-[-0.02em] leading-[1.1] text-surface-50 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          {howItWorks.title}
        </h2>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-surface-400">{howItWorks.lead}</p>

        <ol className="mt-6 grid gap-6 md:mt-8 md:grid-cols-3 md:gap-8">
          {howItWorks.steps.map((step, i) => (
            <li key={step.key} className="flex flex-col">
              {/* A altura do quadro é a proporção fixa do palco compacto (largura x
                  1,56): quem manda na altura da seção é a LARGURA do poster, por
                  isso o teto (300 no celular, 256 a partir de md). Só o 1º passo
                  mostra o quadro abaixo de md (P14: os outros dois continuam
                  reais lá em cima, em md+ — aqui é só corte de altura no
                  celular, não um passo "sem produto"). */}
              <div
                role="img"
                aria-label={step.posterLabel}
                className={cn('w-full max-w-[300px] md:max-w-[256px] mx-auto md:mx-0', i > 0 && 'hidden md:block')}
              >
                <StagePoster scene="inbox" frame={step.key} layout="compact" />
              </div>
              <h3 className={cn('font-display text-lg font-bold tracking-[-0.01em] text-surface-50', i === 0 ? 'mt-5' : 'mt-0 md:mt-5')}>
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-surface-400">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
