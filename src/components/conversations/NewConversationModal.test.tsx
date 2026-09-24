// "Nova conversa" (SCRUM-1097): buscar -> abrir conversa existente sem template;
// buscar -> sem conversa -> template -> envio (mockado) -> navigate; criar contato inline.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NewConversationModal } from './NewConversationModal'
import { contactsApi, templatesApi } from '@/services/api'
import { LayerProvider } from '@/contexts/LayerContext'
import type { Contact, WhatsAppTemplate } from '@/types'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@/services/api', () => ({
  contactsApi: { list: vi.fn(), getConversations: vi.fn(), sendTemplate: vi.fn(), create: vi.fn() },
  templatesApi: { list: vi.fn() },
  dealsApi: { summary: vi.fn(async () => ({ data: [] })) },
}))
vi.mock('@/services/socket', () => ({ connectSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))

const ANA = { id: 'c1', displayName: 'Ana Souza', waId: '5511999887766' } as Contact
const BIA = { id: 'c2', displayName: 'Bia Lima', waId: '5511988776655' } as Contact
const TPL = {
  id: 't1', tenantId: 'x', name: 'boas_vindas', language: 'pt_BR', category: 'UTILITY', status: 'APPROVED',
  body: 'Olá {{1}}!', bodyVariables: ['nome'], createdAt: '', updatedAt: '',
} as WhatsAppTemplate

function listReturns(data: Contact[]) {
  vi.mocked(contactsApi.list).mockResolvedValue({ data: { data, total: data.length } } as never)
}
function search(text: string) {
  fireEvent.change(screen.getByLabelText('Buscar contato por nome ou telefone'), { target: { value: text } })
}

describe('NewConversationModal', () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(contactsApi.list).mockReset()
    vi.mocked(contactsApi.sendTemplate).mockReset()
    vi.mocked(contactsApi.create).mockReset()
    vi.mocked(contactsApi.getConversations).mockReset()
    vi.mocked(templatesApi.list).mockResolvedValue({ data: [TPL] } as never)
  })

  it('contato com conversa aberta: Abrir conversa navega e fecha, sem template', async () => {
    listReturns([ANA])
    vi.mocked(contactsApi.getConversations).mockResolvedValue({ data: { data: [{ id: 'cv1', status: 'open', lastMessageAt: new Date().toISOString() }] } } as never)
    const onClose = vi.fn()
    render(<NewConversationModal open onClose={onClose} />)

    search('ana')
    fireEvent.click(await screen.findByRole('button', { name: /Abrir conversa com Ana Souza/ }))

    expect(navigate).toHaveBeenCalledWith('/conversations?id=cv1')
    expect(onClose).toHaveBeenCalled()
    expect(contactsApi.sendTemplate).not.toHaveBeenCalled()
  })

  it('sem conversa: escolher template -> variáveis -> enviar -> abre a conversa criada', async () => {
    listReturns([BIA])
    vi.mocked(contactsApi.getConversations).mockResolvedValue({ data: { data: [] } } as never)
    vi.mocked(contactsApi.sendTemplate).mockResolvedValue({ data: { conversationId: 'cv9', messageId: 'm1' } } as never)
    const onClose = vi.fn()
    render(<NewConversationModal open onClose={onClose} />)

    search('bia')
    fireEvent.click(await screen.findByRole('button', { name: /Escolher template para Bia Lima/ }))
    fireEvent.click(await screen.findByText('boas vindas'))
    expect(await screen.findByText('Revisar template')).toBeInTheDocument()
    expect(contactsApi.sendTemplate).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Variável \{\{1\}\}/), { target: { value: 'Bia' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar template/i }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/conversations?id=cv9'))
    expect(contactsApi.sendTemplate).toHaveBeenCalledWith('c2', 'boas_vindas', 'pt_BR', ['Bia'])
    expect(onClose).toHaveBeenCalled()
  })

  it('sem resultado: cria o contato inline e segue para o passo do template', async () => {
    listReturns([])
    vi.mocked(contactsApi.create).mockResolvedValue({ data: { id: 'c3', displayName: 'Caio', waId: '5511977665544' } } as never)
    render(<NewConversationModal open onClose={vi.fn()} />)

    search('caio')
    fireEvent.click(await screen.findByRole('button', { name: 'Criar contato' }))

    // Nome vem preenchido com o que foi buscado; telefone inválido bloqueia.
    expect(screen.getByLabelText(/Nome/)).toHaveValue('caio')
    fireEvent.click(screen.getByRole('button', { name: /Criar e continuar/ }))
    expect(await screen.findByText('Número WhatsApp é obrigatório')).toBeInTheDocument()
    expect(contactsApi.create).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/WhatsApp/), { target: { value: '5511977665544' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar e continuar/ }))

    await waitFor(() => expect(contactsApi.create).toHaveBeenCalledWith({ displayName: 'caio', waId: '5511977665544' }))
    expect(await screen.findByText('boas vindas')).toBeInTheDocument()
  })

  it('falha ao verificar a conversa NÃO vira "sem conversa": avisa e oferece verificar de novo', async () => {
    listReturns([ANA])
    vi.mocked(contactsApi.getConversations).mockRejectedValue(new Error('rede'))
    render(<NewConversationModal open onClose={vi.fn()} />)
    search('ana')
    expect(await screen.findByRole('button', { name: /Verificar de novo a conversa de Ana Souza/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Escolher template/ })).not.toBeInTheDocument()
  })

  // Fluxo ÚNICO, sem sobreposição: a revisão é a etapa 3 e o modal de seleção sai
  // da tela enquanto ela está aberta. "Voltar" (rodapé) retorna etapa por etapa;
  // X e Esc encerram o fluxo inteiro em QUALQUER etapa.
  it('fluxo completo: contato -> template -> revisar -> Voltar -> passo 2 -> Voltar -> passo 1', async () => {
    listReturns([BIA])
    vi.mocked(contactsApi.getConversations).mockResolvedValue({ data: { data: [] } } as never)
    const onClose = vi.fn()
    render(<LayerProvider><NewConversationModal open onClose={onClose} /></LayerProvider>)

    search('bia')
    fireEvent.click(await screen.findByRole('button', { name: /Escolher template para Bia Lima/ }))
    // Passo 2 com filtro digitado.
    fireEvent.change(await screen.findByLabelText('Filtrar templates'), { target: { value: 'boas' } })
    fireEvent.click(await screen.findByText('boas vindas'))

    // Etapa 3: só a revisão na tela (o modal de seleção não é renderizado).
    expect(await screen.findByText('Revisar template')).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.queryByText('Nova conversa')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()

    // Voltar (botão) -> passo 2 com o mesmo contato e o filtro preservado.
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByLabelText('Filtrar templates')).toHaveValue('boas')
    expect(screen.getByText(/Escolha o template para iniciar a conversa com/)).toHaveTextContent('Bia Lima')
    await waitFor(() => expect(screen.queryByText('Revisar template')).not.toBeInTheDocument())
    expect(onClose).not.toHaveBeenCalled()

    // Voltar do passo 2 -> passo 1 (sem fechar o modal).
    fireEvent.click(screen.getByRole('button', { name: /Voltar/ }))
    expect(await screen.findByLabelText('Buscar contato por nome ou telefone')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('X fecha o fluxo inteiro na revisão (etapa 3)', async () => {
    listReturns([BIA])
    vi.mocked(contactsApi.getConversations).mockResolvedValue({ data: { data: [] } } as never)
    const onClose = vi.fn()
    render(<LayerProvider><NewConversationModal open onClose={onClose} /></LayerProvider>)
    search('bia')
    fireEvent.click(await screen.findByRole('button', { name: /Escolher template para Bia Lima/ }))
    fireEvent.click(await screen.findByText('boas vindas'))
    expect(await screen.findByText('Revisar template')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('X e Esc fecham o fluxo inteiro no passo 2 (não voltam)', async () => {
    listReturns([BIA])
    vi.mocked(contactsApi.getConversations).mockResolvedValue({ data: { data: [] } } as never)
    const onClose = vi.fn()
    render(<LayerProvider><NewConversationModal open onClose={onClose} /></LayerProvider>)
    search('bia')
    fireEvent.click(await screen.findByRole('button', { name: /Escolher template para Bia Lima/ }))
    await screen.findByLabelText('Filtrar templates')

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
    // Nada voltou ao passo 1.
    expect(screen.queryByLabelText('Buscar contato por nome ou telefone')).not.toBeInTheDocument()
  })

  it('Esc no passo 1 e na revisão também encerram', async () => {
    listReturns([BIA])
    vi.mocked(contactsApi.getConversations).mockResolvedValue({ data: { data: [] } } as never)
    const onClose = vi.fn()
    render(<LayerProvider><NewConversationModal open onClose={onClose} /></LayerProvider>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    search('bia')
    fireEvent.click(await screen.findByRole('button', { name: /Escolher template para Bia Lima/ }))
    fireEvent.click(await screen.findByText('boas vindas'))
    expect(await screen.findByText('Revisar template')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
