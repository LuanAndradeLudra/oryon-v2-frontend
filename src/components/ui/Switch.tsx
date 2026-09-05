import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  /** Rótulo acessível. O switch não tem texto próprio, então sem isto (ou
   *  sem `aria-labelledby` apontando para o rótulo visível ao lado) o leitor
   *  de tela anuncia só "ligado/desligado", sem dizer do quê. */
  'aria-label'?: string
  /** Id do elemento que já rotula o switch visualmente — prefira este quando
   *  o rótulo existe na tela, em vez de repetir o texto em `aria-label`. */
  'aria-labelledby'?: string
}

export function Switch({
  checked, onChange, disabled = false, className,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 focus:ring-offset-surface-900',
        checked ? 'bg-brand-500' : 'bg-surface-700',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <motion.span
        className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg"
        animate={{ x: checked ? 20 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}
