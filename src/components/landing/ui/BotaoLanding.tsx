import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * O BOTÃO DA LANDING (30/09, PO: "mais moderno e diferenciado; nada de teal —
 * preto ou branco").
 *
 * Monocromático, como as referências (Attio, Linear, Vercel): o contraste
 * máximo do tema faz o papel da cor de marca.
 *  • primário — cápsula BRANCA no tema escuro, PRETA no claro; brilho de
 *    borda por dentro (luz de cima) e um halo discreto; a seta anda 2 px no
 *    hover (transform — nada muda de tamanho nem empurra o layout);
 *  • secundário — cápsula de vidro com fio fino, que acende no hover;
 *  • fantasma — só o texto, com fundo no hover (o "Entrar" da nav).
 * Toque ≥ 44 px no tamanho grande; foco sempre visível; pressionar afunda
 * 2 %; `prefers-reduced-motion` desliga os movimentos.
 *
 * Só da landing: o botão do app (`Button`/`buttonStyles`) não muda.
 */

type Variante = 'primario' | 'secundario' | 'fantasma'
type Tamanho = 'md' | 'lg'

const BASE = cn(
  'group relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.01em]',
  'cursor-pointer transition-[background-color,border-color,box-shadow,transform,color] duration-200 ease-out',
  'active:scale-[.98] motion-reduce:transition-none motion-reduce:active:scale-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950',
  'focus-visible:ring-white/80 [[data-theme=light]_&]:focus-visible:ring-black/70',
  'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60',
)

const TAMANHOS: Record<Tamanho, string> = {
  md: 'h-9 px-4 text-[13.5px]',
  lg: 'h-12 px-6 text-[15px]',
}

const VARIANTES: Record<Variante, string> = {
  primario: cn(
    // Escuro: branco com luz de cima (gradiente + fio interno) e halo suave.
    'text-[#0b0c0e] bg-[linear-gradient(180deg,#ffffff_0%,#e9eaec_100%)]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,.9),inset_0_-1px_0_rgba(0,0,0,.12),0_1px_2px_rgba(0,0,0,.4),0_10px_28px_-14px_rgba(255,255,255,.45)]',
    'hover:bg-[linear-gradient(180deg,#ffffff_0%,#f4f5f6_100%)] hover:shadow-[inset_0_1px_0_#fff,inset_0_-1px_0_rgba(0,0,0,.1),0_1px_2px_rgba(0,0,0,.4),0_14px_36px_-12px_rgba(255,255,255,.6)]',
    // Claro: o mesmo desenho em preto.
    '[[data-theme=light]_&]:text-white [[data-theme=light]_&]:bg-[linear-gradient(180deg,#2a2b2f_0%,#0b0c0e_100%)]',
    '[[data-theme=light]_&]:shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_1px_2px_rgba(0,0,0,.3),0_10px_24px_-12px_rgba(0,0,0,.55)]',
    '[[data-theme=light]_&]:hover:bg-[linear-gradient(180deg,#3a3b40_0%,#141518_100%)]',
  ),
  secundario: cn(
    'text-surface-50 bg-white/[.04] backdrop-blur-sm',
    'shadow-[inset_0_0_0_1px_rgba(255,255,255,.14),inset_0_1px_0_rgba(255,255,255,.08)]',
    'hover:bg-white/[.08] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.28),inset_0_1px_0_rgba(255,255,255,.12)]',
    '[[data-theme=light]_&]:text-[#0b0c0e] [[data-theme=light]_&]:bg-black/[.03]',
    '[[data-theme=light]_&]:shadow-[inset_0_0_0_1px_rgba(0,0,0,.14)] [[data-theme=light]_&]:hover:bg-black/[.06] [[data-theme=light]_&]:hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,.28)]',
  ),
  fantasma: cn(
    'text-surface-200 hover:text-surface-50 hover:bg-white/[.06]',
    '[[data-theme=light]_&]:hover:bg-black/[.05]',
  ),
}

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Rota do app (react-router). */
  to?: string
  /** Âncora (#secao) ou externo. */
  href?: string
  target?: string
  rel?: string
  variante?: Variante
  tamanho?: Tamanho
  /** Seta à direita que anda no hover — para a ação principal. */
  seta?: boolean
  carregando?: boolean
  icone?: ReactNode
  children: ReactNode
}

export const BotaoLanding = forwardRef<HTMLElement, Props>(function BotaoLanding(
  { to, href, target, rel, variante = 'primario', tamanho = 'md', seta = false, carregando = false, icone, children, className, type, disabled, ...resto },
  ref,
) {
  const cls = cn(BASE, TAMANHOS[tamanho], VARIANTES[variante], className)
  const conteudo = (
    <>
      {carregando ? (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icone ? (
        <span aria-hidden className="flex-shrink-0">{icone}</span>
      ) : null}
      <span>{children}</span>
      {seta && !carregando && (
        <ArrowRight
          aria-hidden
          className="-mr-1 h-4 w-4 flex-shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
          strokeWidth={2.2}
        />
      )}
    </>
  )
  if (to) return <Link ref={ref as React.Ref<HTMLAnchorElement>} to={to} className={cls}>{conteudo}</Link>
  if (href) return <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} target={target} rel={rel} className={cls}>{conteudo}</a>
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type ?? 'button'} disabled={disabled || carregando} aria-busy={carregando || undefined} className={cls} {...resto}>
      {conteudo}
    </button>
  )
})
