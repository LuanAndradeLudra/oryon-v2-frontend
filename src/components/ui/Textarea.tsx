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

// spec/1a-primitivos.md FIELD-03: md padding 10px / 13px.
const sizeStyles = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-2.5 py-2 text-[13px]',
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
          'placeholder:text-surface-500 caret-brand-500 resize-none',
          'focus:outline-none focus:ring-[3px] focus:ring-accent-soft focus:border-brand-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150',
          invalid ? 'border-danger' : 'border-[var(--bd2)]',
          className,
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
