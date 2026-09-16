import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { useFormFieldAria, mergeFieldAria } from './formField.context'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Marca o campo como inválido. Dentro de um `FormField` com `error`, isto já vem por contexto. */
  error?: string
  /** SCRUM-1097: régua canônica — textarea não trava altura (`rows` decide),
   *  então `size` só varia padding/texto. `md` reproduz o visual de hoje. */
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-3.5 py-2.5 text-sm',
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, 'aria-describedby': describedBy, required, size = 'md', ...props }, ref) => {
    // Ver `Input`: id/aria vêm do `FormField` quando houver um em volta.
    const field = useFormFieldAria()
    const aria = mergeFieldAria(field, { id, describedBy, invalid: !!error, required })
    const invalid = !!error || !!field?.invalid

    return (
      <textarea
        ref={ref}
        {...aria}
        required={required}
        className={cn(
          'w-full bg-surface-800 border rounded-sm text-surface-100',
          sizeStyles[size],
          'placeholder:text-surface-400 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150',
          invalid ? 'border-danger' : 'border-surface-700',
          className,
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
