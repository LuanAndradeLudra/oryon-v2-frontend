import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  /** Nome para leitor de tela quando nenhum <label htmlFor> aponta para o switch. */
  'aria-label'?: string
  'aria-labelledby'?: string
  id?: string
}

// SCRUM-1097: trilho compacto 32×18px (era 44×24px), thumb 14px (era 20px) —
// raio continua pílula (`rounded-full`, não é um dos radius tokens novos).
export function Switch({ checked, onChange, disabled = false, className, id, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        // FIELD-08/09: sem borda (trilho cheio 32×18, thumb 14 com 2px de folga),
        // off em --bd2, thumb sem sombra (ELEV-02).
        'relative inline-flex items-center h-[18px] w-8 flex-shrink-0 rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 focus:ring-offset-surface-900',
        checked ? 'bg-brand-500' : 'bg-[var(--bd2)]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <motion.span
        className="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white"
        animate={{ x: checked ? 16 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}
