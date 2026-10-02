// ─── CL5 — links de cobrança com VITE_SETTINGS_BILLING desligada ──────────────
// Com a flag desligada, /settings/billing redireciona para "Minha conta".
// Nenhum botão/link deve levar para lá; com a flag ligada, tudo como antes.

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FEATURE_FLAGS } from '@/config/featureFlags'

vi.mock('@/services/billingApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/billingApi')>()),
  billingApi: { getDebt: vi.fn() },
  openInvoicePdf: vi.fn(),
}))

import { billingApi } from '@/services/billingApi'
import { billingHref, billingSettingsEnabled, notificationLinkAllowed } from '@/lib/billingLinks'
import { CopilotBlockedError, describeCopilotBlock } from '@/lib/copilotBlock'
import { inlineActionFor } from '@/lib/notificationsUx'
import { ModuleNotContracted } from '@/components/billing/ModuleNotContracted'
import { SuspendedScreen } from '@/components/billing/SuspendedScreen'
import type { AppNotification } from '@/hooks/useNotifications'

const flags = FEATURE_FLAGS as { settingsBilling: boolean }
const original = flags.settingsBilling
const getDebt = billingApi.getDebt as unknown as ReturnType<typeof vi.fn>

const notif: AppNotification = {
  id: 'n1', type: 'billing_alert', title: 'Fatura vencida', description: null, link: '/settings/billing?invoice=abc',
  isRead: false, createdAt: '2026-09-30T12:00:00Z', metadata: null,
}
const suspended = () => new CopilotBlockedError('Conta suspensa.', 'entitlement', 'subscription_suspended')

beforeEach(() => { getDebt.mockReset() })
afterAll(() => { flags.settingsBilling = original })

describe('flag DESLIGADA', () => {
  beforeEach(() => { flags.settingsBilling = false })

  it('helper: sem destino', () => {
    expect(billingSettingsEnabled()).toBe(false)
    expect(billingHref()).toBeNull()
    expect(billingHref('/settings/billing?invoice=x')).toBeNull()
    // clique na notificação (sino e página de notificações)
    expect(notificationLinkAllowed('/settings/billing?invoice=x')).toBe(false)
    expect(notificationLinkAllowed('/conversations/1')).toBe(true)
  })

  it('Copilot suspenso: oferece falar com a Oryon, não a tela de cobrança', () => {
    const href = describeCopilotBlock(suspended(), 'business_admin').action?.href
    expect(href).toContain('mailto:')
    expect(href).not.toContain('/settings/billing')
  })

  it('notificação de cobrança: sem botão "Ver cobrança"', () => {
    expect(inlineActionFor(notif)).toBeNull()
    expect(inlineActionFor({ ...notif, link: null, type: 'billing_update' })).toBeNull()
  })

  it('módulo não contratado: sem link "Ver o meu contrato"', () => {
    render(<MemoryRouter><ModuleNotContracted module="copilot" isOwner /></MemoryRouter>)
    expect(screen.queryByText(/Ver o meu contrato/)).not.toBeInTheDocument()
  })

  it('conta suspensa com falha de carga: sem link para a cobrança, com "Tentar novamente"', async () => {
    getDebt.mockRejectedValue(new Error('rede'))
    render(<MemoryRouter><SuspendedScreen isOwner /></MemoryRouter>)
    await screen.findByText(/Não foi possível carregar as faturas agora/)
    expect(screen.queryByRole('link', { name: /Plano & faturamento/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('conta suspensa com dívida: sem "Ver todas as faturas"', async () => {
    getDebt.mockResolvedValue({ items: [], totalCents: 0, totalUpdatedCents: 0, paymentInstructions: 'Pix' })
    render(<MemoryRouter><SuspendedScreen isOwner /></MemoryRouter>)
    await screen.findByText('Como pagar')
    expect(screen.queryByText(/Ver todas as faturas/)).not.toBeInTheDocument()
  })
})

describe('flag LIGADA (comportamento de antes)', () => {
  beforeEach(() => { flags.settingsBilling = true })

  it('helper, Copilot e notificação apontam para /settings/billing', () => {
    expect(billingHref()).toBe('/settings/billing')
    expect(describeCopilotBlock(suspended(), 'business_admin').action?.href).toBe('/settings/billing')
    expect(inlineActionFor(notif)?.href).toBe('/settings/billing?invoice=abc')
    expect(notificationLinkAllowed('/settings/billing?invoice=abc')).toBe(true)
  })

  it('módulo não contratado e conta suspensa mostram os links', async () => {
    render(<MemoryRouter><ModuleNotContracted module="copilot" isOwner /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Ver o meu contrato/ })).toHaveAttribute('href', '/settings/billing')
    getDebt.mockResolvedValue({ items: [], totalCents: 0, totalUpdatedCents: 0, paymentInstructions: 'Pix' })
    render(<MemoryRouter><SuspendedScreen isOwner /></MemoryRouter>)
    expect(await screen.findByRole('link', { name: /Ver todas as faturas/ })).toHaveAttribute('href', '/settings/billing')
  })
})
