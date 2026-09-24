import { Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { nav, LANDING_ROUTES } from '../landingCopy'
import { ctaPrimary, ctaSize } from './ctaStyles'

/**
 * Nav fixa em vidro (64px). Âncoras só das seções que existem; "Entrar" é o
 * único CTA (teal). O botão de tema mostra o ícone do tema de DESTINO pelo
 * atributo `data-theme` do <html> (CSS) — sem ternário de tema no JSX.
 */
export function LandingNav() {
  const { toggle } = useTheme()

  return (
    <header
      data-section="nav"
      className={cn(
        'sticky top-0 z-40 h-16 border-b border-surface-700',
        // vidro só de token: piso da página a 72% + blur
        'bg-[color-mix(in_srgb,var(--color-surface-950)_72%,transparent)] backdrop-blur-md',
      )}
    >
      <div className="mx-auto h-full w-full max-w-[1120px] px-4 sm:px-6 flex items-center gap-6">
        <a
          href="#inicio"
          aria-label={nav.homeLabel}
          className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <img src="/oryon-logo.svg" alt="" className="w-7 h-7 select-none" draggable={false} />
          <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-surface-50">Oryon</span>
        </a>

        <nav aria-label="Seções da página" className="hidden md:flex items-center gap-6 ml-4">
          {nav.links.map((l) => (
            <a
              key={l.anchor}
              href={`#${l.anchor}`}
              className="text-[13px] font-medium text-surface-400 hover:text-surface-100 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={nav.themeToggleLabel}
            className="w-9 h-9 rounded-sm inline-flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {/* escuro (padrão): Sol (vai para o claro) · claro: Lua */}
            <Sun className="w-4 h-4 [[data-theme=light]_&]:hidden" strokeWidth={1.75} aria-hidden />
            <Moon className="w-4 h-4 hidden [[data-theme=light]_&]:block" strokeWidth={1.75} aria-hidden />
          </button>
          <Link to={LANDING_ROUTES.login} className={cn(ctaPrimary, ctaSize.md)}>
            {nav.cta}
          </Link>
        </div>
      </div>
    </header>
  )
}
