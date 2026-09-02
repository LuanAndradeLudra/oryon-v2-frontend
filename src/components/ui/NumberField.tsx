import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from './Input'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** `null` = campo vazio. Evita o `NaN` que `Number('')` produz. */
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
}

/**
 * Campo numérico inteiro.
 *
 * Substitui o `type="number"` — usado 18 vezes no app, com `inputMode` em
 * apenas 3. Os problemas do `type="number"` são conhecidos e todos apareciam
 * aqui: a roda do mouse sobre o campo focado **altera o valor** sem o usuário
 * perceber; setas do teclado idem; e o valor vazio vira `NaN` na conversão.
 *
 * Este campo é `text` com `inputMode="numeric"` (teclado certo no celular,
 * imune à roda), aceita só dígitos, e devolve `number | null` — nunca `NaN`.
 * `min`/`max` restringem no blur, não a cada tecla: corrigir enquanto se
 * digita impede de apagar para reescrever.
 */
export const NumberField = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, min, max, ...props }, ref) => {
    const clamp = (n: number): number => {
      if (min !== undefined && n < min) return min
      if (max !== undefined && n > max) return max
      return n
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value === null ? '' : String(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '')
          onChange(digits === '' ? null : Number(digits))
        }}
        onBlur={(e) => {
          if (value !== null) onChange(clamp(value))
          props.onBlur?.(e)
        }}
        {...props}
      />
    )
  }
)
NumberField.displayName = 'NumberField'
