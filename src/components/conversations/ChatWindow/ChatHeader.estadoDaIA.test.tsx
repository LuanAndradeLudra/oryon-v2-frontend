// 28/09 — cabeçalho com o estado REAL da IA, "Assumir" único e a tecla E
// pedindo o desfecho pelo mesmo fluxo do botão Resolver.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChatHeader } from './ChatHeader'
import { pedirResolver } from '@/lib/conversationActions'
import type { Conversation } from '@/types'

let celular = false
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => celular }))
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

beforeEach(() => { linhas = { linhasComIA: new Set(['linha-ia']), conhecidas: true }; celular = false })

describe('ChatHeader — estado da IA', () => {
  // SCRUM-1253: "Assumir" mora no menu do responsável (cabeçalho nomeado).
  const abrirResponsavel = () => fireEvent.click(screen.getByTitle('Responsável e agente de IA'))

  it('linha com IA, sem transferência: "IA atendendo" + Assumir no menu', () => {
    render(<ChatHeader {...props(conv())} />)
    expect(screen.getByText('IA atendendo')).toBeInTheDocument()
    abrirResponsavel()
    expect(screen.getByRole('menuitem', { name: /Assumir/ })).toBeInTheDocument()
  })

  it('pendente numa linha com IA, sem dono: status "Pendente" no botão e "Na fila" no controle (D11)', () => {
    render(<ChatHeader {...props(conv({ status: 'pending' }))} />)
    // SCRUM-1253: o status aparece no botão dividido; o estado, no controle.
    expect(screen.getByLabelText('Status da conversa: Pendente')).toBeInTheDocument()
    // Revisão 11/10: a IA já passou — "IA atendendo" ali era mentira.
    expect(screen.queryByText('IA atendendo')).toBeNull()
    expect(screen.getByText('Na fila')).toBeInTheDocument()
    expect(screen.queryByText(/Agente IA no controle/)).toBeNull()
  })

  it('revisão 11/10: pendente COM dono não diz "Na fila" — diz para quem espera', () => {
    render(<ChatHeader {...props(conv({ status: 'pending', assignedUser: { id: 'u2', firstName: 'Beto', lastName: null } }))} />)
    expect(screen.queryByText('Na fila')).toBeNull()
    expect(screen.getByText('Aguardando Beto')).toBeInTheDocument()
  })

  it('revisão 11/10 (celular): o chip do estado segue a mesma regra dos selos da lista', () => {
    celular = true
    const { unmount } = render(<ChatHeader {...props(conv({ status: 'pending' }))} />)
    expect(screen.getByText('Na fila')).toBeInTheDocument()
    unmount()
    render(<ChatHeader {...props(conv({ status: 'pending', assignedUser: { id: 'u1', firstName: 'Ana', lastName: null } }))} />)
    expect(screen.queryByText('Na fila')).toBeNull()
    expect(screen.getByText('Aguardando você')).toBeInTheDocument()
  })

  it('revisão 11/10: com dono, escolher outra pessoa TRANSFERE; sem dono, atribui (igual ao painel)', () => {
    const ana = { id: 'u3', firstName: 'Carla', lastName: 'Dias', isActive: true }
    const comDono = { ...props(conv({ assignedUser: { id: 'u2', firstName: 'Beto', lastName: null } })), allUsers: [ana], onTransfer: vi.fn() }
    const { unmount } = render(<ChatHeader {...(comDono as unknown as Parameters<typeof ChatHeader>[0])} />)
    abrirResponsavel()
    fireEvent.click(screen.getByRole('menuitem', { name: /Carla Dias/ }))
    expect(comDono.onTransfer).toHaveBeenCalledWith(expect.objectContaining({ id: 'u3' }))
    expect(comDono.onAssign).not.toHaveBeenCalled()
    unmount()
    const semDono = { ...props(conv()), allUsers: [ana], onTransfer: vi.fn() }
    render(<ChatHeader {...(semDono as unknown as Parameters<typeof ChatHeader>[0])} />)
    abrirResponsavel()
    fireEvent.click(screen.getByRole('menuitem', { name: /Carla Dias/ }))
    expect(semDono.onAssign).toHaveBeenCalledWith(expect.objectContaining({ id: 'u3' }))
    expect(semDono.onTransfer).not.toHaveBeenCalled()
  })

  it('revisão 11/10: com muitas pessoas, mostra todas e oferece busca (antes cortava em 6)', () => {
    const nomes = ['Ana', 'Beto', 'Carla', 'Davi', 'Eva', 'Fábio', 'Gil', 'Hugo', 'Iara']
    const users = nomes.map((n, i) => ({ id: `p${i}`, firstName: n, lastName: 'Teste', isActive: true }))
    render(<ChatHeader {...({ ...props(conv()), allUsers: users } as unknown as Parameters<typeof ChatHeader>[0])} />)
    abrirResponsavel()
    expect(screen.getByRole('menuitem', { name: /Iara Teste/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Buscar pessoa para atribuir'), { target: { value: 'hu' } })
    expect(screen.getByRole('menuitem', { name: /Hugo Teste/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Iara Teste/ })).toBeNull()
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
    abrirResponsavel()
    expect(screen.queryByRole('menuitem', { name: /Atribuir a mim|Assumir/ })).toBeNull()
  })

  it('conversa já é minha e a IA atende: o menu oferece PAUSAR a IA', () => {
    const p = props(conv({ assignedUser: { id: 'u1', firstName: 'Ana', lastName: null } }))
    render(<ChatHeader {...p} />)
    abrirResponsavel()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pausar a IA por 1 hora' }))
    expect(p.onSetAiPause).toHaveBeenCalledWith(expect.any(String))
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
    abrirResponsavel()
    fireEvent.click(screen.getByRole('menuitem', { name: /Assumir/ }))
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
