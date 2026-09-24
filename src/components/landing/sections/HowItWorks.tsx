import { StagePoster } from '@/components/landing/stage'
import { howItWorks, LANDING_ANCHORS } from '../landingCopy'

/**
 * Três quadros da MESMA conversa (IA → transferência → humano) no palco
 * compacto — o produto explicando o fluxo, em vez de ícone genérico.
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

        <ol className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
          {howItWorks.steps.map((step) => (
            <li key={step.key} className="flex flex-col">
              {/* A altura do quadro é a proporção fixa do palco compacto (largura x
                  1,56): quem manda na altura da seção é a LARGURA do poster, por
                  isso o teto (300 no celular, 256 a partir de md). */}
              <div role="img" aria-label={step.posterLabel} className="w-full max-w-[300px] md:max-w-[256px] mx-auto md:mx-0">
                <StagePoster scene="inbox" frame={step.key} layout="compact" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold tracking-[-0.01em] text-surface-50">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-surface-400">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
