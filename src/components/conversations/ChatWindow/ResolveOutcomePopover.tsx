import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn, getApiErrorMessage } from '@/lib/utils'
import {
  decisionOptions, reasonsFor, amountApplies, confirmLabel, formatCentsBRL, buildResolvePayload,
  type ResolveDecision, type ResolvePayload,
} from '@/lib/resolveOutcome'
import type { AiDealTargetView } from '@/types'

interface PanelProps {
  target: AiDealTargetView
  contactName: string
  currentAmountCents: number | null
  busy: boolean
  onConfirm: (payload: ResolvePayload) => Promise<void>
  onCancel: () => void
}

/**
 * F10 (SCRUM-880) — conteúdo do popover "Resolver com desfecho" (prancheta 5):
 * três saídas (fechou · não fechou · sem decisão), motivo do catálogo por tipo
 * (I5), valor opcional em venda + fechou, e dois botões — "Só resolver" (mantém
 * o registro aberto) e "Resolver e marcar <terminal>". Só existe quando a
 * conversa tem registro-alvo (o hook decide); por isso nunca muda o caminho de
 * quem resolve uma conversa sem funil.
 */
export function ResolveOutcomePanel({ target, contactName, currentAmountCents, busy, onConfirm, onCancel }: PanelProps) {
  const options = useMemo(() => decisionOptions(target), [target])
  const [decision, setDecisionState] = useState<ResolveDecision>('won')
  const reasons = useMemo(() => reasonsFor(target, decision), [target, decision])
  const [pickedReason, setPickedReason] = useState('')
  // Catálogo com um único motivo → já vem escolhido (menos um clique no caso comum).
  const reason = pickedReason || (reasons.length === 1 ? reasons[0].key : '')
  const [note, setNote] = useState('')
  const [amountRaw, setAmountRaw] = useState(() => (currentAmountCents ? (currentAmountCents / 100).toFixed(2).replace('.', ',') : ''))
  const [error, setError] = useState('')
  const firstRadioRef = useRef<HTMLInputElement>(null)

  const setDecision = (d: ResolveDecision) => { setDecisionState(d); setPickedReason(''); setError('') }

  // Teclado: foco na primeira opção ao abrir; setas navegam os radios nativos; Esc fecha.
  useEffect(() => {
    const t = requestAnimationFrame(() => firstRadioRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [])

  const submit = async (forcedDecision?: ResolveDecision) => {
    const d = forcedDecision ?? decision
    const built = buildResolvePayload({ target, decision: d, reason, note, amountRaw, currentAmountCents })
    if ('error' in built) { setError(built.error); return }
    setError('')
    try {
      await onConfirm(built.payload)
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Não foi possível registrar o desfecho.'))
    }
  }

  const showAmount = amountApplies(target, decision)
  const where = [target.pipelineName, target.currentStageLabel].filter(Boolean).join(' · ')

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel() } }}
      data-testid="resolve-outcome-panel"
    >
      <div>
        <h3 className="text-sm font-semibold text-surface-50">Resolver com desfecho</h3>
        <p className="text-xs text-surface-400 mt-0.5" data-testid="resolve-summary">
          <span className="text-surface-200 font-medium">{contactName}</span> está em {where || 'um funil'}. O que aconteceu?
        </p>
      </div>

      <div role="radiogroup" aria-label="Desfecho" className="flex flex-col gap-1">
        {options.map((o, i) => {
          const active = decision === o.value
          return (
            <label
              key={o.value}
              className={cn(
                'flex items-start gap-2.5 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors',
                active ? 'border-brand-500/60 bg-brand-600/10' : 'border-surface-700 hover:bg-surface-800',
              )}
            >
              <input
                ref={i === 0 ? firstRadioRef : undefined}
                type="radio"
                name="resolve-decision"
                value={o.value}
                checked={active}
                onChange={() => setDecision(o.value)}
                className="mt-0.5 accent-[var(--color-brand-500)]"
                data-testid={`resolve-${o.value}`}
              />
              <span className="flex flex-col">
                <span className={cn('text-sm font-medium', active ? 'text-surface-50' : 'text-surface-200')}>{o.label}</span>
                <span className="text-[11px] text-surface-400">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      {decision !== 'none' && (
        <FormField label="Motivo" required error={error && !error.startsWith('Valor') ? error : undefined}>
          <Select
            aria-label="Motivo do desfecho"
            value={reason}
            onChange={(e) => { setPickedReason(e.target.value); setError('') }}
            data-testid="resolve-reason"
          >
            <option value="">— escolher —</option>
            {reasons.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
        </FormField>
      )}

      {showAmount && (
        <FormField label="Valor (opcional)" error={error.startsWith('Valor') ? error : undefined}>
          <Input
            inputMode="decimal"
            placeholder={currentAmountCents ? formatCentsBRL(currentAmountCents) : 'R$ 0,00'}
            value={amountRaw}
            onChange={(e) => { setAmountRaw(e.target.value); setError('') }}
            aria-label="Valor do negócio"
            data-testid="resolve-amount"
          />
        </FormField>
      )}

      {decision !== 'none' && (
        <FormField label="Observação (opcional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: adesão ao plano Família" maxLength={2000} aria-label="Observação do desfecho" />
        </FormField>
      )}

      {error && decision === 'none' && <p role="alert" className="text-xs text-danger">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => submit('none')} disabled={busy} data-testid="resolve-only">
          Só resolver
        </Button>
        {decision !== 'none' && (
          <Button
            type="button"
            variant={decision === 'lost' ? 'danger' : 'primary'}
            size="sm"
            onClick={() => submit()}
            loading={busy}
            disabled={busy}
            data-testid="resolve-confirm"
          >
            {confirmLabel(target, decision)}
          </Button>
        )}
      </div>
    </div>
  )
}

interface PopoverProps extends Omit<PanelProps, 'target'> {
  open: boolean
  /** Mobile → BottomSheet; desktop → painel ancorado sob o status (SCRUM-883). */
  mobile: boolean
  target: AiDealTargetView | null
}

export function ResolveOutcomePopover({ open, mobile, target, onCancel, ...panel }: PopoverProps) {
  if (!open || !target) return null
  if (mobile) {
    return (
      <BottomSheet open onClose={onCancel} size="tall" ariaLabel="Resolver com desfecho">
        <ResolveOutcomePanel target={target} onCancel={onCancel} {...panel} />
      </BottomSheet>
    )
  }
  return (
    <>
      <div className="overlay-scrim z-40" aria-hidden onMouseDown={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resolver com desfecho"
        className="absolute right-0 top-full mt-1 w-[22rem] max-w-[calc(100vw-1rem)] p-4 overlay-surface border rounded-xl z-50"
      >
        <ResolveOutcomePanel target={target} onCancel={onCancel} {...panel} />
      </div>
    </>
  )
}
