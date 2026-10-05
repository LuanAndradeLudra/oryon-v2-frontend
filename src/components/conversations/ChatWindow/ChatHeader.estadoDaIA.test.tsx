// 28/09 — cabeçalho com o estado REAL da IA, "Assumir" único e a tecla E
// pedindo o desfecho pelo mesmo fluxo do botão Resolver.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChatHeader } from './ChatHeader'
import { pedirResolver } from '@/lib/conversationActions'
import type { Conversation } from '@/types'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => false }))
vi.mock('@/contexts/CRMConfigContext', () => ({ useCRMConfig: () => ({ pipelines: [] }) }))
vi.mock('@/contexts/TenantVocabContext', () => ({ useTenantVocab: () => ({ vocab: { deal: 'Negócio', deals: 'Negócios' } }) }))
vi.mock('@/contexts/DealPanelContext', () => ({ useDealPanel: () => ({ openDeal: vi.fn() }) }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/hooks/useAddToPipeline', () => ({ useAddToPipeline: () => ({ requestAdd: vi.fn(), dialogs: null }) }))
vi.mock('@/services/api', () => ({ dealsApi: { conversationTarget: vi.fn(), get: vi.fn() } }))

let linhas = { linhasComIA: new Set(['linha-ia']) as ReadonlySet<string>, conhecidas: true }
vi.mock('@/hooks/useLinhasComIA', () => ({
  useLinhasDaIA: () => linhas,
  useLinhasComIA: () => linhas.linhasComIA,
}))

const conv = (over: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1', tenantId: 't1', status: 'open', channel: 'whatsapp', lastMessageAt: '2026-09-28T10:00:00Z',
  lastMessagePreview: 'Oi', unreadCount: 0,
  contact: { id: 'c1', tenantId: 't1', waId: '5511999999999', displayName: 'Maria Silva', createdAt: '2026-01-01' },
  whatsappNumber: { id: 'linha-ia', displayPhoneNumber: '+55', status: 'active' },
  ...over,
} as Conversation)

function props(c: Conversation) {
  return {
    conversation: c, allTags: [], allUsers: [], onStatusChange: vi.fn(), onToggleInfo: vi.fn(), infoOpen: false,
    onAddTag: vi.fn(), onRemoveTag: vi.fn(), onAssign: vi.fn(), onArchive: vi.fn(), onSetAiPause: vi.fn(),
    onInterveneAi: vi.fn(), onAssumir: vi.fn(),
  }
}

beforeEach(() => { linhas = { linhasComIA: new Set(['linha-ia']), conhecidas: true } })

describe('ChatHeader — estado da IA', () => {
  it('linha com IA, sem transferência: "IA atendendo" + Assumir', () => {
    render(<ChatHeader {...props(conv())} />)
    expect(screen.getByText('IA atendendo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assumir' })).toBeInTheDocument()
  })

  it('pendente numa linha com IA: "IA passou para a equipe" (antes: "Agente IA no controle")', () => {
    render(<ChatHeader {...props(conv({ status: 'pending' }))} />)
    expect(screen.getByText('IA passou para a equipe')).toBeInTheDocument()
    expect(screen.getByText('IA passou')).toBeInTheDocument()
    expect(screen.queryByText(/Agente IA no controle/)).toBeNull()
  })

  it('linha sem agente: "Linha sem IA" (antes: "Agente IA no controle")', () => {
    render(<ChatHeader {...props(conv({ whatsappNumber: { id: 'linha-sem', displayPhoneNumber: '+55', status: 'active' } as Conversation['whatsappNumber'] }))} />)
    expect(screen.getByText('Linha sem IA')).toBeInTheDocument()
  })

  it('linha sem agente e a conversa já é minha: nada a assumir', () => {
    render(<ChatHeader {...props(conv({
      whatsappNumber: { id: 'linha-sem', displayPhoneNumber: '+55', status: 'active' } as Conversation['whatsappNumber'],
      assignedUser: { id: 'u1', firstName: 'Ana', lastName: null },
    }))} />)
    expect(screen.queryByRole('button', { name: 'Assumir' })).toBeNull()
  })

  it('sem saber ainda as linhas, não afirma "sem IA"', () => {
    linhas = { linhasComIA: new Set(), conhecidas: false }
    render(<ChatHeader {...props(conv({ whatsappNumber: { id: 'qualquer', displayPhoneNumber: '+55', status: 'active' } as Conversation['whatsappNumber'] }))} />)
    expect(screen.queryByText('Linha sem IA')).toBeNull()
    expect(screen.getByText('IA atendendo')).toBeInTheDocument()
  })

  it('"Assumir" é a ação única da página (a mesma da tecla R)', () => {
    const p = props(conv({ status: 'pending' }))
    render(<ChatHeader {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'Assumir' }))
    expect(p.onAssumir).toHaveBeenCalled()
    expect(p.onInterveneAi).not.toHaveBeenCalled()
  })

  it('o pedido da tecla E abre o mesmo fluxo do botão Resolver (sem desfecho aqui, resolve)', async () => {
    const p = props(conv())
    render(<ChatHeader {...p} />)
    await act(async () => { pedirResolver('outra-conversa') })
    expect(p.onStatusChange).not.toHaveBeenCalled()
    await act(async () => { pedirResolver('conv-1') })
    expect(p.onStatusChange).toHaveBeenCalledWith('resolved', undefined)
  })
})
