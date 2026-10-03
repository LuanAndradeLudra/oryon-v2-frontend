import { BotaoLanding } from '../ui/BotaoLanding'
import { Revelar } from '../plataforma/SecoesVenda'
import { home, LANDING_ROUTES } from '../landingCopy'

/**
 * A CHAMADA NO MEIO DA PÁGINA (ciclo noturno, 30/09): logo depois de o
 * visitante se reconhecer numa área, o próximo passo aparece — sem ele ter de
 * rolar até o formulário no fim.
 */
export function FaixaChamada() {
  const { chamada } = home
  return (
    // P6 da auditoria anti-genérico (30/09): sem card nem glow — o "CTA banner"
    // padrão. Tipografia grande sobre uma régua, e um botão.
    <section data-section="chamada" aria-label={chamada.titulo} className="landing-faixa-marca relative py-14 sm:py-16">
      <div className="landing-container">
        <Revelar>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
            <div className="max-w-[36rem]">
              <h2 className="font-display text-[clamp(1.6rem,2.8vw,2.3rem)] font-bold leading-[1.08] tracking-[-0.03em] text-surface-50 text-balance">
                {chamada.titulo}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-surface-300 sm:text-[16.5px] text-pretty">{chamada.texto}</p>
            </div>
            <BotaoLanding to={LANDING_ROUTES.demonstracao} tamanho="lg" seta className="rounded-lg self-start md:self-auto md:flex-none">
              {home.ctaPrincipal}
            </BotaoLanding>
          </div>
        </Revelar>
      </div>
    </section>
  )
}
