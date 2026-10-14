import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FEATURE_FLAGS } from '@/config/featureFlags'
import { inlineActionFor } from './notificationsUx'
import type { AppNotification } from '@/hooks/useNotifications'

const base: AppNotification = {
  id: 'n1', type: 'billing_alert', title: 'Fatura vencida', description: null, link: null,
  isRead: false, createdAt: '2026-09-30T12:00:00Z', metadata: null,
}

describe('inlineActionFor — cobrança (SCRUM-1206, N10)', () => {
  // CL5 — com a tela de cobrança ligada (desligada: billingLinks.test.tsx).
  const flags = FEATURE_FLAGS as { settingsBilling: boolean }
  const original = flags.settingsBilling
  beforeEach(() => { flags.settingsBilling = true })
  afterEach(() => { flags.settingsBilling = original })

  it('"Ver cobrança" usa o link da notificação', () => {
    expect(inlineActionFor({ ...base, link: '/settings/billing?invoice=abc' })?.href).toBe('/settings/billing?invoice=abc')
  })
  it('sem link, cai em /settings/billing', () => {
    expect(inlineActionFor({ ...base, type: 'billing_update' })?.href).toBe('/settings/billing')
  })
})
