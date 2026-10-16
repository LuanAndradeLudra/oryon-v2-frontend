// Integração 1200 (16/10): avisos de cobrança com a cor de estado pelo evento.
import { describe, it, expect } from 'vitest'
import { sentenceFor, toneFor } from './notificationSentence'
import type { AppNotification } from '@/hooks/useNotifications'

const aviso = (type: string, event: string | undefined, description: string | null = 'Pague para evitar a suspensão'): AppNotification => ({
  id: 'n', type, title: 'Fatura em atraso', description, link: '/settings/billing', isRead: false,
  createdAt: '2026-10-16T12:00:00Z', metadata: event ? { event } : null,
} as AppNotification)

describe('sentenceFor — cobrança', () => {
  it('atraso e suspensão: perigo', () => {
    expect(sentenceFor(aviso('billing_alert', 'invoice.overdue')).state).toEqual({ text: 'Pague para evitar a suspensão', tone: 'danger' })
    expect(sentenceFor(aviso('billing_alert', 'account.suspended')).state?.tone).toBe('danger')
  })

  it('vencimento próximo: atenção; pagamento confirmado: ok', () => {
    expect(sentenceFor(aviso('billing_update', 'invoice.due_soon')).state?.tone).toBe('warn')
    expect(sentenceFor(aviso('billing_update', 'payment.confirmed')).state?.tone).toBe('ok')
  })

  it('aviso informativo (fatura emitida): sem cor, com o texto', () => {
    const s = sentenceFor(aviso('billing_update', 'invoice.issued', 'Vence em 10/11'))
    expect(s.state).toBeUndefined()
    expect(s.excerpt).toBe('Vence em 10/11')
    expect(toneFor(aviso('billing_update', 'invoice.issued'), s)).toBeUndefined()
  })

  it('alerta antigo sem evento no metadata: ainda perigo', () => {
    expect(sentenceFor(aviso('billing_alert', undefined)).state?.tone).toBe('danger')
  })
})
