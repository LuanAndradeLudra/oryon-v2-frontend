import { useEffect, useRef, useState } from 'react'
import { Sun, Moon, MessageCircle } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { LinkButton } from '@/components/ui/LinkButton'
import { cn } from '@/lib/utils'
import { nav, LANDING_ROUTES, contato, contatoDisponivel, linkContato } from '../landingCopy'

/**
 * Nav fixa em vidro (64px). Âncoras só das seções que existem. O CTA teal é a
 * conversa comercial ("Falar com a gente", no WhatsApp com o Agente IA do
 * própria Oryon); "Entrar" fica neutro, para quem já é cliente. O botão de tema mostra o ícone do tema de DESTINO pelo
 * atributo `data-theme` do <html> (CSS) — sem ternário de tema no JSX.
 */
export function LandingNav() {
  const { toggle } = useTheme()
  const [indiceAberto, setIndiceAberto] = useState(false)
  const indiceRef = useRef<HTMLDivElement>(null)
  const gatilhoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!indiceAberto) return
    const fecharFora = (event: PointerEvent) => {
      if (!indiceRef.current?.contains(event.target as Node)) setIndiceAberto(false)
    }
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIndiceAberto(false)
      gatilhoRef.current?.focus()
    }
    document.addEventListener('pointerdown', fecharFora)
    document.addEventListener('keydown', fecharComEscape)
    return () => {
      document.removeEventListener('pointerdown', fecharFora)
      document.removeEventListener('keydown', fecharComEscape)
    }
  }, [indiceAberto])

  const abrirPeloTeclado = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown') return
    event.preventDefault()
    setIndiceAberto(true)
    requestAnimationFrame(() => indiceRef.current?.querySelector<HTMLAnchorElement>('[data-index-link]')?.focus())
  }

  return (
    <header
      data-section="nav"
      className="sticky top-0 z-40 h-16 border-b border-surface-700 bg-[color-mix(in_srgb,var(--color-surface-950)_72%,transparent)] backdrop-blur-md"
    >
      <div className="landing-container flex h-full items-center gap-6">
        <a
          href="#inicio"
          aria-label={nav.homeLabel}
          className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {/* Símbolo + WORDMARK oficial (a mesma da barra lateral do app e do
              login; branca, invertida no tema claro por `.oryon-wordmark`). */}
          <img src="/oryon-logo.svg" alt="" className="w-7 h-7 select-none" draggable={false} />
          <img src="/oryon-wordmark.png" alt="Oryon" className="oryon-wordmark h-[14px] w-auto select-none" draggable={false} />
        </a>

        <nav
          aria-label="Seções da página"
          className="flex items-center md:ml-4"
        >
          <div ref={indiceRef} className="relative">
            <button
              ref={gatilhoRef}
              type="button"
              aria-expanded={indiceAberto}
              aria-controls="indice-plataforma"
              aria-label={nav.platformMenuLabel}
              onClick={() => setIndiceAberto((aberto) => !aberto)}
              onKeyDown={abrirPeloTeclado}
              className={cn(
                'relative inline-flex h-9 items-center rounded-md px-2.5 text-[13px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                'after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-center after:scale-x-0 after:bg-[var(--landing-destaque)] after:transition-transform after:duration-200 hover:after:scale-x-100',
                indiceAberto
                  ? 'bg-[var(--rowhover)] text-surface-50 after:scale-x-100'
                  : 'text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100',
              )}
            >
              Plataforma
            </button>

            {indiceAberto && (
              <div
                id="indice-plataforma"
                className={cn(
                  'fixed left-4 right-4 top-[72px] z-50 max-h-[calc(100vh-88px)] overflow-y-auto rounded-xl border border-[var(--landing-borda)]',
                  'bg-[var(--landing-cartao)] p-2 shadow-[0_18px_55px_rgba(0,0,0,.2)]',
                  'md:absolute md:left-0 md:right-auto md:top-full md:mt-2 md:max-h-[min(590px,calc(100vh-88px))] md:w-[430px]',
                )}
              >
                <div className="grid gap-1 md:grid-cols-2">
                  {nav.platformGroups.map((grupo, gi) => (
                    <div key={grupo.label} className="min-w-0 p-1.5">
                      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-surface-500">{grupo.label}</p>
                      <div className="space-y-0.5">
                        {grupo.items.map((item, ii) => (
                          <a
                            key={item.anchor}
                            data-index-link
                            href={`#${item.anchor}`}
                            onClick={() => setIndiceAberto(false)}
                            className="group flex min-h-9 items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-surface-300 transition-colors hover:bg-[var(--rowhover)] hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            <span className="w-5 flex-none font-mono text-[10px] tabular-nums text-surface-600 transition-colors group-hover:text-[var(--landing-destaque)]">{String(nav.platformGroups.slice(0, gi).reduce((n, g) => n + g.items.length, 0) + ii + 1).padStart(2, '0')}</span>
                            <span className="truncate">{item.label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ml-4 hidden items-center gap-6 md:flex">
          {nav.links.filter((l) => l.anchor !== 'plataforma').map((l) => (
            <a
              key={l.anchor}
              href={`#${l.anchor}`}
              className="rounded-sm text-[13px] font-medium text-surface-400 transition-colors hover:text-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {l.label}
            </a>
          ))}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={nav.themeToggleLabel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-surface-400 transition-colors hover:bg-[var(--rowhover)] hover:text-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {/* escuro (padrão): Sol (vai para o claro) · claro: Lua */}
            <Sun className="w-4 h-4 [[data-theme=light]_&]:hidden" strokeWidth={1.75} aria-hidden />
            <Moon className="w-4 h-4 hidden [[data-theme=light]_&]:block" strokeWidth={1.75} aria-hidden />
          </button>
          {/* Sem canal comercial configurado, "Entrar" é o único botão (e o
              destaque): a página não promete uma conversa que ainda não atende. */}
          <LinkButton to={LANDING_ROUTES.login} variant={contatoDisponivel ? 'neutral' : 'primary'} className={contatoDisponivel ? 'hidden sm:inline-flex' : undefined}>
            {nav.cta}
          </LinkButton>
          {contatoDisponivel && (
            <LinkButton
              href={linkContato()}
              target="_blank"
              rel="noopener noreferrer"
              leftIcon={<MessageCircle className="h-4 w-4" strokeWidth={2.2} />}
            >
              {contato.cta}
            </LinkButton>
          )}
        </div>
      </div>
    </header>
  )
}
