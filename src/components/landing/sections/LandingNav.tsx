import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { BotaoLanding } from '../ui/BotaoLanding'
import { cn } from '@/lib/utils'
import { nav, home, LANDING_ROUTES, paginasPlataforma, rotaPlataforma } from '../landingCopy'

/**
 * Nav fixa em vidro (64px) das páginas públicas (30/09: home de venda +
 * páginas de produto, modelo Attio). "Plataforma" abre o menu das páginas de
 * produto; "Para a sua área" e "Perguntas" são páginas. À direita, "Entrar"
 * (neutro, para quem já é cliente) e a conversão: "Agendar demonstração".
 * O botão de tema mostra o ícone do tema de DESTINO pelo atributo
 * `data-theme` do <html> (CSS) — sem ternário de tema no JSX.
 */
const LINKS = [
  { label: 'Para a sua área', to: LANDING_ROUTES.solucoes },
  { label: 'Perguntas', to: LANDING_ROUTES.perguntas },
] as const

export function LandingNav() {
  const { pathname } = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const gatilhoRef = useRef<HTMLButtonElement>(null)

  // Fecha ao navegar.
  useEffect(() => { setMenuAberto(false) }, [pathname])

  useEffect(() => {
    if (!menuAberto) return
    const fecharFora = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuAberto(false)
    }
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuAberto(false)
      gatilhoRef.current?.focus()
    }
    document.addEventListener('pointerdown', fecharFora)
    document.addEventListener('keydown', fecharComEscape)
    return () => {
      document.removeEventListener('pointerdown', fecharFora)
      document.removeEventListener('keydown', fecharComEscape)
    }
  }, [menuAberto])

  const abrirPeloTeclado = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown') return
    event.preventDefault()
    setMenuAberto(true)
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLAnchorElement>('[data-menu-link]')?.focus())
  }

  const linkNav = (ativo: boolean) => cn(
    'rounded-sm text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
    ativo ? 'text-surface-50' : 'text-surface-400 hover:text-surface-100',
  )

  return (
    <header
      data-section="nav"
      className="sticky top-0 z-40 h-16 border-b border-surface-700 bg-[color-mix(in_srgb,var(--color-surface-950)_72%,transparent)] backdrop-blur-md"
    >
      <div className="landing-container flex h-full items-center gap-4 sm:gap-6">
        <Link
          to={LANDING_ROUTES.home}
          aria-label={nav.homeLabel}
          className="flex flex-none items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {/* Símbolo + WORDMARK oficial (a mesma da barra lateral do app e do
              login; branca, invertida no tema claro por `.oryon-wordmark`). */}
          <img src="/oryon-logo.svg" alt="" width={28} height={28} className="w-7 h-7 select-none" draggable={false} />
          <img src="/oryon-wordmark.png" alt="Oryon" width={56} height={14} className="oryon-wordmark hidden h-[14px] w-auto select-none min-[420px]:block" draggable={false} />
        </Link>

        <nav aria-label="Páginas" className="flex items-center md:ml-2">
          <div ref={menuRef} className="relative">
            <button
              ref={gatilhoRef}
              type="button"
              aria-expanded={menuAberto}
              aria-controls="menu-plataforma"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              onKeyDown={abrirPeloTeclado}
              className={cn(
                'inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-[13px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                menuAberto || pathname.startsWith('/plataforma')
                  ? 'bg-[var(--rowhover)] text-surface-50'
                  : 'text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100',
              )}
            >
              Plataforma
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', menuAberto && 'rotate-180')} aria-hidden />
            </button>

            {menuAberto && (
              <div
                id="menu-plataforma"
                className={cn(
                  'fixed left-4 right-4 top-[72px] z-50 max-h-[calc(100vh-88px)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--landing-borda)]',
                  'bg-[var(--landing-cartao)] p-2 shadow-[0_18px_55px_rgba(0,0,0,.2)]',
                  'md:absolute md:left-0 md:right-auto md:top-full md:mt-2 md:w-[440px]',
                )}
              >
                <div className="grid gap-1 md:grid-cols-2">
                  {paginasPlataforma.map((p) => (
                    <Link
                      key={p.slug}
                      data-menu-link
                      to={rotaPlataforma(p.slug)}
                      onClick={() => setMenuAberto(false)}
                      className="rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <span className="block text-[13px] font-semibold text-surface-100">{p.menu}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-surface-500">{p.resumo}</span>
                    </Link>
                  ))}
                </div>
                {/* Abaixo de 1024 px, as outras páginas também moram aqui. */}
                <div className="mt-1 border-t border-[var(--landing-borda)] pt-1 lg:hidden">
                  {LINKS.map((l) => (
                    <Link key={l.to} data-menu-link to={l.to} onClick={() => setMenuAberto(false)}
                      className="block rounded-lg px-3 py-2.5 text-[13px] font-semibold text-surface-100 hover:bg-[var(--rowhover)]">
                      {l.label}
                    </Link>
                  ))}
                  <Link data-menu-link to={LANDING_ROUTES.login} onClick={() => setMenuAberto(false)}
                    className="block rounded-lg px-3 py-2.5 text-[13px] font-semibold text-surface-100 hover:bg-[var(--rowhover)] min-[420px]:hidden">
                    {nav.cta}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Links soltos só a partir de 1024 px: entre 768 e 1024 "Para a sua área"
              quebrava em três linhas (30/09). */}
          <div className="ml-4 hidden items-center gap-6 whitespace-nowrap lg:flex">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={linkNav(pathname === l.to)}>{l.label}</Link>
            ))}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Abaixo de 420 px, Entrar mora no menu (a barra não comporta os dois botões). */}
          <BotaoLanding to={LANDING_ROUTES.login} variante="fantasma" className="hidden min-[420px]:inline-flex">
            {nav.cta}
          </BotaoLanding>
          {/* No celular (ciclo noturno, 30/09) a conversão não some da barra:
              o rótulo encurta para caber ao lado de Entrar. */}
          <BotaoLanding to={LANDING_ROUTES.demonstracao} className="h-10 px-3.5 text-[13px] sm:hidden">
            {home.ctaCurto}
          </BotaoLanding>
          <BotaoLanding to={LANDING_ROUTES.demonstracao} className="hidden sm:inline-flex">
            {home.ctaPrincipal}
          </BotaoLanding>
        </div>
      </div>
    </header>
  )
}
