// Console de e-mails (20/10): aviso do SMTP, reenvio por linha e os casos
// sem reenvio (redefinição de senha).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { list, summary, resend, test, resendFailed, toast } = vi.hoisted(() => ({
  list: vi.fn(), summary: vi.fn(), resend: vi.fn(), test: vi.fn(), resendFailed: vi.fn(), toast: vi.fn(),
}))
vi.mock('@/services/adminEmailsApi', async (orig) => ({
  ...(await orig<typeof import('@/services/adminEmailsApi')>()),
  adminEmailsApi: { list, summary, resend, test, resendFailed },
}))
vi.mock('@/hooks/useToast', () => ({ showToast: toast }))

import { EmailsPage } from './EmailsPage'
import type { EmailLogRow, EmailSummary } from '@/services/adminEmailsApi'

const row = (p: Partial<EmailLogRow>): EmailLogRow => ({
  id: 'e1', tenantId: 't1', companyName: 'Clínica Vida Plena', kind: 'invitation', recipient: 'ana@clinica.com',
  subject: 'Bia te convidou para o Oryon', status: 'failed', error: '535 Authentication failed', attempts: 1,
  createdAt: '2026-10-19T19:42:00Z', lastAttemptAt: '2026-10-19T19:42:00Z', sentAt: null,
  triggeredBy: null, triggeredByName: null, canResend: true, ...p,
})
const sum = (p: Partial<EmailSummary['smtp']> = {}): EmailSummary => ({
  days: 7, counts: { sent: 10, failed: 2, noSmtp: 0 },
  smtp: { configured: true, failing: false, failuresSinceLastSuccess: 0, failingSince: null, lastFailureAt: null, lastError: null, lastSentAt: null, ...p },
})

const renderPage = () => render(<MemoryRouter initialEntries={['/admin/emails']}><EmailsPage /></MemoryRouter>)

beforeEach(() => {
  for (const m of [list, summary, resend, test, resendFailed, toast]) m.mockReset()
})

describe('EmailsPage', () => {
  it('SMTP falhando: mostra o aviso com o último erro', async () => {
    list.mockResolvedValue({ total: 1, items: [row({})] })
    summary.mockResolvedValue(sum({ failing: true, failuresSinceLastSuccess: 14, failingSince: '2026-10-18T22:14:00Z', lastError: '535 5.7.8 Authentication failed' }))
    renderPage()
    expect(await screen.findByText('O envio de e-mails está falhando')).toBeInTheDocument()
    expect(screen.getByText('535 5.7.8 Authentication failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reenviar falhas/ })).toBeInTheDocument()
  })

  it('reenvio por linha atualiza a situação e avisa', async () => {
    list.mockResolvedValue({ total: 1, items: [row({})] })
    summary.mockResolvedValue(sum())
    resend.mockResolvedValue(row({ status: 'sent', attempts: 2, error: null, sentAt: '2026-10-19T20:00:00Z' }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Reenviar' }))
    await waitFor(() => expect(resend).toHaveBeenCalledWith('e1'))
    expect(await screen.findByText('Enviado')).toBeInTheDocument()
    expect(toast).toHaveBeenCalledWith('Reenviado para ana@clinica.com', 'success')
  })

  it('redefinição de senha não tem reenvio pelo console', async () => {
    list.mockResolvedValue({ total: 1, items: [row({ kind: 'password_reset', canResend: false, subject: 'Redefinir sua senha' })] })
    summary.mockResolvedValue(sum())
    renderPage()
    expect(await screen.findByText('A própria pessoa pede de novo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reenviar' })).toBeNull()
  })

  it('detalhe mostra o erro e não guarda o corpo', async () => {
    list.mockResolvedValue({ total: 1, items: [row({})] })
    summary.mockResolvedValue(sum())
    renderPage()
    fireEvent.click(await screen.findByText('ana@clinica.com'))
    expect(await screen.findByText('Erro do servidor de e-mail')).toBeInTheDocument()
    expect(screen.getByText(/Gera um link de convite novo/)).toBeInTheDocument()
  })
})
