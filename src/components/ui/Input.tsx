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

// spec/1a-primitivos.md FIELD-03: md 36px / padding 10px / 13px.
const sizeStyles = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-2.5 text-[13px]',
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
          // FIELD-03/04: placeholder --tx3; borda de ênfase --bd2; foco = anel
          // 3px --acsoft + borda --ac + caret --ac.
          'placeholder:text-surface-500 caret-brand-500',
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
Input.displayName = 'Input'
