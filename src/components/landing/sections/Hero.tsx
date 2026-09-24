import { HeroStage } from '@/components/landing/stage'
import { LinkButton } from '@/components/ui/LinkButton'
import { cn } from '@/lib/utils'
import { hero, LANDING_ROUTES, LANDING_ANCHORS } from '../landingCopy'

/**
 * Headline + o produto operando logo abaixo (referência: hero da Attio, HTML
 * dissecado em 24/09). Duas medições próprias deles, replicadas aqui:
 *
 * 1. Tipografia ATADA À ALTURA da viewport (`svh`), não à largura: o H1 sempre
 *    assenta na dobra, em vez de crescer até empurrar o palco para fora da tela
 *    em telas baixas/largas (1440×900 é o caso medido). `clamp(40px, 16px +
 *    5.333svh, 72px)` — mobile mede mais baixo (svh pequeno) que desktop.
 * 2. Entrada por desfoque→nítido (`.reveal`, token do orquestrador), NÃO
 *    deslizamento nem framer-motion: escalonada por `--d` em H1 → parágrafo →
 *    CTAs → palco, 90ms entre cada.
 */
export function Hero() {
  return (
    <section
      id="inicio"
      data-section="hero"
      className={cn(
        'relative scroll-mt-16 pt-12 sm:pt-14 pb-12 sm:pb-16',
        // relevo sutil só de token: do degrau 900 ao piso 950
        'bg-[linear-gradient(to_bottom,var(--color-surface-900),var(--color-surface-950)_480px)]',
      )}
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
        <h1
          className="reveal font-display font-extrabold text-surface-50 text-[clamp(40px,16px+5.333svh,72px)] leading-[0.95] tracking-[clamp(-2.2px,2.08px-0.3733svh,-1.1px)]"
          style={{ ['--d' as string]: '0ms' }}
        >
          {hero.titleLine1}{' '}
          <br className="hidden sm:block" />
          {hero.titleLine2}
        </h1>
        <p
          className="reveal mt-5 max-w-[58ch] text-base sm:text-lg leading-relaxed text-surface-400"
          style={{ ['--d' as string]: '90ms' }}
        >
          {hero.lead}
        </p>
        <div
          className="reveal mt-8 flex flex-wrap items-center gap-3"
          style={{ ['--d' as string]: '180ms' }}
        >
          <LinkButton to={LANDING_ROUTES.login} size="lg">{hero.primaryCta}</LinkButton>
          <LinkButton href={`#${LANDING_ANCHORS.produto}`} variant="neutral" size="lg">{hero.secondaryCta}</LinkButton>
        </div>
      </div>

      <div
        role="region"
        aria-label={hero.stageLabel}
        className="reveal mx-auto mt-10 sm:mt-12 w-full max-w-[1120px] px-4 sm:px-6"
        style={{ ['--d' as string]: '270ms' }}
      >
        <HeroStage scenes={['inbox', 'funil', 'disparo']} />
      </div>
    </section>
  )
}
