import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { preselectedReason, type CloseReasonOption } from '@/lib/closeReason'

export interface CloseReasonValue {
  /** Chave escolhida na lista. */
  picked: string
  /** Texto do campo livre (só existe com `allowFree`). */
  free: string
  /** Observação complementar. */
  note: string
}

export const emptyCloseReasonValue = (reasons: CloseReasonOption[]): CloseReasonValue => ({
  picked: preselectedReason(reasons),
  free: '',
  note: '',
})

interface Props {
  reasons: CloseReasonOption[]
  value: CloseReasonValue
  onChange: (next: CloseReasonValue) => void
  /** D0-8: campo livre ao lado da lista, atrás do interruptor do admin. */
  allowFree?: boolean
  /** Erro do motivo (a lista/campo livre); erros de valor ficam com quem chama. */
  error?: string
  disabled?: boolean
  autoFocus?: boolean
  notePlaceholder?: string
  /** Prefixo dos `data-testid` — `close-reason`, `resolve-reason`, … */
  testIdPrefix?: string
}

/**
 * Os campos do motivo de desfecho, um só componente (A4 · SCRUM-926).
 *
 * Havia duas implementações do mesmo formulário: o `CloseDealReasonModal` do
 * board/ficha/painel/aba (sem pré-seleção, nota num `Input` de uma linha para
 * 2000 caracteres) e o `ResolveOutcomePanel` do inbox (com pré-seleção). Mesma
 * decisão, duas regras — a divergência F-FUNIL-08 na outra ponta.
 *
 * O campo livre (D0-8) aparece ao lado da lista quando o funil permite, e vence
 * a lista quando tem texto: grava `outro` + nota estruturada
 * (`composeCloseReason`). Sem ele, o vendedor escolhe "o motivo menos errado"
 * e o relatório de perdas mente.
 */
export function CloseReasonFields({
  reasons, value, onChange, allowFree, error, disabled, autoFocus, notePlaceholder, testIdPrefix = 'close-reason',
}: Props) {
  const set = (patch: Partial<CloseReasonValue>) => onChange({ ...value, ...patch })
  const freeWins = allowFree && value.free.trim().length > 0

  return (
    <>
      {/* Dois `FormField` lado a lado, não um com dois campos: o rótulo publica
          UM id por campo, e dois primitivos sob o mesmo `FormField` receberiam
          o mesmo id (o rótulo apontaria para o campo errado). */}
      <div className={allowFree ? 'flex flex-col sm:flex-row sm:items-start gap-2' : undefined}>
        <FormField label="Motivo" required error={error} className={allowFree ? 'sm:w-1/2' : undefined}>
          <Select
            aria-label="Motivo do desfecho"
            value={freeWins ? '' : value.picked}
            onChange={(e) => set({ picked: e.target.value, free: '' })}
            disabled={disabled}
            autoFocus={autoFocus}
            data-testid={`${testIdPrefix}-select`}
          >
            <option value="">— escolher —</option>
            {reasons.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </Select>
        </FormField>
        {allowFree && (
          <FormField label="ou descreva" className="sm:w-1/2">
            <Input
              aria-label="Outro motivo (texto livre)"
              placeholder="Motivo em suas palavras"
              value={value.free}
              onChange={(e) => set({ free: e.target.value })}
              disabled={disabled}
              maxLength={200}
              data-testid={`${testIdPrefix}-free`}
            />
          </FormField>
        )}
      </div>

      <FormField label="Observação (opcional)">
        <Textarea
          aria-label="Observação do desfecho"
          rows={3}
          value={value.note}
          onChange={(e) => set({ note: e.target.value })}
          placeholder={notePlaceholder ?? 'Ex: cliente pediu para retomar no próximo trimestre'}
          maxLength={2000}
          disabled={disabled}
          data-testid={`${testIdPrefix}-note`}
        />
      </FormField>
    </>
  )
}
