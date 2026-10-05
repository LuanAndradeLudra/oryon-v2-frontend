// T4 fase 1 — eventos entre as mensagens; a rotina só aparece com "Mostrar eventos".
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageList } from './MessageList'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import { MediaViewerProvider } from '@/components/ui/MediaViewer'
import type { Message } from '@/types'
import type { EventoDaConversa } from '@/lib/eventosDaConversa'

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn() })

const m = (id: string, sentAt: string): Message => ({
  id, conversationId: 'c1', direction: 'inbound', type: 'text', status: 'delivered', body: id, sentAt, createdAt: sentAt,
})
const ev = (id: string, at: string, rotina: boolean, texto: string): EventoDaConversa =>
  ({ id, at, tipo: rotina ? 'crm_ia' : 'ia_para_equipe', ator: 'IA', texto, rotina })

function montar(mostrar: boolean, onAlternar = vi.fn()) {
  render(
    <ContextMenuProvider>
      <MediaViewerProvider>
        <MessageList
          messages={[m('primeira', '2026-01-01T10:00:00Z'), m('segunda', '2026-01-01T10:10:00Z')]}
          loading={false} hasMore={false} onLoadMore={() => {}} contact={{ displayName: 'Cliente' }}
          eventos={[ev('e1', '2026-01-01T10:05:00Z', false, 'passou a conversa para a equipe'), ev('e2', '2026-01-01T10:06:00Z', true, 'moveu o negócio')]}
          mostrarEventos={mostrar} onAlternarEventos={onAlternar}
        />
      </MediaViewerProvider>
    </ContextMenuProvider>,
  )
  return onAlternar
}

describe('MessageList com eventos', () => {
  it('handoff sempre visível, na ordem certa; rotina escondida atrás do botão', () => {
    const alternar = montar(false)
    const handoff = screen.getByText('passou a conversa para a equipe')
    const segunda = screen.getByText('segunda')
    expect(handoff.compareDocumentPosition(segunda) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('moveu o negócio')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar eventos (1)' }))
    expect(alternar).toHaveBeenCalled()
  })

  it('com eventos=1 a rotina aparece', () => {
    montar(true)
    expect(screen.getByText('moveu o negócio')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ocultar eventos' })).toBeTruthy()
  })
})
