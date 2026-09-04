// F10 (SCRUM-881) — lógica pura do popover "Resolver com desfecho" (prancheta 5):
// motivo do catálogo por tipo de funil (vem no envelope do alvo, F6) e valor
// opcional em funil de venda. Sem React, sem API — testável isolado.
import type { AiDealTargetView } from '@/types'

/** O que o atendente decidiu ao resolver: fechou (won) · não fechou (lost) · sem decisão (mantém aberto). */
export type ResolveDecision = 'won' | 'lost' | 'none'

export interface ResolveDecisionOption {
  value: ResolveDecision
  label: string
  hint: string
}

/** Rótulos do popover — vocabulário do tipo: venda fala em "fechou", processo em "concluiu". */
export function decisionOptions(target: AiDealTargetView): ResolveDecisionOption[] {
  const labels = target.terminalLabels ?? { won: 'Ganho', lost: 'Perdido' }
  const isSales = (target.pipelineKind ?? 'sales') === 'sales'
  return [
    {
      value: 'won',
      label: isSales ? 'Fechou' : 'Concluiu',
      hint: `Marca o registro como ${labels.won}`,
    },
    {
      value: 'lost',
      label: isSales ? 'Não fechou' : 'Não concluiu',
      hint: `Marca o registro como ${labels.lost}`,
    },
    {
      value: 'none',
      label: 'Sem decisão',
      hint: `Resolve a conversa e mantém o registro em ${target.currentStageLabel ?? 'aberto'}`,
    },
  ]
}

/** Catálogo do desfecho (I5). Sem catálogo (backend antigo) → só "Outro". */
export function reasonsFor(target: AiDealTargetView, decision: ResolveDecision): Array<{ key: string; label: string }> {
  if (decision === 'none') return []
  const list = target.closeReasons?.[decision] ?? []
  return list.length > 0 ? list : [{ key: 'outro', label: 'Outro' }]
}

/** Valor só faz sentido em funil de VENDA e quando fechou. */
export function amountApplies(target: AiDealTargetView, decision: ResolveDecision): boolean {
  return decision === 'won' && (target.pipelineKind ?? 'sales') === 'sales'
}

/** Rótulo do botão principal: "Resolver e marcar Ganho" / "…Perdido" / "Só resolver". */
export function confirmLabel(target: AiDealTargetView, decision: ResolveDecision): string {
  if (decision === 'none') return 'Só resolver'
  const labels = target.terminalLabels ?? { won: 'Ganho', lost: 'Perdido' }
  return `Resolver e marcar ${decision === 'won' ? labels.won : labels.lost}`
}

/**
 * "129", "129,90", "R$ 1.290,50", "1290.5" → centavos. Vazio → null (não mexe
 * no valor). Inválido → NaN (o formulário avisa).
 */
export function parseBrlToCents(raw: string): number | null {
  const s = raw.replace(/[R$\s]/g, '').trim()
  if (!s) return null
  // Última vírgula ou ponto vira separador decimal; os outros são milhar.
  const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  let intPart = s
  let frac = ''
  if (lastSep >= 0) {
    const after = s.slice(lastSep + 1)
    if (after.length <= 2 && /^\d*$/.test(after)) {
      intPart = s.slice(0, lastSep)
      frac = after
    }
  }
  intPart = intPart.replace(/[.,]/g, '')
  if (!/^\d+$/.test(intPart) || !/^\d{0,2}$/.test(frac)) return NaN
  return Number(intPart) * 100 + Number((frac + '00').slice(0, 2))
}

export function formatCentsBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export interface ResolvePayload {
  dealOutcome?: { outcome: 'won' | 'lost'; reason: string; note?: string }
  /** Só quando o atendente informou um valor diferente do atual (venda + fechou). */
  amountCents?: number
}

/**
 * Monta o que vai para a API a partir do formulário. Devolve `error` em vez
 * de lançar para o popover mostrar inline.
 */
export function buildResolvePayload(input: {
  target: AiDealTargetView
  decision: ResolveDecision
  reason: string
  note: string
  amountRaw: string
  currentAmountCents: number | null
}): { payload: ResolvePayload } | { error: string } {
  const { target, decision, reason, note, amountRaw, currentAmountCents } = input
  if (decision === 'none') return { payload: {} }
  if (!reason) return { error: 'Escolha um motivo.' }
  const payload: ResolvePayload = {
    dealOutcome: { outcome: decision, reason, note: note.trim() || undefined },
  }
  if (amountApplies(target, decision)) {
    const cents = parseBrlToCents(amountRaw)
    if (cents !== null && Number.isNaN(cents)) return { error: 'Valor inválido — use 129,90.' }
    if (cents !== null && cents !== currentAmountCents) payload.amountCents = cents
  }
  return { payload }
}
