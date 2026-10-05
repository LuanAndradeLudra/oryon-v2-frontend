import { Link } from 'react-router-dom'
import { footer, rodape, LANDING_ROUTES } from '../landingCopy'
import { OryonLogo } from '@/components/brand/OryonLogo'

/** Logo, © e o mapa das páginas públicas. Sem redes sociais nem contato
 *  públicos (decisão do PO); a conversão é o pedido de demonstração. */
export function Footer() {
  return (
    <footer data-section="footer" className="border-t border-surface-700 bg-surface-950">
      <div className="landing-container grid gap-8 py-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
        <div className="flex flex-col gap-3">
          {/* Assinatura horizontal com 22 px de altura (98 px de largura: o
              mínimo do kit é 96). O nome acessível vem do link. */}
          <Link to={LANDING_ROUTES.home} aria-label={footer.homeLabel} className="flex w-fit items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <OryonLogo decorativa className="h-[22px] text-surface-50 select-none" />
          </Link>
          <p className="max-w-[34ch] text-[13px] leading-relaxed text-surface-400">{footer.frase}</p>
        </div>
        {rodape.grupos.map((g) => (
          <nav key={g.titulo} aria-label={g.titulo}>
            <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-surface-500">{g.titulo}</p>
            <ul className="mt-3 space-y-2">
              {g.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="rounded-sm text-[13px] text-surface-300 transition-colors hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      {/* © à esquerda e a entrada de quem já é cliente à direita, na mesma barra
          (ciclo noturno, 30/09: o Entrar sozinho parecia sobra). */}
      <div className="landing-container flex flex-wrap items-center justify-between gap-3 border-t border-surface-800 py-4">
        <span className="text-xs text-surface-500">{footer.legal}</span>
        <span className="text-[13px] text-surface-500">
          {footer.jaCliente}{' '}
          <Link
            to={LANDING_ROUTES.login}
            className="text-[13px] font-medium text-surface-300 hover:text-surface-50 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {footer.cta}
          </Link>
        </span>
      </div>
    </footer>
  )
}
