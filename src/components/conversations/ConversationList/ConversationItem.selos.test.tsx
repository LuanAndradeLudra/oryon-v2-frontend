// Revisão 11/10 — o chip "IA" só aparece quando a IA está respondendo de fato;
// conversa que a IA já passou para a equipe mostra o selo D11 ("Na fila" /
// "Aguardando <nome>"), sem "IA respondendo" ao lado.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConversationItem } from './ConversationItem'
import type { Conversation } from '@/types'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/hooks/useLinhasComIA', () => ({
  useLinhasDaIA: () => ({ linhasComIA: new Set(['linha-ia']), conhecidas: true }),
}))
vi.mock('@/hooks/useContextMenu', () => ({ useContextMenu: () => ({ onContextMenu: vi.fn(), menu: null }) }))

const conv = (over: Partial<Conversation> = {}): Conversation => ({
  id: 'c1', tenantId: 't1', status: 'open', channel: 'whatsapp', lastMessageAt: '2026-10-11T10:00:00Z',
  lastMessagePreview: 'Oi', unreadCount: 0,
  contact: { id: 'k1', tenantId: 't1', waId: '5511999999999', displayName: 'Maria', createdAt: '2026-01-01' },
  whatsappNumber: { id: 'linha-ia', displayPhoneNumber: '+55', status: 'active' },
  ...over,
} as Conversation)

describe('ConversationItem — selos (revisão 11/10)', () => {
  it('IA atendendo (aberta, sem pausa): mostra o chip "IA"', () => {
    render(<ConversationItem conversation={conv()} isActive={false} onSelect={vi.fn()} />)
    expect(screen.getByTitle('IA respondendo nesta conversa')).toBeInTheDocument()
  })

  it('pendente (a IA passou) sem dono: "Na fila" e nada de "IA respondendo"', () => {
    render(<ConversationItem conversation={conv({ status: 'pending' })} isActive={false} onSelect={vi.fn()} />)
    expect(screen.getByText('Na fila')).toBeInTheDocument()
    expect(screen.queryByTitle('IA respondendo nesta conversa')).toBeNull()
  })

  it('pendente com dono: "Aguardando <nome>" e nada de "IA respondendo"', () => {
    render(<ConversationItem conversation={conv({ status: 'pending', assignedUser: { id: 'u2', firstName: 'Beto', lastName: null } })} isActive={false} onSelect={vi.fn()} />)
    // Auditoria 12/10: o selo tem duas partes — "Aguardando " fixo e o nome, que encurta.
    expect(screen.getByText('Beto').parentElement?.textContent).toBe('Aguardando Beto')
    expect(screen.queryByText('Na fila')).toBeNull()
    expect(screen.queryByTitle('IA respondendo nesta conversa')).toBeNull()
  })

  // Auditoria 12/10 — selos que se sobrepunham ("Aguardando você" + verificação + espera).
  it('verificação pendente é só o ícone: frase no tooltip e no leitor de tela, sem texto visível', () => {
    const { container } = render(<ConversationItem conversation={conv({ hasRecentAnomaly: true })} isActive={false} onSelect={vi.fn()} />)
    const selo = screen.getByText('Verificação pendente')
    expect(selo).toHaveClass('sr-only')
    expect(container.querySelector('.text-danger')).toBeTruthy()
  })

  it('o grupo da esquerda corta em vez de vazar por baixo do da direita', () => {
    render(<ConversationItem conversation={conv({ status: 'pending', assignedUser: { id: 'u2', firstName: 'Maximilianoo', lastName: null } })} isActive={false} onSelect={vi.fn()} />)
    const grupo = screen.getByText('Maximilianoo').closest('.overflow-hidden')
    expect(grupo).toBeTruthy()
    expect(screen.getByText('Maximilianoo')).toHaveClass('truncate')
  })

  it('mais de 2 etiquetas mostram "+N"', () => {
    const tags = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, color: '#000' }))
    render(<ConversationItem conversation={conv({ tags } as Partial<Conversation>)} isActive={false} onSelect={vi.fn()} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('fora do filtro: selo compacto (só o olho), frase para o leitor de tela', () => {
    render(<ConversationItem conversation={conv()} isActive offFilter onSelect={vi.fn()} />)
    expect(screen.getByText('Fora deste filtro')).toHaveClass('sr-only')
  })

  it('C2: com lastMessageType "text", "📍 Rua X" do cliente fica como texto', () => {
    render(<ConversationItem conversation={conv({ lastMessagePreview: '📍 Rua X, 10', lastMessageType: 'text', lastMessageSenderKind: 'client' })} isActive={false} onSelect={vi.fn()} />)
    expect(screen.getByText('📍 Rua X, 10')).toBeInTheDocument()
  })
})
