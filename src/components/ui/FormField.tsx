import { useId, isValidElement, cloneElement, type ReactNode, type ReactElement } from 'react'
import { cn } from '@/lib/utils'
import { ComingSoonBadge } from './ComingSoonBadge'
import { FormFieldContext, type FormFieldAria } from './formField.context'

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  /** Selo textual ao lado do rótulo: "Obrigatório" (vermelho) ou "Opcional" (cinza). */
  requirement?: 'required' | 'optional'
  /** Quando true (campo já preenchido), o selo Obrigatório/Opcional some — vira só um guia inicial. */
  filled?: boolean
  /** Selo "Em breve" ao lado do rótulo — para campos visíveis mas ainda sem suporte no backend. */
  comingSoon?: boolean
  className?: string
  /**
   * Fixa o `id` do campo (o rótulo aponta para ele). Sem isto, um id estável é
   * gerado. Use quando algo de fora precisar referenciar o campo — passar `id`
   * direto no `Input`/`Select`/`Textarea` dentro de um `FormField` não tem
   * efeito, justamente para o rótulo nunca apontar para o lugar errado.
   */
  id?: string
  children: ReactNode
}

/** Elementos nativos que fazem sentido receber o `id` do rótulo diretamente. */
const HOST_FIELDS = new Set(['input', 'select', 'textarea'])

/**
 * Rótulo + campo + hint/erro, com a ligação de acessibilidade feita aqui e não
 * em cada chamada.
 *
 * Até então o `<label>` não tinha `htmlFor` e o campo ficava fora dele: clicar
 * no rótulo não focava nada, o leitor de tela anunciava o campo sem nome, e
 * `hint`/`error` não eram lidos porque ninguém apontava para eles. O `error`
 * também só existia como cor de borda — invisível para quem não distingue a cor.
 *
 * Agora o `FormField` gera um `id`, aponta o rótulo para ele e publica
 * `id`/`aria-describedby`/`aria-invalid`/`aria-required` por contexto. Os
 * primitivos (`Input`, `Select`, `Textarea`) consomem sozinhos — nenhuma das
 * ~75 chamadas precisou mudar. Um `<input>`/`<select>`/`<textarea>` nativo
 * passado como filho direto também recebe, por clonagem; qualquer outra coisa
 * (componente próprio, fragmento, lista) segue pelo contexto.
 */
export function FormField({ label, error, hint, required, requirement, filled, comingSoon, className, id, children }: FormFieldProps) {
  const reactId = useId()
  const fieldId = id ?? `${reactId}-field`
  const hintId = `${reactId}-hint`
  const errorId = `${reactId}-error`

  // O erro substitui o hint na tela (o hint só aparece sem erro), então só um
  // dos dois é descrito por vez — descrever os dois anunciaria texto invisível.
  const describedBy = error ? errorId : hint ? hintId : undefined
  const isRequired = required || requirement === 'required'

  const aria: FormFieldAria = {
    id: fieldId,
    describedBy,
    invalid: !!error,
    required: isRequired,
  }

  // Campo nativo como filho direto: recebe os atributos sem depender de
  // contexto. Restrito a input/select/textarea de propósito — pôr o `id` num
  // `<div>` faria o rótulo apontar para algo que não é focável.
  const child = isValidElement(children) ? (children as ReactElement<Record<string, unknown>>) : null
  const isHostField = !!child && typeof child.type === 'string' && HOST_FIELDS.has(child.type)
  const content = isHostField && child
    ? cloneElement(child, {
        id: fieldId,
        'aria-describedby': (child.props['aria-describedby'] as string | undefined) ?? describedBy,
        ...(error ? { 'aria-invalid': true } : {}),
        ...(isRequired ? { 'aria-required': true } : {}),
      })
    : children

  return (
    <FormFieldContext.Provider value={aria}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={fieldId} className="text-xs font-semibold text-surface-300 uppercase tracking-wider">
          {label}
          {/* O asterisco é decoração: quem usa leitor de tela recebe a
              obrigatoriedade por `aria-required`, não por ouvir "asterisco". */}
          {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
          {requirement === 'required' && !filled && (
            <span className="ml-2 text-[10px] font-semibold text-danger normal-case tracking-normal">
              Obrigatório
            </span>
          )}
          {requirement === 'optional' && !filled && (
            <span className="ml-2 text-[10px] font-medium text-surface-500 normal-case tracking-normal">
              Opcional
            </span>
          )}
          {comingSoon && (
            <span className="ml-2 normal-case tracking-normal align-middle inline-block">
              <ComingSoonBadge />
            </span>
          )}
        </label>
        {content}
        {hint && !error && <p id={hintId} className="text-xs text-surface-500">{hint}</p>}
        {/* `role="alert"` para o erro chegar a quem já saiu do campo. */}
        {error && <p id={errorId} role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    </FormFieldContext.Provider>
  )
}
