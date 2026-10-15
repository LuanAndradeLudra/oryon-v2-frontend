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
})
