// SCRUM-1381 — abrir chamado pela conversa: painel lateral com marcação ao
// vivo. Critérios do card: 3 entradas; marcar/desmarcar com o painel aberto;
// Mensagens × Conversa inteira; só envia com os obrigatórios (relato, contato
// viu, já corrigiram quando viu); o chamado criado aparece na seção; foco no
// relato, Esc fecha; celular: marcar → Continuar → mesmo painel em tela cheia.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LayerProvider } from '@/contexts/LayerContext'
import { supportApi } from '@/services/supportApi'
import type { Message } from '@/types'
import type { ChamadoDaEmpresa, ResumoDoChamado } from '@/types/support'
import { SupportReportProvider } from './SupportReportContext'
import { useRegistrarMensagensDoSuporte, useSuporte } from './suporteDaConversa'
import { FolhaDoChamadoNoCelular, PainelDoContatoOuChamado } from './ReportTicketPanel'
import { SupportPanelSection } from './SupportPanelSection'
import { RodapeDoChat } from './RodapeDoChat'

const h = vi.hoisted(() => ({ flags: ['FF_SUPPORT_TICKETS'] as string[], mobile: false, navigate: vi.fn() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ featureFlags: h.flags }) }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => h.mobile }))
vi.mock('react-router-dom', async (original) => ({ ...(await original<typeof import('react-router-dom')>()), useNavigate: () => h.navigate }))
vi.mock('@/services/supportApi', () => ({
  supportApi: { listar: vi.fn(), modelo: vi.fn(), parecidos: vi.fn(), criar: vi.fn(), adicionar: vi.fn(), enviarAnexo: vi.fn() },
}))
vi.mock('@/hooks/useToast', async (original) => ({ ...(await original<typeof import('@/hooks/useToast')>()), showToast: vi.fn() }))

const api = vi.mocked(supportApi)

const M1: Message = {
  id: 'm1', conversationId: 'conv-1', direction: 'inbound', type: 'text', status: 'delivered', senderKind: 'client',
  body: 'Oi, qual o valor da consulta?', sentAt: '2026-10-15T10:00:00Z', createdAt: '2026-10-15T10:00:00Z',
}
const M2: Message = {
  id: 'm2', conversationId: 'conv-1', direction: 'outbound', type: 'text', status: 'delivered', senderKind: 'ai',
  body: 'A consulta custa R$ 50', sentAt: '2026-10-15T10:01:00Z', createdAt: '2026-10-15T10:01:00Z',
}
const MENSAGENS = [M1, M2]

function resumo(over: Partial<ResumoDoChamado> = {}): ResumoDoChamado {
  return {
    id: 't1', numero: 'SUP-0001', origemDoProblema: 'ia', origemNome: null, tipoDePedido: null, categoria: 'wrong_info', assunto: null,
    ondeAconteceu: null, status: 'received', prioridade: null, perguntaPendente: null, avaliacao: null, conversationId: 'conv-1',
    contatoNome: 'Maria', abertoPor: 'Ana', abertoEm: '2026-10-15T10:05:00Z', atualizadoEm: '2026-10-15T10:05:00Z', mensagensMarcadas: [], ...over,
  }
}
function chamado(over: Partial<ChamadoDaEmpresa> = {}): ChamadoDaEmpresa {
  return {
    id: 't2', numero: 'SUP-0002', origem: 'empresa', entrada: 'conversa', origemDoProblema: 'ia', origemNome: null, tipoDePedido: null,
    categoria: 'wrong_info', assunto: null, descricao: 'A IA informou o valor errado', complemento: null, oQueSeriaCerto: null, camposExtras: [],
    fatos: null, conversasAfetadas: [], dadosDeTerceiros: false, desdeQuando: null, ondeAconteceu: null, impacto: null, alcance: 'esta_conversa',
    status: 'received', prioridade: null, perguntaPendente: null, resumoParaClinica: null, dependeDaClinica: null, avaliacao: null,
    contextoTecnico: null, conversationId: 'conv-1', contatoNome: 'Maria', abertoPor: 'Ana', abertoEm: '2026-10-15T10:10:00Z',
    atualizadoEm: '2026-10-15T10:10:00Z', mensagens: [{ id: 'm2', autor: 'ia', autorNome: null, texto: 'A consulta custa R$ 50', enviadaEm: M2.sentAt }],
    anexos: [], eventos: [], ...over,
  }
}

/** O "chat": registra as mensagens e oferece as entradas que a bolha e o cabeçalho oferecem. */
function Chat({ mensagens }: { mensagens: Message[] }) {
  useRegistrarMensagensDoSuporte(mensagens)
  const s = useSuporte()
  return (
    <div>
      <button type="button" onClick={() => s.reportar(['m2'])}>menu da mensagem m2</button>
      <button type="button" onClick={() => s.iniciarMarcacao()}>menu do cabeçalho</button>
      {mensagens.map((m) => <button key={m.id} type="button" onClick={() => s.alternar(m.id)}>marcar {m.id}</button>)}
      <RodapeDoChat><textarea aria-label="Mensagem" /></RodapeDoChat>
    </div>
  )
}

function Tela({ conversationId = 'conv-1' }: { conversationId?: string | null }) {
  return (
    <MemoryRouter>
      <LayerProvider>
        <SupportReportProvider conversationId={conversationId} contatoNome="Maria">
          <Chat mensagens={MENSAGENS} />
          <PainelDoContatoOuChamado contato={<SupportPanelSection />} />
          <FolhaDoChamadoNoCelular />
        </SupportReportProvider>
      </LayerProvider>
    </MemoryRouter>
  )
}

const painel = () => screen.queryByRole('dialog')
const enviar = () => within(painel()!).getByRole('button', { name: /Enviar|Adicionar$/ })
async function escolher(campo: RegExp, opcao: string) {
  fireEvent.click(within(painel()!).getByRole('button', { name: campo }))
  fireEvent.click(await screen.findByRole('menuitem', { name: opcao }))
}
function relatar(texto = 'A IA informou o valor errado da consulta') {
  fireEvent.change(within(painel()!).getByLabelText(/O que aconteceu/), { target: { value: texto } })
}

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom não implementa scrollIntoView (a lista do campo rola até ele ao abrir).
  Element.prototype.scrollIntoView = vi.fn()
  h.flags = ['FF_SUPPORT_TICKETS']
  h.mobile = false
  api.listar.mockResolvedValue({ itens: [resumo({ mensagensMarcadas: ['m1'] })], proximoCursor: null })
  api.modelo.mockResolvedValue({ assuntos: {}, exemplos: {}, esperado: {}, camposDaEmpresa: [] })
  api.parecidos.mockResolvedValue([])
  api.criar.mockResolvedValue(chamado())
})

describe('Painel do chamado na conversa (SCRUM-1381)', () => {
  it('a seção lista os chamados da conversa; "Abrir chamado" abre o painel com foco no relato; Esc fecha', async () => {
    render(<Tela />)
    expect(await screen.findByText('Chamados · 1')).toBeInTheDocument()
    expect(api.listar).toHaveBeenCalledWith({ conversationId: 'conv-1', situacao: 'todos', limite: 50 })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    expect(painel()).toHaveAccessibleName('Reportar mensagens')
    expect(document.activeElement).toBe(screen.getByLabelText(/O que aconteceu/))
    expect(screen.getByText(/Clique nas mensagens do problema/)).toBeInTheDocument()
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    expect(painel()).toBeNull()
    expect(screen.getByText('Chamados · 1')).toBeInTheDocument()
  })

  it('Esc com uma lista aberta fecha só a lista; o painel e o relato continuam', async () => {
    render(<Tela />)
    fireEvent.click(screen.getByRole('button', { name: 'menu da mensagem m2' }))
    relatar()
    fireEvent.click(within(painel()!).getByRole('button', { name: /O contato chegou a ver/ }))
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }) })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(painel()).not.toBeNull()
    expect(screen.getByLabelText(/O que aconteceu/)).toHaveValue('A IA informou o valor errado da consulta')
  })

  it('marcação ao vivo: marcar no chat entra no painel, o X tira, e o título segue a origem', async () => {
    render(<Tela />)
    fireEvent.click(screen.getByRole('button', { name: 'menu do cabeçalho' }))
    fireEvent.click(screen.getByRole('button', { name: 'marcar m2' }))
    expect(painel()).toHaveAccessibleName('Reportar resposta da IA')
    expect(within(painel()!).getByRole('list', { name: 'Mensagens marcadas' })).toHaveTextContent('A consulta custa R$ 50')
    expect(within(painel()!).getByRole('radio', { name: /Mensagens · 1/ })).toBeChecked()
    fireEvent.click(within(painel()!).getByRole('button', { name: 'Tirar do chamado' }))
    expect(painel()).toHaveAccessibleName('Reportar mensagens')
  })

  it('Conversa inteira mostra os fatos da conversa; Mensagens volta a pedir a marcação', async () => {
    render(<Tela />)
    fireEvent.click(screen.getByRole('button', { name: 'menu da mensagem m2' }))
    fireEvent.click(within(painel()!).getByRole('radio', { name: 'Conversa inteira' }))
    expect(painel()).toHaveAccessibleName('Reportar problema na conversa')
    expect(within(painel()!).getByText('A conversa inteira')).toBeInTheDocument()
    expect(within(painel()!).getByLabelText('Resumo da conversa')).toHaveTextContent('Mensagens2')
    fireEvent.click(within(painel()!).getByRole('radio', { name: /Mensagens/ }))
    expect(within(painel()!).getByText(/Clique nas mensagens do problema/)).toBeInTheDocument()
  })

  it('só envia com os obrigatórios: relato, "contato viu" e, quando viu, "já corrigiram"', async () => {
    render(<Tela />)
    fireEvent.click(screen.getByRole('button', { name: 'menu da mensagem m2' }))
    expect(enviar()).toBeDisabled()
    relatar('curto')
    expect(enviar()).toBeDisabled()
    relatar()
    expect(enviar()).toBeDisabled()
    await escolher(/O contato chegou a ver/, 'Recebeu a informação errada')
    expect(enviar()).toBeDisabled()
    await escolher(/Já corrigiram com o contato/, 'Ainda não')
    expect(enviar()).toBeEnabled()
    // Não viu: "já corrigiram" sai da tela e deixa de ser pedido.
    await escolher(/O contato chegou a ver/, 'Não chegou a ver')
    expect(within(painel()!).queryByRole('button', { name: /Já corrigiram/ })).toBeNull()
    expect(enviar()).toBeEnabled()
  })

  it('envia os FATOS (nada de impacto ou gravidade) e o chamado aparece na seção', async () => {
    render(<Tela />)
    await screen.findByText('Chamados · 1')
    fireEvent.click(screen.getByRole('button', { name: 'menu da mensagem m2' }))
    relatar()
    await escolher(/O contato chegou a ver/, 'Não chegou a ver')
    fireEvent.click(enviar())
    await waitFor(() => expect(api.criar).toHaveBeenCalledTimes(1))
    const corpo = api.criar.mock.calls[0][0]
    expect(corpo).toMatchObject({
      origemDoProblema: 'ia', categoria: 'wrong_info', conversationId: 'conv-1', messageIds: ['m2'], entrada: 'conversa',
      descricao: 'A IA informou o valor errado da consulta', fatos: { contatoViu: 'nao_viu', jaCorrigiram: null }, alcance: 'esta_conversa', anexos: [],
    })
    expect(corpo).not.toHaveProperty('impacto')
    expect(corpo.ehOutro).toBeUndefined()
    await waitFor(() => expect(painel()).toBeNull())
    expect(screen.getByText('Chamados · 2')).toBeInTheDocument()
    expect(screen.getByText('SUP-0002')).toBeInTheDocument()
  })

  it('aviso de repetido: "É outro" tira o aviso e manda ehOutro; o backend não agrupa', async () => {
    api.parecidos.mockResolvedValue([resumo()])
    render(<Tela />)
    fireEvent.click(screen.getByRole('button', { name: 'menu da mensagem m2' }))
    expect(await screen.findByText('Já existe o SUP-0001 aberto nesta conversa')).toBeInTheDocument()
    expect(api.parecidos).toHaveBeenCalledWith({ conversationId: 'conv-1', origemDoProblema: 'ia', origemNome: null })
    fireEvent.click(within(painel()!).getByRole('button', { name: 'É outro' }))
    expect(screen.queryByText(/Já existe o SUP-0001/)).toBeNull()
    relatar()
    await escolher(/O contato chegou a ver/, 'Não chegou a ver')
    fireEvent.click(enviar())
    await waitFor(() => expect(api.criar).toHaveBeenCalledTimes(1))
    expect(api.criar.mock.calls[0][0].ehOutro).toBe(true)
  })

  it('"Adicionar ao SUP-…" junta as mensagens e o relato ao chamado aberto', async () => {
    api.parecidos.mockResolvedValue([resumo()])
    api.adicionar.mockResolvedValue(chamado({ id: 't1', numero: 'SUP-0001', mensagens: [] }))
    render(<Tela />)
    fireEvent.click(screen.getByRole('button', { name: 'menu da mensagem m2' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar ao SUP-0001' }))
    expect(painel()).toHaveAccessibleName('Adicionar ao SUP-0001')
    relatar('Aconteceu de novo agora há pouco')
    fireEvent.click(enviar())
    await waitFor(() => expect(api.adicionar).toHaveBeenCalledWith('t1', { messageIds: ['m2'], descricao: 'Aconteceu de novo agora há pouco' }))
    expect(api.criar).not.toHaveBeenCalled()
  })

  it('anexos sobem na hora; o envio espera o upload; tipo recusado nem sobe', async () => {
    let concluir: (v: { id: string; nome: string; mime: string; tamanho: number }) => void = () => {}
    api.enviarAnexo.mockReturnValue(new Promise((r) => { concluir = r }))
    render(<Tela />)
    fireEvent.click(screen.getByRole('button', { name: 'menu da mensagem m2' }))
    relatar()
    await escolher(/O contato chegou a ver/, 'Não chegou a ver')
    const entrada = within(painel()!).getByLabelText('Anexar') as HTMLInputElement
    fireEvent.change(entrada, { target: { files: [new File(['x'], 'tela.png', { type: 'image/png' })] } })
    expect(api.enviarAnexo).toHaveBeenCalledTimes(1)
    expect(enviar()).toBeDisabled()
    expect(within(painel()!).getByText('Enviando anexos…')).toBeInTheDocument()
    await act(async () => { concluir({ id: 'a1', nome: 'tela.png', mime: 'image/png', tamanho: 1 }) })
    expect(enviar()).toBeEnabled()
    fireEvent.change(entrada, { target: { files: [new File(['x'], 'planilha.zip', { type: 'application/zip' })] } })
    expect(api.enviarAnexo).toHaveBeenCalledTimes(1)
    expect(within(painel()!).getByText(/planilha\.zip: Tipo de arquivo não aceito/)).toBeInTheDocument()
    fireEvent.click(enviar())
    await waitFor(() => expect(api.criar).toHaveBeenCalledTimes(1))
    expect(api.criar.mock.calls[0][0].anexos).toEqual(['a1'])
  })

  it('o chamado da seção leva à página Suporte', async () => {
    render(<Tela />)
    fireEvent.click(await screen.findByRole('button', { name: /SUP-0001 · .* · ver andamento/ }))
    expect(h.navigate).toHaveBeenCalledWith('/support?chamado=t1')
  })

  it('celular: marca no chat (o campo de texto some sem perder o rascunho) → Continuar → folha em tela cheia', async () => {
    h.mobile = true
    render(<Tela />)
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'rascunho da resposta' } })
    fireEvent.click(screen.getByRole('button', { name: 'menu do cabeçalho' }))
    expect(painel()).toBeNull()
    expect(screen.getByText('Marque as mensagens do problema')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'marcar m2' }))
    expect(screen.getByText('1 mensagem marcada')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(painel()).toHaveAttribute('aria-modal', 'true')
    expect(painel()).toHaveAccessibleName('Reportar resposta da IA')
    relatar()
    // "Mensagens" volta ao chat para marcar mais: a folha só se esconde (não é mais diálogo)…
    fireEvent.click(within(painel()!).getByRole('radio', { name: /Mensagens/ }))
    expect(painel()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'marcar m1' }))
    expect(screen.getByText('2 mensagens marcadas')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    // …e reaparece com o relato e as duas mensagens, com o foco no relato.
    expect(screen.getByLabelText(/O que aconteceu/)).toHaveValue('A IA informou o valor errado da consulta')
    expect(document.activeElement).toBe(screen.getByLabelText(/O que aconteceu/))
    expect(within(painel()!).getByRole('radio', { name: /Mensagens · 2/ })).toBeChecked()
    fireEvent.click(within(painel()!).getByRole('button', { name: 'Cancelar' }))
    expect(painel()).toBeNull()
    expect(screen.queryByLabelText(/O que aconteceu/)).toBeNull()
    expect(screen.getByLabelText('Mensagem')).toHaveValue('rascunho da resposta')
  })

  it('sem a flag do tenant nada aparece e nada é buscado', async () => {
    h.flags = []
    render(<Tela />)
    fireEvent.click(screen.getByRole('button', { name: 'menu do cabeçalho' }))
    fireEvent.click(screen.getByRole('button', { name: 'menu da mensagem m2' }))
    expect(painel()).toBeNull()
    expect(screen.queryByText(/Chamados/)).toBeNull()
    expect(api.listar).not.toHaveBeenCalled()
  })

  it('erro ao listar mostra "Tentar de novo", que busca outra vez', async () => {
    api.listar.mockRejectedValueOnce(new Error('rede'))
    render(<Tela />)
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Chamados · 1')).toBeInTheDocument()
    expect(api.listar).toHaveBeenCalledTimes(2)
  })
})
