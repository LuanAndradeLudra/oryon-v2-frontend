// SCRUM-1383 — página Suporte da empresa. Critérios do card: rascunho de um
// chamado não aparece em outro; "Isso resolveu?" (sim encerra; não reabre);
// abas por de quem é a vez (o backend filtra e conta); agent não vê
// prioridade (o backend manda null; a tela só mostra o que vier).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LayerProvider } from '@/contexts/LayerContext'
import { supportApi } from '@/services/supportApi'
import type { ChamadoDaEmpresa, ResumoDoChamado } from '@/types/support'
import { SupportPage } from './SupportPage'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }))
vi.mock('@/services/supportApi', () => ({
  supportApi: {
    resumo: vi.fn(), listar: vi.fn(), obter: vi.fn(), comentar: vi.fn(), avaliar: vi.fn(), reabrir: vi.fn(), enderecoDoAnexo: vi.fn(() => '#'),
    modelo: vi.fn(async () => ({ assuntos: {}, exemplos: {}, esperado: {}, camposDaEmpresa: [] })), parecidos: vi.fn(async () => []),
  },
}))
vi.mock('@/hooks/useToast', async (original) => ({ ...(await original<typeof import('@/hooks/useToast')>()), showToast: vi.fn() }))

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

function Tela({ rota = '/support' }: { rota?: string }) {
  return (
    <MemoryRouter initialEntries={[rota]}>
      <LayerProvider><SupportPage /></LayerProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
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

  it('"Isso resolveu?": sim encerra; não reabre — e o campo só escreve com o chamado aberto', async () => {
    api.avaliar.mockImplementation(async (_id: string, resolveu: boolean) => completo({ ...RESOLVIDO, status: resolveu ? 'closed' : 'triaged' }))
    render(<Tela rota="/support?chamado=t2" />)
    const card = (await screen.findByText('A Oryon resolveu este chamado')).closest('[role="status"]') as HTMLElement
    expect(screen.getByLabelText('Mensagem para a equipe Oryon')).toBeDisabled()
    fireEvent.click(within(card).getByRole('button', { name: 'Não, continua' }))
    await waitFor(() => expect(api.avaliar).toHaveBeenCalledWith('t2', false))
    await waitFor(() => expect(screen.getByLabelText('Mensagem para a equipe Oryon')).toBeEnabled())
    expect(api.resumo).toHaveBeenCalledTimes(2) // as abas recontam
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
