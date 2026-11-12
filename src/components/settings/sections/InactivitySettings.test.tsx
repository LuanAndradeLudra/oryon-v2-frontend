import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/services/api', () => ({ api: { get, put } }))
const toast = vi.fn()
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast }) }))
vi.mock('../SectionHeader', () => ({ SectionHeader: ({ title }: { title: string }) => <h1>{title}</h1> }))
vi.mock('../SettingsSection', () => ({
  SettingsSection: ({ title, children }: { title: string; children: React.ReactNode }) => <section aria-label={title}>{children}</section>,
}))

import { InactivitySettings } from './InactivitySettings'

afterEach(() => { cleanup(); get.mockReset(); put.mockReset(); toast.mockReset() })

describe('Configurações · Encerramento por inatividade (auditoria 12/11, D5)', () => {
  it('mostra o estado, o prazo e a prévia do que seria arquivado', async () => {
    get.mockResolvedValue({ data: { enabled: true, days: 7, pending: 12, open: 30, oldest: '2026-05-14T10:00:00Z' } })
    render(<InactivitySettings />)
    expect(await screen.findByText('Ligado')).toBeTruthy()
    expect(screen.getByRole('radio', { name: '7 dias' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('inatividade-previa').textContent).toContain('42 conversas (12 pendentes, 30 abertas) sem mensagem há mais de 7 dias')
  })

  it('trocar o prazo grava no servidor e mostra a nova prévia', async () => {
    get.mockResolvedValue({ data: { enabled: true, days: 7, pending: 0, open: 0, oldest: null } })
    put.mockResolvedValue({ data: { enabled: true, days: 15, pending: 0, open: 0, oldest: null } })
    render(<InactivitySettings />)
    fireEvent.click(await screen.findByRole('radio', { name: '15 dias' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/settings/inactivity', { days: 15 }))
    await waitFor(() => expect(screen.getByRole('radio', { name: '15 dias' }).getAttribute('aria-checked')).toBe('true'))
    expect(screen.getByTestId('inatividade-previa').textContent).toContain('Nenhuma conversa parada há mais de 15 dias')
  })
})
