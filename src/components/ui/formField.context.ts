import { createContext, useContext } from 'react'

/**
 * Ligação rótulo ↔ campo, publicada pelo `FormField` e consumida pelos
 * primitivos (`Input`, `Select`, `Textarea`).
 *
 * **Por que contexto e não `cloneElement`.** O `FormField` recebe `children`
 * livre: às vezes é o primitivo direto, às vezes vem embrulhado num `<div
 * className="relative">` com um ícone ao lado. Clonar o filho só funciona no
 * primeiro caso e quebra em silêncio no segundo — o rótulo continuaria sem
 * apontar para campo nenhum, que é exatamente o defeito que estamos corrigindo.
 * O contexto atravessa qualquer profundidade.
 *
 * Arquivo separado do componente de propósito: `FormField.tsx` exporta só
 * componente, mantendo o `react-refresh/only-export-components` quieto.
 */
export interface FormFieldAria {
  /** `id` do campo; o mesmo que o `<label htmlFor>` aponta. */
  id: string
  /** ids do hint e/ou da mensagem de erro, separados por espaço. */
  describedBy?: string
  /** Há erro no campo — vira `aria-invalid` e a borda de perigo. */
  invalid: boolean
  /** Campo obrigatório — vira `aria-required`. */
  required?: boolean
}

export const FormFieldContext = createContext<FormFieldAria | null>(null)

/**
 * Lido pelos primitivos do DS. Devolve `null` quando o campo é usado fora de
 * um `FormField` — nesse caso o primitivo se comporta exatamente como antes.
 */
export function useFormFieldAria(): FormFieldAria | null {
  return useContext(FormFieldContext)
}

/**
 * Junta prop e contexto.
 *
 * **`id`: o contexto vence.** Dentro de um `FormField`, o id do campo pertence
 * ao `FormField` — é para ele que o `<label htmlFor>` aponta. Deixar uma prop
 * sobrescrever devolveria o defeito original (rótulo apontando para um id que
 * não existe mais). Quem precisa de um id específico passa `id` no próprio
 * `FormField`, que então usa o mesmo nos dois lados.
 *
 * **`aria-describedby`: soma.** É uma lista de ids por definição; descartar a
 * do contexto perderia o hint/erro, descartar a da prop perderia a descrição
 * que a chamada quis acrescentar.
 */
export function mergeFieldAria(
  field: FormFieldAria | null,
  props: {
    id?: string
    describedBy?: string
    invalid?: boolean
    required?: boolean
  },
): {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  'aria-required'?: true
} {
  const invalid = props.invalid || field?.invalid
  const required = props.required || field?.required
  const describedBy = [props.describedBy, field?.describedBy].filter(Boolean).join(' ')
  return {
    id: field?.id ?? props.id,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': invalid ? true : undefined,
    'aria-required': required ? true : undefined,
  }
}
