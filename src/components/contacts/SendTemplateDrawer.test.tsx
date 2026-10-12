// "Iniciar conversa" (Leads): escolher o template abre o modal de variáveis +
// prévia (o mesmo de Conversas); Enviar chama sendTemplate com as variáveis e
// redireciona para /conversations?id=<conversationId>.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SendTemplateDrawer } from './SendTemplateDrawer'
import { templatesApi, contactsApi } from '@/services/api'
import type { Contact, WhatsAppTemplate } from '@/types'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@/services/api', () => ({
  templatesApi: { list: vi.fn() },
  contactsApi: { sendTemplate: vi.fn() },
}))

const TPL = {
  id: 't1', tenantId: 'x', name: 'boas_vindas', language: 'pt_BR', category: 'UTILITY', status: 'APPROVED',
  body: 'Olá {{1}}!', bodyVariables: ['nome'], createdAt: '', updatedAt: '',
} as WhatsAppTemplate
const CONTACT = { id: 'c1', displayName: 'Ana' } as Contact

describe('SendTemplateDrawer', () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(templatesApi.list).mockResolvedValue({ data: [TPL] } as never)
    vi.mocked(contactsApi.sendTemplate).mockReset()
  })

  it('escolher template abre o modal, envia com as variáveis e redireciona pra conversa', async () => {
    vi.mocked(contactsApi.sendTemplate).mockResolvedValue({ data: { conversationId: 'cv9', messageId: 'm1' } } as never)
    const onClose = vi.fn()
    render(<SendTemplateDrawer contact={CONTACT} open onClose={onClose} />)

    fireEvent.click(await screen.findByText('boas vindas'))
    // Um único diálogo — e nada foi enviado ainda.
    expect(await screen.findByText('Revisar template')).toBeInTheDocument()
    expect(contactsApi.sendTemplate).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Variável \{\{1\}\}/), { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar template/i }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/conversations?id=cv9'))
    expect(contactsApi.sendTemplate).toHaveBeenCalledWith('c1', 'boas_vindas', 'pt_BR', ['Ana'])
    expect(onClose).toHaveBeenCalled()
  })

  it('Cancelar no modal não envia nem redireciona', async () => {
    render(<SendTemplateDrawer contact={CONTACT} open onClose={vi.fn()} />)
    fireEvent.click(await screen.findByText('boas vindas'))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByText('Revisar template')).not.toBeInTheDocument())
    expect(contactsApi.sendTemplate).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
