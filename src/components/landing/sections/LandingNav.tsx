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

  return (
    <header
      data-section="nav"
      className={cn(
        'sticky top-0 z-40 h-16 border-b border-surface-700',
        // vidro só de token: piso da página a 72% + blur
        'bg-[color-mix(in_srgb,var(--color-surface-950)_72%,transparent)] backdrop-blur-md',
      )}
    >
      <div className="landing-container h-full flex items-center gap-6">
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
          {/* Sem canal comercial configurado, "Entrar" é o único botão (e o
              destaque): a página não promete uma conversa que ainda não atende. */}
          <LinkButton to={LANDING_ROUTES.login} variant={contatoDisponivel ? 'neutral' : 'primary'} className={contatoDisponivel ? 'hidden sm:inline-flex' : undefined}>{nav.cta}</LinkButton>
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
