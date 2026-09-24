import { cn } from '@/lib/utils'

/**
 * Receita do botão, separada do componente para que um <a>/<Link> (landing,
 * e-mails de CTA, links que navegam) possa vestir EXATAMENTE o mesmo visual
 * sem aninhar <button> dentro de <a> (HTML inválido). `Button` e `LinkButton`
 * consomem daqui; a tela nunca copia estas classes (primitivo antes de valor).
 */
export type ButtonVariant = 'primary' | 'neutral' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

// SCRUM-1097 (Leva 1) — vocabulário de botão reestilizado (tela 1a):
// raio único 7px, sem sombra decorativa, anel de foco teal uniforme, texto 13px/600.
//   primary   → tokens --color-btn-primary-{bg,fg} (desvio de AA no claro)
//   neutral   → fundo surface + borda de ênfase --bd2
//   secondary → acento suave, sem borda
//   ghost     → texto --tx2, hover em --rowhover (não teal)
//   danger    → --color-btn-danger-{bg,fg} (#B91C1C sólido nos dois temas)
export const buttonVariantStyles: Record<ButtonVariant, string[]> = {
  primary: [
    'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] font-semibold',
    'hover:brightness-90',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
    'disabled:opacity-[0.45]',
  ],
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
export const buttonSizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-sm',
  md: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-sm',
  lg: 'h-11 px-[18px] text-[14px] gap-1.5 rounded-sm',
}

// BTN-10: só-ícone é quadrado (28/36/44), ícone 16px.
export const buttonIconOnlyStyles: Record<ButtonSize, string> = {
  sm: 'w-7 px-0',
  md: 'w-9 px-0',
  lg: 'w-11 px-0',
}

export const buttonBaseStyles = [
  'inline-flex items-center justify-center',
  'transition-all duration-150',
  'cursor-pointer select-none',
  'disabled:cursor-not-allowed',
  'focus-visible:outline-none',
]

/** Classes completas de um botão — para <a>/<Link> que precisam parecer botão. */
export function buttonClasses(opts: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}) {
  const { variant = 'primary', size = 'md', iconOnly = false, className } = opts
  return cn(buttonBaseStyles, buttonSizeStyles[size], iconOnly && buttonIconOnlyStyles[size], buttonVariantStyles[variant], className)
}
