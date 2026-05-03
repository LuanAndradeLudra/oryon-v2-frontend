import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
}

/**
 * Floating Action Button — botao flutuante para acao primaria da pagina
 * (criar conversa, criar contato). Posicionado bottom-right respeitando
 * safe-area + altura da bottom tab bar (~56-64px). Mobile-only.
 */
export function Fab({ icon, label, className, ...rest }: FabProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'md:hidden fixed right-4 z-30 w-14 h-14 rounded-full',
        'bg-brand-600 text-surface-950 shadow-lg shadow-brand-600/30',
        'flex items-center justify-center',
        'hover:bg-brand-500 active:scale-95 transition-all',
        // Acima da bottom tab bar (h-14 / py-2 / safe-area)
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
}
