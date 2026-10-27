// SCRUM-1383 — página Suporte da empresa. Critérios do card: rascunho de um
// chamado não aparece em outro; "Isso resolveu?" (sim encerra; não reabre);
// abas por de quem é a vez (o backend filtra e conta); agent não vê
// prioridade (o backend manda null; a tela só mostra o que vier).
// Revisão do Portão 2: a atualização não troca de aba nem de chamado; Ctrl+Enter
// repetido não duplica; a busca não vai para a URL.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { LayerProvider } from '@/contexts/LayerContext'
import { supportApi } from '@/services/supportApi'
import type { ChamadoDaEmpresa, ResumoDoChamado } from '@/types/support'
import { SupportPage } from './SupportPage'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }))
vi.mock('@/services/supportApi', () => ({
  supportApi: {
    resumo: vi.fn(), listar: vi.fn(), obter: vi.fn(), comentar: vi.fn(), avaliar: vi.fn(), reabrir: vi.fn(), baixarAnexo: vi.fn(),
    modelo: vi.fn(async () => ({ assuntos: {}, exemplos: {}, esperado: {}, camposDaEmpresa: [] })), parecidos: vi.fn(async () => []),
  },
}))
vi.mock('@/hooks/useToast', async (original) => ({ ...(await original<typeof import('@/hooks/useToast')>()), showToast: vi.fn() }))
// O papel decide o atalho da Qualidade (SCRUM-1391): só a gestão.
let papel = 'agent'
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: papel } }) }))

const api = vi.mocked(supportApi)

function item(id: string, numero: string, status: ResumoDoChamado['status'], extra: Partial<ResumoDoChamado> = {}): ResumoDoChamado {
  return {
    id, numero, origemDoProblema: 'ia', origemNome: null, tipoDePedido: null, categoria: 'wrong_info', assunto: null, ondeAconteceu: null,
    status, prioridade: null, perguntaPendente: null, avaliacao: null, conversationId: 'c1', contatoNome: 'Maria', abertoPor: 'Ana',
    abertoEm: '2026-10-15T10:00:00Z', atualizadoEm: '2026-10-15T10:00:00Z', ...extra,
  }
}
function completo(r: ResumoDoChamado, extra: Partial<ChamadoDaEmpresa> = {}): ChamadoDaEmpresa {
  return {
    ...r, origem: 'empresa', entrada: 'conversa', descricao: 'A IA informou o valor errado.', complemento: null, oQueSeriaCerto: null,
    camposExtras: [], fatos: { contatoViu: 'nao_viu' }, conversasAfetadas: [], dadosDeTerceiros: false, desdeQuando: null, impacto: null,
    alcance: 'esta_conversa', resumoParaClinica: null, dependeDaClinica: null, contextoTecnico: null, mensagens: [], anexos: [],
    eventos: [{ id: 'e1', tipo: 'aberto', texto: 'Chamado aberto', corpo: null, autor: 'Ana', autorTipo: 'usuario', em: r.abertoEm }],
    ...extra,
  }
}

const PERGUNTOU = item('t1', 'SUP-0001', 'awaiting_client', { perguntaPendente: 'Em que horário?' })
const RESOLVIDO = item('t2', 'SUP-0002', 'resolved')

/** A lista (o detalhe repete número e selo do chamado aberto). */
const lista = () => screen.getByRole('complementary', { name: 'Chamados' })

/** Mostra o endereço atual (a busca não pode ir para ele). */
function Endereco() {
  const { pathname, search } = useLocation()
  return <output data-testid="endereco">{pathname}{search}</output>
}

function Tela({ rota = '/support' }: { rota?: string }) {
  return (
    <MemoryRouter initialEntries={[rota]}>
      <LayerProvider><SupportPage /><Endereco /></LayerProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  papel = 'agent'
  api.resumo.mockResolvedValue({ empresa: 2, oryon: 5, encerrados: 9 })
  api.listar.mockResolvedValue({ itens: [PERGUNTOU, RESOLVIDO], proximoCursor: null })
  api.obter.mockImplementation(async (id: string) => (id === 't1'
    ? completo(PERGUNTOU)
    : completo(RESOLVIDO, { resumoParaClinica: 'Corrigimos o cadastro do agente.' })))
})

describe('Página Suporte (SCRUM-1383)', () => {
  it('abre na aba de quem tem algo a fazer, com as contagens do backend; a lista vem filtrada por "vez"', async () => {
    render(<Tela />)
    expect(await screen.findByRole('tab', { name: /Com vocês\s*2/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('2 precisam de vocês')).toBeInTheDocument()
    await waitFor(() => expect(api.listar).toHaveBeenCalledWith({ vez: 'empresa', busca: undefined, limite: 30 }))
    expect(await within(lista()).findByText('A Oryon perguntou')).toBeInTheDocument()
    expect(within(lista()).getByText('Confirme a solução')).toBeInTheDocument()
  })

  it('sem nada para a empresa, abre em "Com a Oryon"', async () => {
    api.resumo.mockResolvedValue({ empresa: 0, oryon: 3, encerrados: 1 })
    render(<Tela />)
    await waitFor(() => expect(api.listar).toHaveBeenCalledWith({ vez: 'oryon', busca: undefined, limite: 30 }))
    expect(screen.getByRole('tab', { name: /Com a Oryon/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('o rascunho de um chamado não aparece em outro — e continua lá ao voltar', async () => {
    render(<Tela rota="/support?chamado=t1" />)
    const campo = await screen.findByLabelText('Resposta à pergunta da Oryon')
    fireEvent.change(campo, { target: { value: 'Foi às 18h15.' } })
    fireEvent.click(await within(lista()).findByText('SUP-0002'))
    expect(await screen.findByText('A Oryon resolveu este chamado')).toBeInTheDocument()
    expect(screen.getByLabelText('Mensagem para a equipe Oryon')).toHaveValue('')
    fireEvent.click(within(lista()).getByText('SUP-0001'))
    expect(await screen.findByLabelText('Resposta à pergunta da Oryon')).toHaveValue('Foi às 18h15.')
  })

  it('responder à pergunta da Oryon envia o comentário e limpa o rascunho', async () => {
    api.comentar.mockResolvedValue(completo({ ...PERGUNTOU, status: 'triaged', perguntaPendente: null }))
    render(<Tela rota="/support?chamado=t1" />)
    fireEvent.change(await screen.findByLabelText('Resposta à pergunta da Oryon'), { target: { value: 'Foi às 18h15.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }))
    await waitFor(() => expect(api.comentar).toHaveBeenCalledWith('t1', 'Foi às 18h15.'))
    expect(await screen.findByLabelText('Mensagem para a equipe Oryon')).toHaveValue('')
  })

  it('"Isso resolveu?": sim encerra; não reabre — e resolvido ainda aceita comentário (o backend aceita)', async () => {
    api.avaliar.mockImplementation(async (_id: string, resolveu: boolean) => completo({ ...RESOLVIDO, status: resolveu ? 'closed' : 'triaged' }))
    render(<Tela rota="/support?chamado=t2" />)
    const card = (await screen.findByText('A Oryon resolveu este chamado')).closest('[role="status"]') as HTMLElement
    expect(screen.getByLabelText('Mensagem para a equipe Oryon')).toBeEnabled()
    fireEvent.click(within(card).getByRole('button', { name: 'Não, continua' }))
    // Reavaliação de UX de 27/10: antes de reabrir, o que ainda não está certo (mínimo 5 letras).
    const reabrir = within(card).getByRole('button', { name: 'Reabrir o chamado' })
    expect(reabrir).toBeDisabled()
    fireEvent.change(within(card).getByLabelText('O que ainda não está certo?'), { target: { value: 'A IA ainda erra o preço.' } })
    fireEvent.click(reabrir)
    await waitFor(() => expect(api.avaliar).toHaveBeenCalledWith('t2', false, 'A IA ainda erra o preço.'))
    await waitFor(() => expect(screen.queryByText('A Oryon resolveu este chamado')).toBeNull())
    expect(api.resumo).toHaveBeenCalledTimes(2) // as abas recontam
  })

  it('a atualização periódica não troca de aba nem de chamado sozinha (revisão do Portão 2)', async () => {
    const A = item('ta', 'SUP-0010', 'triaged')
    const B = item('tb', 'SUP-0011', 'investigating')
    api.resumo.mockResolvedValue({ empresa: 0, oryon: 2, encerrados: 0 })
    api.listar.mockResolvedValue({ itens: [A, B], proximoCursor: null })
    api.obter.mockImplementation(async (id: string) => completo(id === 'ta' ? A : B))
    render(<Tela />)
    expect(await screen.findByRole('region', { name: 'Chamado SUP-0010' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Com a Oryon/ })).toHaveAttribute('aria-selected', 'true')
    // A Oryon perguntou no outro: o resumo muda e a lista reordena.
    api.resumo.mockResolvedValue({ empresa: 1, oryon: 1, encerrados: 0 })
    api.listar.mockResolvedValue({ itens: [B, A], proximoCursor: null })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await waitFor(() => expect(api.listar).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(within(lista()).getAllByRole('button')[0]).toHaveTextContent('SUP-0011'))
    expect(screen.getByRole('tab', { name: /Com a Oryon/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'Chamado SUP-0010' })).toBeInTheDocument()
  })

  it('Ctrl+Enter repetido manda o comentário uma vez só (revisão do Portão 2)', async () => {
    let responder: (c: ChamadoDaEmpresa) => void = () => {}
    api.comentar.mockImplementation(() => new Promise<ChamadoDaEmpresa>((r) => { responder = r }))
    render(<Tela rota="/support?chamado=t1" />)
    const campo = await screen.findByLabelText('Resposta à pergunta da Oryon')
    fireEvent.change(campo, { target: { value: 'Foi às 18h15.' } })
    fireEvent.keyDown(campo, { key: 'Enter', ctrlKey: true })
    fireEvent.keyDown(campo, { key: 'Enter', ctrlKey: true })
    fireEvent.keyDown(campo, { key: 'Enter', ctrlKey: true })
    expect(api.comentar).toHaveBeenCalledTimes(1)
    await act(async () => { responder(completo({ ...PERGUNTOU, status: 'triaged', perguntaPendente: null })) })
  })

  it('a busca filtra a lista sem ir para o endereço (nome e telefone de contato)', async () => {
    render(<Tela />)
    await within(lista()).findByText('SUP-0001')
    fireEvent.change(screen.getByPlaceholderText('Buscar por número, contato ou texto'), { target: { value: 'Maria 21998765432' } })
    await waitFor(() => expect(api.listar).toHaveBeenCalledWith(expect.objectContaining({ busca: 'Maria 21998765432' })))
    expect(screen.getByTestId('endereco').textContent).not.toMatch(/Maria|2199/)
  })

  it('encerrado: o campo fica fechado e aparece "Reabrir"', async () => {
    api.obter.mockResolvedValue(completo({ ...RESOLVIDO, status: 'closed' }))
    api.reabrir.mockResolvedValue(completo({ ...RESOLVIDO, status: 'triaged' }))
    render(<Tela rota="/support?chamado=t2" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Reabrir' }))
    await waitFor(() => expect(api.reabrir).toHaveBeenCalledWith('t2'))
  })

  it('prioridade só aparece quando o backend manda (gestão, alta); para o agent vem null e nada aparece', async () => {
    api.listar.mockResolvedValue({ itens: [{ ...PERGUNTOU, prioridade: 'P1' }, RESOLVIDO], proximoCursor: null })
    const { unmount } = render(<Tela />)
    expect(await screen.findByText('Prioridade alta')).toBeInTheDocument()
    unmount()
    api.listar.mockResolvedValue({ itens: [PERGUNTOU, RESOLVIDO], proximoCursor: null })
    render(<Tela />)
    await within(lista()).findByText('A Oryon perguntou')
    expect(screen.queryByText(/Prioridade/)).toBeNull()
  })

  it('SCRUM-1391: o atalho "Qualidade" só aparece para a gestão e leva à página dela', async () => {
    const { unmount } = render(<Tela />)
    await screen.findByRole('tab', { name: /Com vocês\s*2/ })
    expect(screen.queryByRole('button', { name: 'Qualidade do atendimento' })).toBeNull()
    unmount()
    papel = 'business_admin'
    render(<Tela />)
    fireEvent.click(await screen.findByRole('button', { name: 'Qualidade do atendimento' }))
    expect(screen.getByTestId('endereco')).toHaveTextContent('/support/qualidade')
  })

  it('"?novo=1&tela=Funis" abre o modal com a área; texto livre em "tela" não vira "onde"', async () => {
    const { unmount } = render(<Tela rota="/support?novo=1&tela=Funis" />)
    const modal = await screen.findByRole('dialog', { name: 'Falar com o suporte' })
    expect(within(modal).getByText(/Vai junto:/).textContent).toContain('Funis')
    unmount()
    render(<Tela rota="/support?novo=1&tela=Maria%2021998765432" />)
    const outro = await screen.findByRole('dialog', { name: 'Falar com o suporte' })
    expect(within(outro).getByText(/Vai junto:/).textContent).not.toMatch(/Maria|2199/)
  })
})
