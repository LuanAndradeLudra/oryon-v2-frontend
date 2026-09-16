import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'neutral' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
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
    'focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-40',
  ],
  neutral: [
    'bg-surface-800 text-surface-100 font-semibold',
    'border border-surface-700',
    'hover:bg-surface-700 hover:border-surface-600',
    'focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-40',
  ],
  secondary: [
    'bg-accent-soft text-accent-dark font-medium',
    'hover:brightness-110',
    'focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-40',
  ],
  ghost: [
    'bg-transparent text-surface-300 font-medium px-3',
    'hover:bg-accent-soft hover:text-surface-100',
    'focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-40',
  ],
  danger: [
    'bg-[var(--color-btn-danger-bg)] text-[var(--color-btn-danger-fg)] font-semibold',
    'hover:brightness-90',
    'focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-40',
  ],
}

const sizeStyles = {
  sm: 'h-7 px-3 text-xs gap-1.5 rounded-sm',
  md: 'h-9 px-4 text-sm gap-2  rounded-sm',
  lg: 'h-11 px-5 text-sm gap-2  rounded-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
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
          sizeStyles[size],
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
