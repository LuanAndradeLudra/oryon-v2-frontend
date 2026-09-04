// Achado do relatório consolidado (Conversas é a tela mais usada do
// produto): a ação mais forte visualmente era o chip âmbar "Intervir" —
// "Resolver" ficava só como o 3º item de um dropdown, sem 1-clique. Cobre
// o botão "Resolver" novo (1-clique, mesmo handler do dropdown) e a ordem
// dos elementos no grupo de ações (Resolver/status antes do HandoffChip).
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

describe('ChatHeader — Resolver em destaque (achado do relatório)', () => {
  it('conversa aberta: botão "Resolver" aparece e chama onStatusChange direto (multiPipeline off = sem popover)', () => {
    const onStatusChange = vi.fn()
    render(<ChatHeader {...baseProps()} onStatusChange={onStatusChange} />)

    const resolveBtn = screen.getByRole('button', { name: 'Resolver' })
    expect(resolveBtn).toBeInTheDocument()
    fireEvent.click(resolveBtn)
    expect(onStatusChange).toHaveBeenCalledWith('resolved', undefined)
  })

  it('conversa já resolvida: botão "Resolver" some — nada a resolver', () => {
    render(<ChatHeader {...baseProps({ status: 'resolved' })} />)
    expect(screen.queryByRole('button', { name: 'Resolver' })).not.toBeInTheDocument()
  })

  it('ordem no DOM: Resolver e o status vêm ANTES do HandoffChip (Intervir deixou de ser a 1ª coisa do grupo)', () => {
    render(<ChatHeader {...baseProps()} />)
    const resolveBtn = screen.getByRole('button', { name: 'Resolver' })
    const intervirBtn = screen.getByRole('button', { name: /Intervir agora/ })
    // DOCUMENT_POSITION_FOLLOWING = o nó de comparação (intervirBtn) vem
    // DEPOIS de resolveBtn na árvore — é a checagem estrutural do reorder.
    // eslint-disable-next-line no-bitwise
    expect(resolveBtn.compareDocumentPosition(intervirBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('dropdown de status ainda tem "Resolvidas" como opção (caminho antigo continua existindo)', () => {
    render(<ChatHeader {...baseProps()} />)
    fireEvent.click(screen.getByTitle('Alterar status'))
    expect(screen.getByText('Resolvidas')).toBeInTheDocument()
  })
})
