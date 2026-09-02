import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantStyles = {
  primary: [
    'bg-brand-500 text-surface-950 font-semibold',
    'hover:bg-brand-cta-hover',
    'focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'shadow-[0_6px_20px_rgba(20,184,166,0.35)] hover:shadow-[0_6px_24px_rgba(20,184,166,0.45)]',
    'disabled:bg-brand-700 disabled:text-surface-500 disabled:shadow-none',
  ],
  secondary: [
    'bg-surface-800 text-surface-100 font-medium',
    'border border-surface-700',
    'hover:bg-surface-700 hover:border-surface-600',
    'focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-40',
  ],
  ghost: [
    'bg-transparent text-surface-300 font-medium',
    'hover:bg-accent-soft hover:text-surface-100',
    'focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-40',
  ],
  danger: [
    'bg-danger text-white font-semibold',
    'hover:bg-red-600',
    'focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-40',
  ],
}

const sizeStyles = {
  sm: 'h-7 px-3 text-xs gap-1.5 rounded-[10px]',
  md: 'h-9 px-4 text-sm gap-2  rounded-[11px]',
  lg: 'h-11 px-5 text-sm gap-2  rounded-[12px]',
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
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
