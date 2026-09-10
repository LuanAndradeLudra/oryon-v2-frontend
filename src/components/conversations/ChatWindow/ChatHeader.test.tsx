// O PR #102 (auditoria de UX) tinha somado um botão "Resolver" de 1 clique
// ao lado do dropdown de status; ele foi REMOVIDO a pedido do PO — duas
// affordances para a mesma ação, na tela mais usada do produto. O que ficou
// daquele PR é a ordem do grupo de ações (status antes do HandoffChip), e é
// isso que estes testes fixam: resolver é uma coisa só, e vem pelo dropdown.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatHeader } from './ChatHeader'
import type { Conversation } from '@/types'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => false }))
vi.mock('@/contexts/CRMConfigContext', () => ({ useCRMConfig: () => ({ pipelines: [] }) }))
vi.mock('@/contexts/TenantVocabContext', () => ({
  useTenantVocab: () => ({ vocab: { deal: 'Negócio', deals: 'Negócios' } }),
}))
vi.mock('@/contexts/DealPanelContext', () => ({ useDealPanel: () => ({ openDeal: vi.fn() }) }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/hooks/useAddToPipeline', () => ({ useAddToPipeline: () => ({ requestAdd: vi.fn(), dialogs: null }) }))
vi.mock('@/services/api', () => ({ dealsApi: { conversationTarget: vi.fn(), get: vi.fn() } }))

const BASE: Conversation = {
  id: 'conv-1',
  tenantId: 't1',
  status: 'open',
  channel: 'whatsapp',
  lastMessageAt: '2026-09-03T10:00:00Z',
  lastMessagePreview: 'Oi',
  unreadCount: 0,
  contact: {
    id: 'c1', tenantId: 't1', waId: '5511999999999', displayName: 'Maria Silva', createdAt: '2026-01-01',
  },
  whatsappNumber: { id: 'wn1', displayPhoneNumber: '+55 11 90000-0000', status: 'active' },
} as Conversation

function baseProps(overrides: Partial<Conversation> = {}) {
  return {
    conversation: { ...BASE, ...overrides },
    allTags: [],
    allUsers: [],
    onStatusChange: vi.fn(),
    onToggleInfo: vi.fn(),
    infoOpen: false,
    onAddTag: vi.fn(),
    onRemoveTag: vi.fn(),
    onAssign: vi.fn(),
    onArchive: vi.fn(),
    onSetAiPause: vi.fn(),
    onInterveneAi: vi.fn(),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('ChatHeader — resolver é uma affordance só', () => {
  it('não existe botão "Resolver" ao lado do status — resolver mora no dropdown', () => {
    render(<ChatHeader {...baseProps()} />)
    expect(screen.queryByRole('button', { name: 'Resolver' })).not.toBeInTheDocument()
    expect(screen.queryByTitle('Resolver conversa')).not.toBeInTheDocument()
  })

  it('resolver pelo dropdown chama onStatusChange (multiPipeline off = sem popover de desfecho)', () => {
    const onStatusChange = vi.fn()
    render(<ChatHeader {...baseProps()} onStatusChange={onStatusChange} />)

    fireEvent.click(screen.getByTitle('Alterar status'))
    fireEvent.click(screen.getByText('Resolvidas'))
    expect(onStatusChange).toHaveBeenCalledWith('resolved', undefined)
  })

  it('ordem no DOM: o status vem ANTES do HandoffChip (o reorder do PR #102 fica)', () => {
    render(<ChatHeader {...baseProps()} />)
    const statusBtn = screen.getByTitle('Alterar status')
    const intervirBtn = screen.getByRole('button', { name: /Intervir agora/ })
    // DOCUMENT_POSITION_FOLLOWING = o nó de comparação (intervirBtn) vem
    // DEPOIS de statusBtn na árvore — é a checagem estrutural do reorder.
    // eslint-disable-next-line no-bitwise
    expect(statusBtn.compareDocumentPosition(intervirBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

// ─── O cabeçalho devolveu o contato ao painel (09/09) ───────────────────────
// Ele acumulava cinco categorias em quatro linhas: identidade, atributos do
// contato (etiquetas), estado do CRM (chips de funil·etapa), estado da IA e
// situação da conversa. O critério que ficou: o cabeçalho carrega o que muda a
// PRÓXIMA MENSAGEM; o painel carrega o que descreve o contato.
describe('ChatHeader — identidade e estado, nada de atributos', () => {
  it('não desenha as etiquetas do contato', () => {
    render(<ChatHeader {...baseProps({ tags: [{ id: 't1', name: 'VIP', color: '#f59e0b' }] })} />)
    expect(screen.queryByText('VIP')).not.toBeInTheDocument()
  })

  // O painel nasce fechado, então sumir com as etiquetas sem avisar seria
  // esconder. O marcador do botão diz que há algo lá dentro.
  it('o botão de Informações marca que há algo do contato para ver', () => {
    render(<ChatHeader {...baseProps({ tags: [{ id: 't1', name: 'VIP', color: '#f59e0b' }] })} />)
    const botao = screen.getByLabelText('Informações do contato')
    expect(botao.querySelector('span.rounded-full')).toBeTruthy()
  })

  it('sem etiquetas e sem atribuição, o botão fica limpo', () => {
    render(<ChatHeader {...baseProps({ tags: [] })} />)
    const botao = screen.getByLabelText('Informações do contato')
    expect(botao.querySelector('span.rounded-full')).toBeNull()
  })
})
