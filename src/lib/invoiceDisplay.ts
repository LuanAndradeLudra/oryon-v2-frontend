// ─── Exibição de faturas (SCRUM-1209) ─────────────────────────────────────────
// Nota de crédito é um estorno: aparece como "Nota de crédito", com valor
// NEGATIVO e referência à fatura original — nunca como "Paga" (no banco ela
// nasce com status `paid` e valor positivo).

export const isCreditNote = (kind: string | null | undefined) => kind === 'credit_note'

/** Valor com sinal: nota de crédito sempre negativa. */
export function signedAmount(kind: string, amount: number): number {
  return isCreditNote(kind) ? -Math.abs(amount) : amount
}

/** Rótulo do status: nota de crédito > vencida > status do backend. */
export function invoiceStatusText(
  inv: { kind: string; status: string },
  labels: Record<string, string>,
  overdue = false,
): string {
  if (isCreditNote(inv.kind)) return 'Nota de crédito'
  if (overdue) return 'Vencida'
  return labels[inv.status] ?? inv.status
}
