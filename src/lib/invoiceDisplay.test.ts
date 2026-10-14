import { describe, it, expect } from 'vitest'
import { invoiceStatusText, signedAmount } from './invoiceDisplay'
import { localIsoDate } from './localDate'

const LABELS = { paid: 'Paga', pending: 'Em aberto' }

describe('invoiceDisplay (SCRUM-1209)', () => {
  it('nota de crédito é negativa e nunca "Paga"', () => {
    expect(signedAmount('credit_note', 5000)).toBe(-5000)
    expect(signedAmount('credit_note', -5000)).toBe(-5000)
    expect(signedAmount('subscription', 5000)).toBe(5000)
    expect(invoiceStatusText({ kind: 'credit_note', status: 'paid' }, LABELS)).toBe('Nota de crédito')
  })
  it('vencida vence o status; senão usa o rótulo', () => {
    expect(invoiceStatusText({ kind: 'subscription', status: 'pending' }, LABELS, true)).toBe('Vencida')
    expect(invoiceStatusText({ kind: 'subscription', status: 'pending' }, LABELS)).toBe('Em aberto')
    expect(invoiceStatusText({ kind: 'subscription', status: 'weird' }, LABELS)).toBe('weird')
  })
})

describe('localIsoDate', () => {
  it('usa a data do relógio local (não UTC)', () => {
    // 23h30 local do dia 30/09 — em UTC-3 isso já é 01/10 no toISOString.
    const d = new Date(2026, 8, 30, 23, 30)
    expect(localIsoDate(d)).toBe('2026-09-30')
  })
})
