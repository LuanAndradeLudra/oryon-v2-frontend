import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'neutral' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  /** Botão quadrado só com ícone (BTN-10) — passe o ícone como `children`. */
  iconOnly?: boolean
}

// SCRUM-1097 (Leva 1) — vocabulário de botão reestilizado (tela 1a):
// raio único 7px (era 10/11/12px por tamanho), sombra decorativa removida
// (elevação de card/botão agora é contraste de cor, não sombra — sombra fica
// só pra overlay), anel de foco teal uniforme nas 5 variantes, texto 13px/600.
// Os papéis de variante FORAM REMAPEADOS pelo mockup — não é só reestilizar
// a mesma semântica com cores novas:
//   primary   → agora usa os tokens dedicados --color-btn-primary-{bg,fg}
//               (desvio de AA: bg-brand-500 puro falhava contraste no claro)
//   neutral   → passa a ser "fundo surface + borda de ênfase" (era o visual
//               que hoje é o de `secondary`)
//   secondary → passa a ser "acento suave, sem borda" (visual novo, não existia)
//   ghost     → mesma ideia de hoje, padding horizontal fixo em 12px
//   danger    → token dedicado --color-btn-danger-{bg,fg} (#B91C1C sólido
//               nos dois temas — bg-danger cru falhava contraste)
const variantStyles = {
  primary: [
    'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] font-semibold',
    'hover:brightness-90',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-[0.45]',
  ],
  // spec/1a-primitivos.md BTN-02/06: neutral = fundo --sf + borda de ênfase
  // --bd2 (não --bd); hover escurece 1 passo. ghost = texto --tx2, hover 1
  // passo em --rowhover (não teal).
  neutral: [
    'bg-surface-800 text-surface-100 font-semibold',
    'border border-[var(--bd2)]',
    'hover:bg-surface-700',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-[0.45]',
  ],
  secondary: [
    'bg-accent-soft text-accent-dark font-semibold',
    'hover:brightness-110',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-[0.45]',
  ],
  ghost: [
    'bg-transparent text-surface-400 font-semibold px-3',
    'hover:bg-[var(--rowhover)] hover:text-surface-100',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-[0.45]',
  ],
  danger: [
    'bg-[var(--color-btn-danger-bg)] text-[var(--color-btn-danger-fg)] font-semibold',
    'hover:brightness-90',
    'focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-[0.45]',
  ],
}

// BTN-02/03/04/12: sm 28px/10px/12px · md 36/14/13 · lg 44/18/14 (HTML do canvas).
const sizeStyles = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-sm',
  md: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-sm',
  lg: 'h-11 px-[18px] text-[14px] gap-1.5 rounded-sm',
}

// BTN-10: só-ícone é quadrado (28/36/44), ícone 16px.
const iconOnlyStyles = {
  sm: 'w-7 px-0',
  md: 'w-9 px-0',
  lg: 'w-11 px-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center',
          'transition-all duration-150',
          'cursor-pointer select-none',
          'disabled:cursor-not-allowed',
          'focus-visible:outline-none',
          loading && 'opacity-60',
          sizeStyles[size],
          iconOnly && iconOnlyStyles[size],
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin opacity-60" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children && <span>{children}</span>}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    )
  },
)
Button.displayName = 'Button'
