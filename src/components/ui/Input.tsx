import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { useFormFieldAria, mergeFieldAria } from './formField.context'

// `size` nativo de <input> é number (nº de caracteres) — Omit pra reusar o
// nome com o significado de variante (sm/md/lg) que o resto do DS já espera.
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Marca o campo como inválido. Dentro de um `FormField` com `error`, isto já vem por contexto. */
  error?: string
  /** SCRUM-1097: formaliza a régua canônica (sm 28 · md 36 · lg 44px), antes
   *  só implementada pelo Button. `md` reproduz a altura de hoje. */
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3 text-sm',
  lg: 'h-11 px-3.5 text-sm',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, 'aria-describedby': describedBy, required, size = 'md', ...props }, ref) => {
    // Dentro de um `FormField`: recebe id (para o `htmlFor` do rótulo),
    // `aria-describedby` (hint/erro) e `aria-invalid` sem que a chamada precise
    // saber disso. Prop explícita sempre vence o contexto.
    const field = useFormFieldAria()
    const aria = mergeFieldAria(field, { id, describedBy, invalid: !!error, required })
    // A borda de perigo passa a acompanhar o erro do FormField também — antes
    // a mensagem aparecia vermelha e o campo continuava com a borda normal.
    const invalid = !!error || !!field?.invalid

    return (
      <input
        ref={ref}
        {...aria}
        required={required}
        className={cn(
          'w-full bg-surface-800 border rounded-sm text-surface-100',
          sizeStyles[size],
          'placeholder:text-surface-400',
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
Input.displayName = 'Input'
