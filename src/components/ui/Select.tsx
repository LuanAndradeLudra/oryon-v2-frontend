import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFormFieldAria, mergeFieldAria } from './formField.context'

// `size` nativo de <select> é number (altura em nº de opções visíveis) — Omit
// pra reusar o nome com o significado de variante (sm/md/lg) do resto do DS.
interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Marca o campo como inválido. Dentro de um `FormField` com `error`, isto já vem por contexto. */
  error?: string
  /** SCRUM-1097: régua canônica (sm 28 · md 36 · lg 44px). `md` reproduz hoje. */
  size?: 'sm' | 'md' | 'lg'
}

// spec/1a-primitivos.md FIELD-03: md 36px / padding 10px / 13px.
const sizeStyles = {
  sm: 'h-7 pl-2.5 pr-7 text-xs',
  md: 'h-9 pl-2.5 pr-8 text-[13px]',
  lg: 'h-11 pl-3.5 pr-8 text-sm',
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, id, 'aria-describedby': describedBy, required, size = 'md', ...props }, ref) => {
    // Ver `Input`: id/aria vêm do `FormField` quando houver um em volta.
    const field = useFormFieldAria()
    const aria = mergeFieldAria(field, { id, describedBy, invalid: !!error, required })
    const invalid = !!error || !!field?.invalid

    return (
      <div className="relative">
        <select
          ref={ref}
          {...aria}
          required={required}
          className={cn(
            'w-full appearance-none bg-surface-800 border rounded-sm text-surface-100',
            sizeStyles[size],
            'focus:outline-none focus:ring-[3px] focus:ring-accent-soft focus:border-brand-500',
            'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            'transition-colors duration-150',
            invalid ? 'border-danger' : 'border-[var(--bd2)]',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {/* FIELD-06: chevron 14px em --tx3 (avatar dentro de select nativo é
            impossível — fica pro Select custom/UserPicker). */}
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
      </div>
    )
  }
)
Select.displayName = 'Select'
