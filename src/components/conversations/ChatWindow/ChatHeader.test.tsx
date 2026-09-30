// Rodada 2 (SCRUM-1097): o mock 1d tem controle → Assumir → Resolver → ···; o
// botão "Resolver" voltou (o dropdown de status foi pro menu ···).
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

describe('ChatHeader — controle · Assumir · Resolver · ··· (mock 1d, R2-1D-HDR)', () => {
  it('com a IA no controle mostra "Assumir" e "Resolver" como botões', () => {
    render(<ChatHeader {...baseProps()} />)
    expect(screen.getByRole('button', { name: 'Assumir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resolver' })).toBeInTheDocument()
  })

  it('"Assumir" chama a intervenção do servidor', () => {
    const props = baseProps()
    render(<ChatHeader {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Assumir' }))
    expect(props.onInterveneAi).toHaveBeenCalled()
  })

  it('"Resolver" chama onStatusChange (multiPipeline off = sem popover de desfecho)', () => {
    const onStatusChange = vi.fn()
    render(<ChatHeader {...baseProps()} onStatusChange={onStatusChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    expect(onStatusChange).toHaveBeenCalledWith('resolved', undefined)
  })

  it('status e arquivar continuam acessíveis no menu ···', () => {
    const onStatusChange = vi.fn()
    render(<ChatHeader {...baseProps()} onStatusChange={onStatusChange} />)
    fireEvent.click(screen.getByLabelText('Mais ações'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pendentes' }))
    expect(onStatusChange).toHaveBeenCalledWith('pending')
    fireEvent.click(screen.getByLabelText('Mais ações'))
    expect(screen.getByRole('menuitem', { name: /Arquivar conversa/ })).toBeInTheDocument()
  })

  it('ordem no DOM: o controle (Assumir) vem ANTES de Resolver', () => {
    render(<ChatHeader {...baseProps()} />)
    const assumir = screen.getByRole('button', { name: 'Assumir' })
    const resolver = screen.getByRole('button', { name: 'Resolver' })
    // eslint-disable-next-line no-bitwise
    expect(assumir.compareDocumentPosition(resolver) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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
