import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Button } from '@/components/ui/Button'
import { getApiErrorMessage } from '@/lib/utils'
import { terminalLabelsOf, pipelineNoun, pipelineKindOf } from '@/lib/pipelineKinds'
import { formatBRL } from '@/utils/money'
import { composeCloseReason, type CloseReasonOption } from '@/lib/closeReason'
import { CloseReasonFields, emptyCloseReasonValue, type CloseReasonValue } from './CloseReasonFields'
import type { CloseReason, Deal, Pipeline, PipelineStage } from '@/types'

export interface CloseDealReasonInput {
  outcome: 'won' | 'lost'
  reason: string
  note?: string
  /** Valor final confirmado no fechamento (venda sem itens). Ausente = inalterado. */
  amountCents?: number
}

interface CloseDealReasonModalProps {
  open: boolean
  onClose: () => void
  /** Registro sendo fechado (arrastado para um terminal). */
  deal: Deal | null
  /** Etapa terminal de destino — decide o desfecho (`isWon` → won, `isLost` → lost). */
  stage: PipelineStage | null
  /** Funil do registro — traz `closeReasons` (catálogo por tipo, F1) e o vocabulário. */
  pipeline: Pipeline | null
  onConfirm: (input: CloseDealReasonInput) => Promise<void>
}

/**
 * Modal de motivo ao fechar um registro — a ÚNICA porta de fechamento da UI
 * (F8 · SCRUM-872, A4 · SCRUM-926; invariante I5).
 *
 * Até a A4 ele só se interpunha em funil de **processo**: arrastar um card de
 * **venda** para Ganho/Perdido fechava em silêncio, com o motivo implícito
 * `outro` — a divergência D3. Mesma operação, duas regras, e o relatório de
 * perdas com um balde só. Agora vale para qualquer tipo de funil, e o backend
 * recusa (400 `close_reason_required`) quem tentar sem motivo.
 *
 * O que a A4 acrescentou ao formulário: motivo único já vem escolhido; a nota é
 * `Textarea` (era um `Input` de uma linha para 2000 caracteres); em funil de
 * venda o **valor final** aparece pré-preenchido, para confirmar ou corrigir na
 * hora de ganhar; e o campo livre do D0-8 aparece ao lado da lista quando o
 * funil permite. Os campos vivem em `CloseReasonFields`, compartilhados com o
 * "resolver com desfecho" do inbox.
 */
export function CloseDealReasonModal({ open, onClose, deal, stage, pipeline, onConfirm }: CloseDealReasonModalProps) {
  const outcome: 'won' | 'lost' = stage?.isLost ? 'lost' : 'won'
  const labels = terminalLabelsOf(pipeline)
  const noun = pipelineNoun(pipeline)
  const reasons = useMemo<CloseReasonOption[]>(() => {
    const all: CloseReason[] = pipeline?.closeReasons ?? []
    const filtered = all.filter((r) => r.outcome === 'any' || r.outcome === outcome)
    const list = filtered.length > 0 ? filtered : [{ key: 'outro', label: 'Outro', outcome: 'any' as const }]
    return list.map((r) => ({ key: r.key, label: r.label }))
  }, [pipeline, outcome])

  const [fields, setFields] = useState<CloseReasonValue>(() => emptyCloseReasonValue(reasons))
  const [amountCents, setAmountCents] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Valor no fechamento: só em funil de VENDA e só ao GANHAR — a mesma regra
  // do "resolver com desfecho" (`amountApplies`), agora nas duas superfícies.
  // Editável só quando o valor não vem da soma dos itens: com itens o total é
  // deles (D4), e um campo editável aqui mentiria.
  const isSales = pipelineKindOf(pipeline) === 'sales'
  const hasItems = (deal?.lineItems?.length ?? 0) > 0
  const showsAmount = isSales && outcome === 'won' && !!deal
  const amountEditable = showsAmount && !hasItems

  useEffect(() => {
    if (!open) return
    setFields(emptyCloseReasonValue(reasons))
    setAmountCents(deal?.amountCents ?? 0)
    setError('')
    setSaving(false)
    // `reasons` fora das deps: é derivado de `pipeline`, já na lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal?.id, stage?.id, pipeline?.id])

  const handleConfirm = async () => {
    const built = composeCloseReason({
      picked: fields.picked,
      free: fields.free,
      note: fields.note,
      allowFree: pipeline?.allowFreeCloseReason,
    })
    if ('error' in built) { setError(built.error); return }
    setSaving(true)
    setError('')
    try {
      await onConfirm({
        outcome,
        ...built.value,
        ...(amountEditable && amountCents !== (deal?.amountCents ?? 0) ? { amountCents } : {}),
      })
      onClose()
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, `Não foi possível fechar o ${noun}.`))
    } finally {
      setSaving(false)
    }
  }

  const terminalLabel = stage?.label ?? (outcome === 'won' ? labels.won : labels.lost)
  const title = `${terminalLabel} — motivo`
  const canConfirm = !!fields.picked || (!!pipeline?.allowFreeCloseReason && fields.free.trim().length > 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            variant={outcome === 'lost' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={saving}
            disabled={saving || !canConfirm}
            data-testid="close-deal-confirm"
          >
            {outcome === 'won' ? `Marcar como ${labels.won}` : `Marcar como ${labels.lost}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-surface-300">
          Mover <span className="font-medium text-surface-100">{deal?.contact?.displayName ?? deal?.title ?? `este ${noun}`}</span> para{' '}
          <span className="font-medium text-surface-100">{terminalLabel}</span> fecha o {noun}. Registre o motivo — ele fica no histórico e alimenta os relatórios.
        </p>

        <CloseReasonFields
          reasons={reasons}
          value={fields}
          onChange={(next) => { setFields(next); setError('') }}
          allowFree={pipeline?.allowFreeCloseReason}
          error={error}
          disabled={saving}
          autoFocus
          notePlaceholder="Ex: paciente confirmou por telefone"
        />

        {showsAmount && (amountEditable ? (
          <FormField
            label="Valor final"
            hint="Confirme ou corrija o valor com que o negócio fecha."
          >
            <MoneyInput value={amountCents} onChange={setAmountCents} />
          </FormField>
        ) : (
          <p className="text-xs text-surface-400" data-testid="close-deal-amount-readonly">
            Valor final: <span className="tabular-nums text-surface-200">{formatBRL(deal?.amountCents ?? 0)}</span>
            {' '}— soma dos itens; edite os itens para mudar.
          </p>
        ))}
      </div>
    </Modal>
  )
}
