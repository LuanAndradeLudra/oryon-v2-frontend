import { Link } from 'react-router-dom'
import { footer, LANDING_ROUTES } from '../landingCopy'

/** Logo, © e "Entrar". Sem redes sociais nem contato públicos (decisão do PO). */
export function Footer() {
  return (
    <footer data-section="footer" className="border-t border-surface-700 bg-surface-950">
      <div className="landing-container py-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <img src="/oryon-logo.svg" alt="" className="w-6 h-6 select-none" draggable={false} />
          <span className="font-display text-sm font-bold tracking-[-0.01em] text-surface-50">{footer.homeLabel}</span>
        </div>
        <span className="text-xs text-surface-400">{footer.legal}</span>
        <Link
          to={LANDING_ROUTES.login}
          className="ml-auto text-[13px] font-medium text-surface-300 hover:text-surface-50 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {footer.cta}
        </Link>
      </div>
    </footer>
  )
}
