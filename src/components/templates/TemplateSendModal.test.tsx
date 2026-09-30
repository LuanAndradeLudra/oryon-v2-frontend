// Fluxo compartilhado "Revisar template" (SCRUM-807): variáveis + prévia antes de
// enviar. Usado por Conversas (MessageInput) e pelo "Iniciar conversa" dos Leads.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TemplateSendModal } from './TemplateSendModal'
import { contactsApi } from '@/services/api'
import type { WhatsAppTemplate } from '@/types'

vi.mock('@/services/api', () => ({
  contactsApi: { sendTemplate: vi.fn() },
}))

const TPL = {
  id: 't1', tenantId: 'x', name: 'boas_vindas', language: 'pt_BR', category: 'UTILITY', status: 'APPROVED',
  body: 'Olá {{1}}, sua consulta é {{2}}.', bodyVariables: ['nome', 'data'], createdAt: '', updatedAt: '',
} as WhatsAppTemplate

describe('TemplateSendModal', () => {
  beforeEach(() => { vi.mocked(contactsApi.sendTemplate).mockReset() })

  it('bloqueia o envio até preencher todas as variáveis e envia com elas em ordem', async () => {
    vi.mocked(contactsApi.sendTemplate).mockResolvedValue({ data: { conversationId: 'cv1', messageId: 'm1' } } as never)
    const onSent = vi.fn()
    render(<TemplateSendModal template={TPL} contactId="c1" recipientName="Ana" onClose={vi.fn()} onSent={onSent} />)

    const send = screen.getByRole('button', { name: /enviar template/i })
    expect(send).toBeDisabled()
    expect(screen.getByText(/mensagem real será enviada para Ana/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Variável \{\{1\}\}/), { target: { value: 'Ana' } })
    expect(send).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Variável \{\{2\}\}/), { target: { value: 'amanhã' } })
    expect(send).toBeEnabled()

    fireEvent.click(send)
    await waitFor(() => expect(onSent).toHaveBeenCalledWith({ conversationId: 'cv1', messageId: 'm1' }))
    expect(contactsApi.sendTemplate).toHaveBeenCalledWith('c1', 'boas_vindas', 'pt_BR', ['Ana', 'amanhã'])
  })

  it('mantém o modal aberto e mostra o erro quando o envio falha', async () => {
    vi.mocked(contactsApi.sendTemplate).mockRejectedValue(new Error('boom'))
    const onSent = vi.fn()
    render(<TemplateSendModal template={{ ...TPL, body: 'Olá!', bodyVariables: [] }} contactId="c1" onClose={vi.fn()} onSent={onSent} />)
    fireEvent.click(screen.getByRole('button', { name: /enviar template/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onSent).not.toHaveBeenCalled()
  })

  it('sem onBack: "Cancelar" encerra (Conversas). Com onBack: "Voltar" volta e X/Esc encerram', () => {
    const onClose = vi.fn(); const onBack = vi.fn()
    const { rerender } = render(<TemplateSendModal template={TPL} contactId="c1" onClose={onClose} onSent={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument()

    rerender(<TemplateSendModal template={TPL} contactId="c1" onClose={onClose} onBack={onBack} onSent={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
