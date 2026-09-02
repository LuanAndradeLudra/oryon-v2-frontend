import { createContext, useContext, useId } from 'react'

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

/**
 * A **semântica** de um campo, separada da **aparência**.
 *
 * O `FormField` do DS não é o único invólucro de campo do app: telas com
 * linguagem visual própria (o drawer de novo contato, o cadastro) têm o seu,
 * com rótulo em outro peso e o selo "Obrigatório" em outro lugar. Forçar todas
 * a usar o `FormField` resolveria a acessibilidade, mas às custas de uma
 * mudança visual que é decisão de design, não de engenharia.
 *
 * Este hook quebra esse falso dilema: qualquer invólucro chama, recebe os ids
 * já calculados e monta o próprio HTML. A ligação rótulo ↔ campo passa a ser
 * uma só; o visual continua sendo de cada um.
 *
 * ```tsx
 * const { fieldId, hintId, errorId, aria } = useFieldAria({ error, required })
 * return (
 *   <FormFieldContext.Provider value={aria}>
 *     <label htmlFor={fieldId}>…</label>
 *     <Input />                      // pega id e aria-* pelo contexto
 *     {error && <p id={errorId} role="alert">{error}</p>}
 *   </FormFieldContext.Provider>
 * )
 * ```
 */
export function useFieldAria(opts: {
  /** Fixa o id do campo; sem isto, um id estável é gerado. */
  id?: string
  hint?: string
  error?: string
  required?: boolean
}): { fieldId: string; hintId: string; errorId: string; aria: FormFieldAria } {
  const reactId = useId()
  const fieldId = opts.id ?? `${reactId}-field`
  const hintId = `${reactId}-hint`
  const errorId = `${reactId}-error`
  // O erro substitui o hint na tela, então só um é descrito por vez —
  // descrever os dois anunciaria texto invisível.
  const describedBy = opts.error ? errorId : opts.hint ? hintId : undefined
  return {
    fieldId,
    hintId,
    errorId,
    aria: { id: fieldId, describedBy, invalid: !!opts.error, required: opts.required },
  }
}
