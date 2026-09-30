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
    <section data-section="chamada" aria-label={chamada.titulo} className="relative bg-[var(--landing-palco)] pb-16 sm:pb-20">
      <div className="landing-container">
        <Revelar>
          <div className="relative overflow-hidden rounded-3xl bg-[var(--landing-cartao)] px-6 py-8 ring-1 ring-[var(--landing-borda)] sm:px-10 sm:py-10">
            {/* O brilho da marca vem de um canto, sem competir com o texto. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-32 h-[340px] w-[520px] rounded-full opacity-60 blur-3xl"
              style={{ background: 'radial-gradient(closest-side, rgba(45,212,191,.22), transparent)' }}
            />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
              <div className="max-w-[40rem]">
                <h2 className="font-display text-[clamp(1.35rem,2.2vw,1.85rem)] font-bold leading-[1.12] tracking-[-0.025em] text-surface-50 text-balance">
                  {chamada.titulo}
                </h2>
                <p className="mt-2.5 text-[15px] leading-relaxed text-surface-400 sm:text-[16px] text-pretty">{chamada.texto}</p>
              </div>
              <BotaoLanding to={LANDING_ROUTES.demonstracao} tamanho="lg" seta className="self-start md:self-auto md:flex-none">
                {home.ctaPrincipal}
              </BotaoLanding>
            </div>
          </div>
        </Revelar>
      </div>
    </section>
  )
}
