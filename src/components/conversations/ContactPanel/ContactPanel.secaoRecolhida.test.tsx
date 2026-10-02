// Revisão 02/10: com "Dados" ou "Etiquetas" recolhidos, os botões do cabeçalho
// da seção (Atribuir, Transferir, Editar) não abriam nada — o modal morava nos
// filhos da seção, que recolhida não monta.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/contexts/CRMConfigContext', () => ({ useCRMConfig: () => ({ stages: [], pipelines: [] }) }))
vi.mock('@/hooks/useAddToPipeline', () => ({ useAddToPipeline: () => ({ requestAdd: vi.fn() }) }))
vi.mock('@/hooks/useLinhasComIA', () => ({ useLinhasDaIA: () => ({ conhecidas: false, ids: new Set() }) }))
vi.mock('@/components/conversations/ConversionAnalysisPanel', () => ({ ConversionAnalysisPanel: () => null }))
vi.mock('./ConversationActivitySection', () => ({ ConversationActivitySection: () => null }))
vi.mock('./ContactPanelDeals', () => ({ ContactPanelDeals: () => null }))

import { ContactPanel } from './ContactPanel'
import type { Conversation } from '@/types'

const conversa = {
  id: 'conv1', status: 'open', createdAt: '2026-10-01T10:00:00Z', lastMessageAt: '2026-10-02T10:00:00Z', tags: [],
  contact: { id: 'c1', displayName: 'Marina', waId: '5547900000201', tags: [] },
  assignedUser: { id: 'u1', firstName: 'Ana', lastName: 'Lima', role: 'agent' },
} as unknown as Conversation

const renderizar = () => render(
  <ContactPanel conversation={conversa} allTags={[]} allUsers={[]} onClose={vi.fn()} onAddTag={vi.fn()} onRemoveTag={vi.fn()}
    onAssign={vi.fn()} onTransfer={vi.fn()} onArchive={vi.fn()} />,
)

beforeEach(() => {
  localStorage.setItem('collapsible:conv-panel.info', '0')
  localStorage.setItem('collapsible:conv-panel.tags', '0')
})

describe('ContactPanel · seções recolhidas', () => {
  it('Trocar e Transferir abrem o modal mesmo com "Dados" recolhido', () => {
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }))
    expect(screen.getByText('Atribuir usuário')).toBeInTheDocument()
  })

  it('Transferir abre com "Dados" recolhido', () => {
    renderizar()
    fireEvent.click(screen.getByTitle('Transferir conversa'))
    expect(screen.getByText('Transferir conversa', { selector: 'h2, h3, [role="dialog"] *' })).toBeInTheDocument()
  })

  it('Editar etiquetas abre com "Etiquetas" recolhido', () => {
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByText('Gerenciar etiquetas')).toBeInTheDocument()
  })
})
