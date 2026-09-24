import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { finalCta, LANDING_ROUTES } from '../landingCopy'
import { ctaPrimary, ctaSize } from './ctaStyles'

/** Fecho: uma frase e um único caminho — a página termina em "Entrar". */
export function FinalCta() {
  return (
    <section
      data-section="cta"
      className="border-t border-surface-700 bg-surface-950 py-16 sm:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
        <div className="rounded-lg border border-surface-700 bg-surface-800 p-6 sm:p-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="max-w-[26ch] font-display font-extrabold tracking-[-0.02em] leading-[1.1] text-surface-50 text-[clamp(1.5rem,3vw,2.25rem)]">
            {finalCta.title}
          </h2>
          <Link to={LANDING_ROUTES.login} className={cn(ctaPrimary, ctaSize.lg, 'self-start sm:self-auto flex-none')}>
            {finalCta.cta}
          </Link>
        </div>
      </div>
    </section>
  )
}
