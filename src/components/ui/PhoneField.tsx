import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from './Input'
import { maskPhoneInput, phoneDigits } from '@/lib/phone'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** Número em dígitos (E.164 sem símbolos), como o backend guarda: `5511999887766`. */
  value: string
  /** Recebe **dígitos**, nunca a máscara — o componente não vaza formatação para o estado. */
  onChange: (digits: string) => void
}

/**
 * Campo de telefone/WhatsApp.
 *
 * Numa plataforma cujo objeto central é um número de WhatsApp, o campo de
 * telefone era um `<input>` de texto: sem `type="tel"` (só 2 em todo o app),
 * sem `inputMode`, sem máscara, e com o formato exigido vivendo apenas no
 * `placeholder` — que desaparece justamente quando o usuário começa a digitar
 * e passa a precisar dele.
 *
 * Aqui: **mostra formatado, entrega dígitos.** O estado do formulário nunca vê
 * `+55 11 …`; recebe `5511…`, que é o que a API espera. O DDI 55 é assumido
 * quando ausente — hoje 100% dos clientes são brasileiros, e exigir "55"
 * digitado à mão é a origem mais comum de número salvo errado.
 *
 * `inputMode="numeric"` abre o teclado certo no celular; `type="tel"` dá a
 * semântica e o autofill. Dentro de um `FormField`, herda rótulo e `aria-*`
 * pelo `Input` — nada a fazer na chamada.
 */
export const PhoneField = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, placeholder, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        // 17 = "+55 11 99988-7766". Corta a digitação onde o número acaba,
        // em vez de aceitar 40 caracteres e falhar só no submit.
        maxLength={17}
        value={maskPhoneInput(value)}
        onChange={(e) => onChange(phoneDigits(maskPhoneInput(e.target.value)))}
        placeholder={placeholder ?? '+55 11 99988-7766'}
        {...props}
      />
    )
  }
)
PhoneField.displayName = 'PhoneField'
