// SCRUM-1381 — a bolha no épico de suporte: menu "Reportar…" com rótulo pela
// ORIGEM da mensagem, caixa de seleção de verdade enquanto marca (a linha
// inteira também marca, sem contar duas vezes) e a bandeira de "reportada" na
// linha da hora, que leva ao chamado. Sem a flag, nada disso aparece.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MessageList } from './MessageList'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import { MediaViewerProvider } from '@/components/ui/MediaViewer'
import { SupportReportProvider } from '@/components/support/SupportReportContext'
import { supportApi } from '@/services/supportApi'
import type { Message } from '@/types'

const h = vi.hoisted(() => ({ flags: ['FF_SUPPORT_TICKETS'] as string[], navigate: vi.fn() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ featureFlags: h.flags }) }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('react-router-dom', async (original) => ({ ...(await original<typeof import('react-router-dom')>()), useNavigate: () => h.navigate }))
vi.mock('@/services/supportApi', () => ({ supportApi: { listar: vi.fn() } }))

const base: Message = {
  id: 'm1', conversationId: 'conv-1', direction: 'inbound', type: 'text', status: 'delivered', senderKind: 'client',
  body: 'Qual o valor da consulta?', sentAt: '2026-10-15T10:00:00Z', createdAt: '2026-10-15T10:00:00Z',
}
const daIA: Message = { ...base, id: 'm2', direction: 'outbound', senderKind: 'ai', body: 'A consulta custa R$ 50', sentAt: '2026-10-15T10:01:00Z' }
const MENSAGENS = [base, daIA]

function Tela() {
  return (
    <MemoryRouter>
      <ContextMenuProvider>
        <MediaViewerProvider>
          <SupportReportProvider conversationId="conv-1" contatoNome="Maria">
            <MessageList messages={MENSAGENS} loading={false} hasMore={false} onLoadMore={() => {}} contact={{ displayName: 'Maria' }} />
          </SupportReportProvider>
        </MediaViewerProvider>
      </ContextMenuProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  h.flags = ['FF_SUPPORT_TICKETS']
  Element.prototype.scrollIntoView = vi.fn()
  vi.mocked(supportApi.listar).mockResolvedValue({
    itens: [{
      id: 't1', numero: 'SUP-0001', origemDoProblema: 'ia', origemNome: null, tipoDePedido: null, categoria: 'wrong_info', assunto: null,
      ondeAconteceu: null, status: 'received', prioridade: null, perguntaPendente: null, avaliacao: null, conversationId: 'conv-1',
      contatoNome: 'Maria', abertoPor: 'Ana', abertoEm: '2026-10-15T10:05:00Z', atualizadoEm: '2026-10-15T10:05:00Z', mensagensMarcadas: ['m2'],
    }],
    proximoCursor: null,
  })
})

describe('MessageBubble — chamado de suporte (SCRUM-1381)', () => {
  it('o menu da mensagem reporta pelo nome da ORIGEM (IA × contato)', async () => {
    render(<Tela />)
    fireEvent.contextMenu(screen.getByText('A consulta custa R$ 50'))
    expect(await screen.findByRole('menuitem', { name: 'Reportar resposta da IA' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.contextMenu(screen.getByText('Qual o valor da consulta?'))
    expect(await screen.findByRole('menuitem', { name: 'Reportar problema com esta mensagem' })).toBeInTheDocument()
  })

  it('reportar liga a marcação: caixa de verdade em cada bolha; a linha marca e a caixa não conta duas vezes', async () => {
    render(<Tela />)
    fireEvent.contextMenu(screen.getByText('A consulta custa R$ 50'))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Reportar resposta da IA' }))
    const daIa = screen.getByRole('checkbox', { name: /Incluir no chamado: Resposta da IA/ })
    const doContato = screen.getByRole('checkbox', { name: /Incluir no chamado: Mensagem do contato/ })
    expect(daIa).toBeChecked()
    expect(doContato).not.toBeChecked()
    // Clique na bolha (a linha inteira marca)…
    fireEvent.click(screen.getByText('Qual o valor da consulta?'))
    expect(doContato).toBeChecked()
    // …e na própria caixa: desmarca uma vez só.
    fireEvent.click(doContato)
    expect(doContato).not.toBeChecked()
    // Marcando, o menu da mensagem não oferece "Reportar" de novo…
    fireEvent.contextMenu(screen.getByText('A consulta custa R$ 50'))
    expect(screen.queryByRole('menuitem', { name: /Reportar/ })).toBeNull()
    // …e a bandeira não navega (Enter nela levaria para a página Suporte e perderia o relato).
    expect(await screen.findByRole('button', { name: /Reportada no chamado SUP-0001/ })).toBeDisabled()
  })

  it('mensagem reportada mostra a bandeira na linha da hora, que leva ao chamado', async () => {
    render(<Tela />)
    fireEvent.click(await screen.findByRole('button', { name: 'Reportada no chamado SUP-0001. Ver andamento' }))
    expect(h.navigate).toHaveBeenCalledWith('/support?chamado=t1')
    expect(screen.getAllByRole('button', { name: /Reportada no chamado/ })).toHaveLength(1)
  })

  it('sem a flag do tenant: sem item no menu, sem bandeira, sem busca', async () => {
    h.flags = []
    render(<Tela />)
    fireEvent.contextMenu(screen.getByText('A consulta custa R$ 50'))
    expect(await screen.findByRole('menuitem', { name: 'Copiar mensagem' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Reportar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Reportada no chamado/ })).toBeNull()
    expect(supportApi.listar).not.toHaveBeenCalled()
  })
})
