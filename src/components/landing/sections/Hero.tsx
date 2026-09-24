import { Link } from 'react-router-dom'
import { HeroStage } from '@/components/landing/stage'
import { cn } from '@/lib/utils'
import { hero, LANDING_ROUTES, LANDING_ANCHORS } from '../landingCopy'
import { ctaPrimary, ctaNeutral, ctaSize } from './ctaStyles'

/**
 * Headline + o produto operando logo abaixo (referência: hero da Attio). O H1
 * é grande e preciso, sem logo gigante, badge, palavra rotativa ou fundo
 * animado; teal só no CTA primário. O palco entra a 100% da coluna (máx. 1120).
 */
export function Hero() {
  return (
    <section
      id="inicio"
      data-section="hero"
      className={cn(
        'relative scroll-mt-16 pt-14 sm:pt-20 pb-16 sm:pb-24',
        // relevo sutil só de token: do degrau 900 ao piso 950
        'bg-[linear-gradient(to_bottom,var(--color-surface-900),var(--color-surface-950)_480px)]',
      )}
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
        <h1 className="font-display font-extrabold tracking-[-0.02em] leading-[1.04] text-surface-50 text-[clamp(2.25rem,5.6vw,4rem)]">
          {hero.titleLine1}{' '}
          <br className="hidden sm:block" />
          {hero.titleLine2}
        </h1>
        <p className="mt-5 max-w-[58ch] text-base sm:text-lg leading-relaxed text-surface-300">
          {hero.lead}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to={LANDING_ROUTES.login} className={cn(ctaPrimary, ctaSize.lg)}>
            {hero.primaryCta}
          </Link>
          <a href={`#${LANDING_ANCHORS.produto}`} className={cn(ctaNeutral, ctaSize.lg)}>
            {hero.secondaryCta}
          </a>
        </div>
      </div>

      <div
        role="region"
        aria-label={hero.stageLabel}
        className="mx-auto mt-12 sm:mt-16 w-full max-w-[1120px] px-4 sm:px-6"
      >
        <HeroStage scenes={['inbox', 'funil', 'disparo']} />
      </div>
    </section>
  )
}
