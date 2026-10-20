// Console "Termos" (20/10): situação das versões, aviso aos donos e
// publicação com resumo (versão é definitiva).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { list, publish, notify, toast } = vi.hoisted(() => ({ list: vi.fn(), publish: vi.fn(), notify: vi.fn(), toast: vi.fn() }))
vi.mock('@/services/adminTermsApi', async (orig) => ({
  ...(await orig<typeof import('@/services/adminTermsApi')>()),
  adminTermsApi: { list, publish, notify },
}))
vi.mock('@/hooks/useToast', () => ({ showToast: toast }))

import { TermsAdminPage } from './TermsAdminPage'
import type { AdminTermsVersion } from '@/services/adminTermsApi'

const v = (p: Partial<AdminTermsVersion>): AdminTermsVersion => ({
  id: 'v1', document: 'terms_of_use', version: '2026-09', effectiveAt: '2026-09-01T12:00:00Z', createdAt: '2026-08-01T12:00:00Z',
  contentUrl: 'https://oryon.com.br/termos', hasContent: false, contentHash: 'abc', status: 'current',
  noticeSent: 0, noticeProblems: 0, acceptances: 97, ...p,
})

const renderPage = () => render(<MemoryRouter><TermsAdminPage /></MemoryRouter>)

beforeEach(() => { for (const m of [list, publish, notify, toast]) m.mockReset() })

describe('TermsAdminPage', () => {
  it('mostra vigente, agendada com o progresso do aviso e o histórico', async () => {
    list.mockResolvedValue({ owners: 124, versions: [
      v({ id: 'v2', version: '2026-11', status: 'scheduled', effectiveAt: '2026-11-20T12:00:00Z', noticeSent: 118, noticeProblems: 6 }),
      v({}),
      v({ id: 'v0', version: '2026-03', status: 'previous', acceptances: 88 }),
    ] })
    renderPage()
    expect(await screen.findByText('118 de 124 donos')).toBeInTheDocument()
    expect(screen.getByText('Agendada')).toBeInTheDocument()
    expect(screen.getByText('Vigente')).toBeInTheDocument()
    expect(screen.getByText('2026-03 · anterior')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma versão publicada')).toBeInTheDocument() // Política sem versão
  })

  it('"Avisar quem falta" chama o aviso da versão agendada', async () => {
    list.mockResolvedValue({ owners: 124, versions: [v({ id: 'v2', version: '2026-11', status: 'scheduled', noticeSent: 118 })] })
    notify.mockResolvedValue({ recipients: 124 })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Avisar quem falta/ }))
    await waitFor(() => expect(notify).toHaveBeenCalledWith('v2'))
  })

  it('publica com aviso, depois de validar a versão repetida', async () => {
    list.mockResolvedValue({ owners: 124, versions: [v({})] })
    publish.mockResolvedValue({ version: { id: 'n' }, notice: { recipients: 124 } })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Publicar nova versão/ }))
    const versao = screen.getByPlaceholderText('2026-11')
    fireEvent.change(versao, { target: { value: '2026-09' } })
    expect(screen.getByText('Esta versão já foi publicada para este documento.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar versão' })).toBeDisabled()
    fireEvent.change(versao, { target: { value: '2026-11' } })
    fireEvent.change(screen.getByPlaceholderText('https://oryon.com.br/termos/2026-11'), { target: { value: 'https://oryon.com.br/termos/2026-11' } })
    expect(screen.getByText(/Confira antes de publicar: Termos de Uso · versão 2026-11/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Publicar versão' }))
    await waitFor(() => expect(publish).toHaveBeenCalledWith(expect.objectContaining({
      document: 'terms_of_use', version: '2026-11', contentUrl: 'https://oryon.com.br/termos/2026-11', notify: true,
    })))
  })

  it('sem link, não oferece o aviso por e-mail', async () => {
    list.mockResolvedValue({ owners: 124, versions: [] })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Publicar nova versão/ }))
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(screen.getByText('Precisa de data futura e do link público do texto.')).toBeInTheDocument()
  })
})
