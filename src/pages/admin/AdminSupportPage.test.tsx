// SCRUM-1384 — fila da Oryon. Critérios do card na tela: Resolvido só pela
// resposta à empresa (e nunca como padrão de um chamado aberto); nota interna
// pelo modo próprio; prioridade só com motivo; atalhos J/K/A/R; contadores que
// filtram; 409 recarrega o chamado. (O 403 da empresa e a nota que não vaza
// estão nos testes do backend e no roteiro da pilha.)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LayerProvider } from '@/contexts/LayerContext'
import { limparSessao } from '@/lib/limpezaDaSessao'
import { adminSupportApi } from '@/services/supportApi'
import type { ChamadoDaEquipe, ItemDaFila } from '@/types/support'
import { AdminSupportPage } from './AdminSupportPage'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'eu', role: 'oryon_support', firstName: 'Sueli' } }) }))
vi.mock('@/services/supportApi', () => ({
  adminSupportApi: {
    resumo: vi.fn(), listar: vi.fn(), obter: vi.fn(), atualizar: vi.fn(), anotar: vi.fn(), perguntar: vi.fn(), responder: vi.fn(),
    sugestoes: vi.fn(async () => ({ problemas: [], parecidos: [] })), evidencia: vi.fn(), baixarDossie: vi.fn(), baixarAnexo: vi.fn(),
    conversa: vi.fn(), liberarConversa: vi.fn(), abrirParaEmpresa: vi.fn(), encerrarOcorrencia: vi.fn(),
  },
}))
vi.mock('@/hooks/useToast', async (original) => ({ ...(await original<typeof import('@/hooks/useToast')>()), showToast: vi.fn() }))

const api = vi.mocked(adminSupportApi)

function item(id: string, numero: string, extra: Partial<ItemDaFila> = {}): ItemDaFila {
  return {
    id, numero, kind: 'sup', tenantId: 'ten-a', tenantNome: 'Clínica Serra', visivelParaEmpresa: true, origem: 'inbox', entrada: 'conversa',
    origemDoProblema: 'ia', origemNome: null, tipoDePedido: null, categoria: 'wrong_info', assunto: null, ondeAconteceu: null,
    descricao: 'A IA informou o valor errado.', status: 'triaged', prioridade: 'P1', prioridadeManual: false, responsavelId: null, responsavel: null,
    perguntaPendente: null, avaliacao: null, contatoNome: 'Maria', abertoPor: 'Ana', abertoEm: '2026-10-15T10:00:00Z',
    atualizadoEm: '2026-10-15T10:00:00Z', alteradoEm: '2026-10-15T10:00:00Z', primeiraRespostaEm: null, proximoPrazo: null, version: 3, ...extra,
  }
}
function chamado(i: ItemDaFila, extra: Partial<ChamadoDaEquipe> = {}): ChamadoDaEquipe {
  return {
    ...i, complemento: null, oQueSeriaCerto: null, camposExtras: [], fatos: { contatoViu: 'info_errada' }, conversasAfetadas: [],
    dadosDeTerceiros: false, desdeQuando: null, impacto: null, alcance: 'esta_conversa', resumoParaClinica: null, dependeDaClinica: null,
    contextoTecnico: null, conversationId: 'c1', mensagens: [], anexos: [], prioridadeDaRegra: 'P1', motivosDaPrioridade: ['Contato: recebeu a informação errada'],
    regraVersao: 'v3', relatores: 1, causaRaiz: null, problemaId: null, jiraRef: null, acessoAteEm: null,
    sla: {
      primeiraRespostaAte: null, triagemAte: null, contornoAte: null, solucaoAte: null, pausadoDesde: null, pausadoMinutos: 0,
      primeiraRespostaEm: null, triagemEm: null, contornoEm: null, solucaoEm: null, encerradoEm: null,
    },
    eventos: [{ id: 'e1', tipo: 'aberto', texto: 'Chamado aberto', corpo: null, autor: 'Ana', autorTipo: 'usuario', em: i.abertoEm, visivelParaEmpresa: true, dados: null }],
    ...extra,
  } as ChamadoDaEquipe
}

// Ids de verdade: a URL só aceita UUID em `?chamado=`.
const T1 = '13840000-0000-4000-8000-000000000001'
const T2 = '13840000-0000-4000-8000-000000000002'
const A = item(T1, 'SUP-0001')
const B = item(T2, 'SUP-0002', { tenantNome: 'Clínica Rio', prioridade: 'P2' })

function Tela({ rota = '/admin/support' }: { rota?: string }) {
  return (
    <MemoryRouter initialEntries={[rota]}>
      <LayerProvider><AdminSupportPage /></LayerProvider>
    </MemoryRouter>
  )
}

const detalhe = () => screen.getByRole('region', { name: /^Chamado SUP-/ })

beforeEach(() => {
  vi.clearAllMocks()
  limparSessao() // rascunhos do campo único (módulo, por sessão)
  // jsdom não implementa scrollIntoView (o menu do campo rola até ele ao abrir).
  Element.prototype.scrollIntoView = vi.fn()
  api.resumo.mockResolvedValue({ contadores: { urgentes: 1, semResposta: 2, comCliente: 0, minha: 0, semDono: 2, todos: 2 }, empresas: [] })
  api.listar.mockResolvedValue({ itens: [A, B], proximoCursor: null })
  api.obter.mockImplementation(async (id: string) => chamado(id === T1 ? A : B))
})

describe('Fila da Oryon (SCRUM-1384)', () => {
  it('abre no primeiro da fila; o contador do topo filtra a lista', async () => {
    render(<Tela />)
    expect(await screen.findByRole('region', { name: 'Chamado SUP-0001' })).toBeInTheDocument()
    expect(api.listar).toHaveBeenCalledWith(expect.objectContaining({ fila: 'todos', situacao: 'abertos', limite: 30 }))
    fireEvent.click(screen.getByRole('button', { name: /1 P0\/P1/ }))
    await waitFor(() => expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ atalho: 'urgentes' })))
  })

  it('responder não resolve por padrão; Resolvido é escolha explícita', async () => {
    api.responder.mockImplementation(async (_id, dto) => chamado(A, { status: dto.deixarComo }))
    render(<Tela />)
    const campo = await screen.findByLabelText('Resposta à empresa')
    fireEvent.change(campo, { target: { value: 'Achamos a causa e seguimos investigando.' } })
    fireEvent.click(within(detalhe()).getByRole('button', { name: 'Enviar para a empresa' }))
    await waitFor(() => expect(api.responder).toHaveBeenCalledWith(T1, expect.objectContaining({ deixarComo: 'investigating', version: 3 })))
    fireEvent.change(await screen.findByLabelText('Resposta à empresa'), { target: { value: 'Corrigimos o cadastro do agente.' } })
    fireEvent.click(screen.getByRole('button', { name: /Status depois da resposta/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /Resolvido \(pede confirmação\)/ }))
    fireEvent.click(within(detalhe()).getByRole('button', { name: 'Enviar para a empresa' }))
    await waitFor(() => expect(api.responder).toHaveBeenLastCalledWith(T1, expect.objectContaining({ deixarComo: 'resolved' })))
  })

  it('nota interna pelo modo próprio; ocorrência interna (sem empresa) só tem nota', async () => {
    api.anotar.mockResolvedValue(chamado(A))
    const { unmount } = render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado SUP-0001' })
    fireEvent.click(screen.getByRole('tab', { name: 'Nota interna' }))
    fireEvent.change(screen.getByLabelText('Nota interna'), { target: { value: 'Hipótese: cadastro desatualizado.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar nota' }))
    await waitFor(() => expect(api.anotar).toHaveBeenCalledWith(T1, 'Hipótese: cadastro desatualizado.'))
    unmount()
    api.obter.mockResolvedValue(chamado({ ...A, kind: 'oco', visivelParaEmpresa: false }))
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado SUP-0001' })
    expect(screen.queryByRole('tab', { name: 'Responder à empresa' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Perguntar' })).toBeNull()
    expect(screen.getByLabelText('Nota interna')).toBeInTheDocument()
  })

  it('pergunta esperando a empresa: não deixa mandar outra', async () => {
    api.obter.mockResolvedValue(chamado({ ...A, status: 'awaiting_client', perguntaPendente: 'Em que horário?' }))
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado SUP-0001' })
    fireEvent.click(screen.getByRole('tab', { name: 'Perguntar' }))
    expect(screen.getByText(/Já existe uma pergunta esperando a empresa/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar pergunta' })).toBeNull()
  })

  it('prioridade só com motivo (5+ letras); vai com a versão da tela', async () => {
    api.atualizar.mockResolvedValue(chamado({ ...A, prioridade: 'P0', version: 4 }))
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado SUP-0001' })
    fireEvent.click(screen.getByRole('button', { name: 'Prioridade: P1 · Alta' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /P0 · Crítica/ }))
    const salvar = screen.getByRole('button', { name: 'Salvar' })
    expect(salvar).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Motivo da mudança de prioridade'), { target: { value: 'Afeta a rede toda' } })
    fireEvent.click(salvar)
    await waitFor(() => expect(api.atualizar).toHaveBeenCalledWith(T1, 3, { prioridade: 'P0', motivo: 'Afeta a rede toda' }))
  })

  it('409 (alguém mexeu antes): recarrega o chamado', async () => {
    api.atualizar.mockRejectedValue({ response: { status: 409, data: { message: 'Alguém mudou este chamado agora há pouco.' } } })
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado SUP-0001' })
    const antes = api.obter.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Assumir (A)' }))
    await waitFor(() => expect(api.obter.mock.calls.length).toBeGreaterThan(antes))
  })

  it('conversa do cliente (1385): sem acesso pede motivo; aberta, mostra a conversa com as marcadas destacadas', async () => {
    api.conversa.mockRejectedValueOnce({ response: { status: 403 } })
    api.liberarConversa.mockResolvedValue(chamado(A, { acessoAteEm: '2026-10-16T10:00:00Z' }))
    api.conversa.mockResolvedValueOnce({
      conversationId: 'c1', contatoNome: 'Maria', ate: '2026-10-16T10:00:00Z',
      mensagens: [
        { id: 'm1', autor: 'contato', autorNome: null, texto: 'Quanto custa?', enviadaEm: '2026-10-15T10:00:00Z', tipo: 'text', marcada: false },
        { id: 'm2', autor: 'ia', autorNome: null, texto: 'R$ 50', enviadaEm: '2026-10-15T10:01:00Z', tipo: 'text', marcada: true },
      ],
    })
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado SUP-0001' })
    fireEvent.click(screen.getByRole('tab', { name: /Conversa do cliente/ }))
    const abrir = await screen.findByRole('button', { name: /Abrir conversa por 24 h/ })
    expect(abrir).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Conferir o contexto das respostas marcadas' } })
    fireEvent.click(abrir)
    await waitFor(() => expect(api.liberarConversa).toHaveBeenCalledWith(T1, 'Conferir o contexto das respostas marcadas'))
    expect(await screen.findByText(/Acesso de suporte ativo até/)).toBeInTheDocument()
    expect(screen.getByText('marcada no chamado')).toBeInTheDocument()
    expect(screen.getByText('Quanto custa?')).toBeInTheDocument()
  })

  it('atalhos: J/K navegam, A assume; dentro de um campo de texto não valem', async () => {
    api.atualizar.mockResolvedValue(chamado({ ...A, responsavelId: 'eu', responsavel: 'Sueli', version: 4 }))
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado SUP-0001' })
    act(() => { fireEvent.keyDown(window, { key: 'j' }) })
    expect(await screen.findByRole('region', { name: 'Chamado SUP-0002' })).toBeInTheDocument()
    act(() => { fireEvent.keyDown(window, { key: 'k' }) })
    expect(await screen.findByRole('region', { name: 'Chamado SUP-0001' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByLabelText('Resposta à empresa'), { key: 'a' })
    expect(api.atualizar).not.toHaveBeenCalled()
    act(() => { fireEvent.keyDown(window, { key: 'a' }) })
    await waitFor(() => expect(api.atualizar).toHaveBeenCalledWith(T1, 3, { assumir: true }))
  })

  it('revisão do Portão 3: o que foi escrito durante o envio não se perde', async () => {
    let soltar: (c: ChamadoDaEquipe) => void = () => {}
    api.anotar.mockImplementation(() => new Promise((r) => { soltar = r }))
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado SUP-0001' })
    fireEvent.click(screen.getByRole('tab', { name: 'Nota interna' }))
    const campo = screen.getByLabelText('Nota interna')
    fireEvent.change(campo, { target: { value: 'Primeira hipótese.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar nota' }))
    // Enquanto a nota vai, a pessoa continua escrevendo.
    fireEvent.change(campo, { target: { value: 'Primeira hipótese. E mais um detalhe.' } })
    await act(async () => { soltar(chamado(A, { version: 4 })) })
    expect(screen.getByLabelText('Nota interna')).toHaveValue('Primeira hipótese. E mais um detalhe.')
  })

  it('revisão do Portão 3: duas mudanças seguidas saem uma de cada vez, cada uma com a versão da anterior', async () => {
    api.atualizar
      .mockResolvedValueOnce(chamado({ ...A, version: 4 }, { jiraRef: 'SCRUM-9' }))
      .mockResolvedValueOnce(chamado({ ...A, version: 5 }, { jiraRef: 'SCRUM-9', responsavelId: 'eu', responsavel: 'Sueli' }))
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado SUP-0001' })
    const jira = screen.getByLabelText('Card no Jira')
    fireEvent.change(jira, { target: { value: 'SCRUM-9' } })
    fireEvent.blur(jira)
    fireEvent.change(screen.getByLabelText('Card no Jira'), { target: { value: 'SCRUM-9' } })
    // A segunda mudança é disparada antes de a primeira voltar.
    fireEvent.click(screen.getByRole('button', { name: 'Assumir (A)' }))
    await waitFor(() => expect(api.atualizar).toHaveBeenCalledTimes(2))
    expect(api.atualizar.mock.calls[0]).toEqual([T1, 3, { jiraRef: 'SCRUM-9' }])
    expect(api.atualizar.mock.calls[1]).toEqual([T1, 4, { assumir: true }])
  })
  it('ocorrência interna (1389): abrir o chamado da empresa leva a ele; encerrar pede o motivo', async () => {
    const OCO = item(T1, 'OCO-0007', { kind: 'oco', visivelParaEmpresa: false })
    const SUP = '13890000-0000-4000-8000-000000000099'
    api.listar.mockResolvedValue({ itens: [OCO], proximoCursor: null })
    api.obter.mockImplementation(async (id: string) => (id === SUP
      ? chamado(item(SUP, 'SUP-0042'), { ocorrencia: { id: T1, numero: 'OCO-0007' } })
      : chamado(OCO, { chamadoDaEmpresa: null })))
    api.abrirParaEmpresa.mockResolvedValue(chamado(item(SUP, 'SUP-0042'), { ocorrencia: { id: T1, numero: 'OCO-0007' } }))
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado OCO-0007' })
    expect(screen.getByText(/Ocorrência interna — a empresa não vê/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir chamado para a empresa' }))
    const abrir = screen.getByRole('button', { name: 'Abrir chamado' })
    expect(abrir).toBeDisabled()
    fireEvent.change(screen.getByLabelText('O que a empresa vai ler'), { target: { value: 'Notamos respostas erradas da IA; já estamos corrigindo.' } })
    fireEvent.click(abrir)
    await waitFor(() => expect(api.abrirParaEmpresa).toHaveBeenCalledWith(T1, 'Notamos respostas erradas da IA; já estamos corrigindo.', 3))
    // Vai para o chamado novo, que mostra de onde veio.
    expect(await screen.findByRole('region', { name: 'Chamado SUP-0042' })).toBeInTheDocument()
    expect(screen.getByText(/Aberto a partir da ocorrência interna/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OCO-0007' })).toBeInTheDocument()
  })

  it('ocorrência interna (1389): encerrar com motivo', async () => {
    const OCO = item(T1, 'OCO-0008', { kind: 'oco', visivelParaEmpresa: false })
    api.listar.mockResolvedValue({ itens: [OCO], proximoCursor: null })
    api.obter.mockResolvedValue(chamado(OCO, { chamadoDaEmpresa: null }))
    api.encerrarOcorrencia.mockResolvedValue(chamado({ ...OCO, status: 'closed', version: 4 }, { chamadoDaEmpresa: null }))
    render(<Tela />)
    await screen.findByRole('region', { name: 'Chamado OCO-0008' })
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar ocorrência' }))
    fireEvent.change(screen.getByLabelText('Motivo do encerramento'), { target: { value: 'Falso positivo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    await waitFor(() => expect(api.encerrarOcorrencia).toHaveBeenCalledWith(T1, 'Falso positivo', 3))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Encerrar ocorrência' })).toBeNull())
  })
})
