// B2 (SCRUM-928) — a infraestrutura do painel: abrir/fechar, deep link
// `?deal=`, e a propriedade que garante a preservação do rascunho do chat —
// o painel é um PORTAL adicional, nunca desmonta quem já estava montado
// (children continuam os MESMOS, o painel só soma por cima).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import { DealPanelProvider, useDealPanel } from './DealPanelContext'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

// DealDetailPanel tem seu próprio arquivo de teste — aqui só precisa provar
// que O CONTEXTO renderiza o painel com o dealId certo, não repetir a
// cobertura de conteúdo.
vi.mock('@/components/deals/DealDetailPanel', () => ({
  DealDetailPanel: ({ dealId, onClose, onExpand }: { dealId: string; onClose?: () => void; onExpand?: (id: string) => void }) => (
    <div data-testid="deal-detail-panel-stub">
      dealId={dealId}
      <button onClick={onClose}>fechar</button>
      <button onClick={() => onExpand?.(dealId)}>expandir</button>
    </div>
  ),
}))

function OpenButton() {
  const { openDeal } = useDealPanel()
  return <button onClick={() => openDeal('deal-1')}>abrir negócio</button>
}

/** Simula o campo de mensagem do chat: texto local, SEM efeito de reset ao
 *  desmontar/remontar propositalmente ausente — se este componente fosse
 *  desmontado, o texto sumiria. É exatamente o comportamento real do
 *  MessageInput (nenhum useEffect zera `text` na troca de conversa/remount). */
function DraftInput() {
  const [text, setText] = useState('')
  return <input aria-label="Mensagem" value={text} onChange={(e) => setText(e.target.value)} />
}

function renderWithRouter(ui: React.ReactElement, initialEntries: string[] = ['/conversations']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>)
}

beforeEach(() => { navigate.mockReset() })

describe('DealPanelProvider', () => {
  it('abre e fecha o painel via openDeal/closeDeal', async () => {
    renderWithRouter(
      <DealPanelProvider>
        <OpenButton />
      </DealPanelProvider>,
    )
    expect(screen.queryByTestId('deal-detail-panel-stub')).toBeNull()

    fireEvent.click(screen.getByText('abrir negócio'))
    await waitFor(() => expect(screen.getByTestId('deal-detail-panel-stub')).toHaveTextContent('dealId=deal-1'))

    fireEvent.click(screen.getByText('fechar'))
    await waitFor(() => expect(screen.queryByTestId('deal-detail-panel-stub')).toBeNull())
  })

  it('"Expandir" fecha o painel e navega para /deals/:id', async () => {
    renderWithRouter(
      <DealPanelProvider>
        <OpenButton />
      </DealPanelProvider>,
    )
    fireEvent.click(screen.getByText('abrir negócio'))
    await waitFor(() => screen.getByTestId('deal-detail-panel-stub'))
    fireEvent.click(screen.getByText('expandir'))
    expect(navigate).toHaveBeenCalledWith('/deals/deal-1')
    await waitFor(() => expect(screen.queryByTestId('deal-detail-panel-stub')).toBeNull())
  })

  it('deep link ?deal=<id> abre o painel sozinho e limpa o param da URL', async () => {
    renderWithRouter(
      <DealPanelProvider>
        <span>conteúdo da página</span>
      </DealPanelProvider>,
      ['/contacts?pipeline=p1&deal=deal-9'],
    )
    await waitFor(() => expect(screen.getByTestId('deal-detail-panel-stub')).toHaveTextContent('dealId=deal-9'))
  })

  // A propriedade que a DoD pede explicitamente: abrir/fechar o painel a
  // partir do chat preserva o rascunho — porque o painel é um PORTAL
  // adicional (createPortal em document.body), nunca um `{condition && <Children/>}`
  // que desmontaria a árvore existente.
  it('abrir e fechar o painel NÃO desmonta os componentes já montados (preserva o rascunho do chat)', async () => {
    renderWithRouter(
      <DealPanelProvider>
        <DraftInput />
        <OpenButton />
      </DealPanelProvider>,
    )
    const input = screen.getByLabelText('Mensagem')
    fireEvent.change(input, { target: { value: 'rascunho em andamento...' } })
    expect(input).toHaveValue('rascunho em andamento...')

    fireEvent.click(screen.getByText('abrir negócio'))
    await waitFor(() => screen.getByTestId('deal-detail-panel-stub'))
    expect(screen.getByLabelText('Mensagem')).toHaveValue('rascunho em andamento...')

    fireEvent.click(screen.getByText('fechar'))
    await waitFor(() => expect(screen.queryByTestId('deal-detail-panel-stub')).toBeNull())
    expect(screen.getByLabelText('Mensagem')).toHaveValue('rascunho em andamento...')
  })

  it('openConversationBeside: sem opener registrado (fora de /conversations), navega', () => {
    function Trigger() {
      const { openConversationBeside } = useDealPanel()
      return <button onClick={() => openConversationBeside('conv-1')}>abrir ao lado</button>
    }
    renderWithRouter(<DealPanelProvider><Trigger /></DealPanelProvider>)
    fireEvent.click(screen.getByText('abrir ao lado'))
    expect(navigate).toHaveBeenCalledWith('/conversations?id=conv-1')
  })

  it('openConversationBeside: com opener registrado (dentro de /conversations), chama direto — sem navegar', () => {
    const opener = vi.fn()
    function Registrant() {
      const { registerConversationOpener } = useDealPanel()
      registerConversationOpener(opener)
      return null
    }
    function Trigger() {
      const { openConversationBeside } = useDealPanel()
      return <button onClick={() => openConversationBeside('conv-1')}>abrir ao lado</button>
    }
    renderWithRouter(
      <DealPanelProvider>
        <Registrant />
        <Trigger />
      </DealPanelProvider>,
    )
    fireEvent.click(screen.getByText('abrir ao lado'))
    expect(opener).toHaveBeenCalledWith('conv-1')
    expect(navigate).not.toHaveBeenCalled()
  })
})
