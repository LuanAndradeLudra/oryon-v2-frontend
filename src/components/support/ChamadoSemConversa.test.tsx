// SCRUM-1382 — chamado sem conversa ("Falar com o suporte"): modal com o tipo
// do pedido, os campos de cada tipo (desenho v3, tabela 5.3), fatos sem
// gravidade e o contexto técnico capturado ao abrir (endereço sem `?…`).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LayerProvider } from '@/contexts/LayerContext'
import { showToast } from '@/hooks/useToast'
import { supportApi } from '@/services/supportApi'
import type { ChamadoDaEmpresa } from '@/types/support'
import ChamadoSemConversa from './ChamadoSemConversa'
import type { TipoDePedido } from './supportModel'
import { limparAtividadeRecente, registrarFalhaDeRede, registrarTela } from '@/lib/atividadeRecente'

const h = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('react-router-dom', async (original) => ({ ...(await original<typeof import('react-router-dom')>()), useNavigate: () => h.navigate }))
vi.mock('@/services/supportApi', () => ({
  supportApi: { modelo: vi.fn(), parecidos: vi.fn(), criar: vi.fn(), enviarAnexo: vi.fn() },
}))
vi.mock('@/hooks/useToast', async (original) => ({ ...(await original<typeof import('@/hooks/useToast')>()), showToast: vi.fn() }))

const api = vi.mocked(supportApi)

function Tela({ rota = '/pipelines/abc?busca=Maria%20Silva&tel=21998765432' }: { rota?: string }) {
  return (
    <MemoryRouter initialEntries={[rota]}>
      <LayerProvider>
        <ChamadoSemConversa entrada="menu_do_usuario" onClose={() => {}} />
      </LayerProvider>
    </MemoryRouter>
  )
}

const modal = () => screen.getByRole('dialog')
const tipo = (nome: string) => within(modal()).getByRole('radio', { name: nome })

/**
 * O que o formulário pergunta além dos textos (revisão de UX de 27/10): as
 * perguntas de fato (opções à vista), a chave de dados de terceiros e as linhas
 * "rótulo · valor" — "Onde" e "Desde" ficam em "Mais detalhes", que é aberto aqui.
 */
const PERGUNTAS = ['Conseguiu fazer de outro jeito?', 'Acontece com mais alguém da equipe?', 'O que isso impede agora?']
const LINHAS = ['Onde', 'Desde', 'Problema']
function camposVisiveis(): string[] {
  const mais = within(modal()).queryByRole('button', { name: /Mais detalhes/ })
  if (mais) fireEvent.click(mais)
  const rotulos = [...modal().querySelectorAll('[role="radiogroup"], [role="group"]')]
    .map((g) => document.getElementById(g.getAttribute('aria-labelledby') ?? '')?.textContent ?? '')
  const perguntas = PERGUNTAS.filter((p) => rotulos.some((r) => r.startsWith(p)))
  const terceiros = within(modal()).queryByRole('switch', { name: /dados de outra pessoa/ }) ? ['Terceiros'] : []
  const detalhes = modal().querySelector('section[aria-label="Detalhes"]')
  const linhas = detalhes ? LINHAS.filter((l) => within(detalhes as HTMLElement).queryAllByText(l, { exact: true }).length > 0) : []
  return [...perguntas, ...terceiros, ...linhas]
}
function camposDeTexto(): string[] {
  return within(modal()).queryAllByRole('textbox').map((t) => t.getAttribute('aria-label') ?? (t.id ? document.querySelector(`label[for="${t.id}"]`)?.textContent?.replace(/\s*[*·].*$/, '').trim() : '') ?? '')
}

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.scrollIntoView = vi.fn()
  api.modelo.mockResolvedValue({ assuntos: {}, exemplos: {}, esperado: {}, camposDaEmpresa: [] })
  api.parecidos.mockResolvedValue([])
})

describe('Chamado sem conversa (SCRUM-1382)', () => {
  it('abre com o foco no 1º tipo, sem balão de ajuda, só com o tipo e o cartão "A plataforma"', async () => {
    render(<Tela />)
    expect(modal()).toHaveAccessibleName('Falar com o suporte')
    await waitFor(() => expect(document.activeElement).toBe(tipo('Algo não funciona')))
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(within(modal()).getByText('A plataforma')).toBeInTheDocument()
    expect(camposDeTexto()).toEqual([])
    expect(within(modal()).getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  const FATOS = ['Conseguiu fazer de outro jeito?', 'Acontece com mais alguém da equipe?', 'O que isso impede agora?']
  const CAMPOS_5_3: Record<string, { textos: string[]; linhas: string[] }> = {
    // Revisão de UX de 27/10: o relato (obrigatório) vem antes do complemento opcional.
    'Algo não funciona': { textos: ['O que aconteceu?', 'O que você estava tentando fazer?'], linhas: [...FATOS, 'Terceiros', 'Onde', 'Desde'] },
    'Está lento': { textos: ['O que está demorando?'], linhas: [...FATOS, 'Onde', 'Desde'] },
    'Dúvida de uso': { textos: ['O que você quer fazer?'], linhas: ['Onde'] },
    Sugestão: { textos: ['O que você gostaria?', 'Por que isso ajudaria?'], linhas: [] },
    'Plano ou cobrança': { textos: ['Qual é a sua dúvida?'], linhas: [] },
  }
  it.each(Object.entries(CAMPOS_5_3))('"%s" mostra exatamente os campos da tabela 5.3', async (nome, esperado) => {
    render(<Tela />)
    fireEvent.click(tipo(nome))
    expect(camposDeTexto()).toEqual(esperado.textos)
    expect(camposVisiveis()).toEqual(esperado.linhas)
  })

  it('o endereço capturado nunca leva "?…"; "Onde" vem da rota e o repetido é pelo mesmo tipo na mesma tela', async () => {
    api.criar.mockResolvedValue({ id: 't9', numero: 'SUP-0009' } as ChamadoDaEmpresa)
    render(<Tela />)
    fireEvent.click(within(modal()).getByRole('button', { name: /O contexto técnico vai junto|Vai junto/ }))
    const detalhes = modal().querySelector('dl')!
    expect(detalhes).toHaveTextContent('Endereço/pipelines/abc')
    expect(detalhes.textContent).not.toMatch(/\?|busca|Maria|21998765432/)
    fireEvent.click(tipo('Algo não funciona'))
    await waitFor(() => expect(api.parecidos).toHaveBeenCalledWith({ tipoDePedido: 'defeito', ondeAconteceu: 'Funis' }))
    // Obrigatórios do defeito: relato e os dois fatos.
    fireEvent.change(within(modal()).getByLabelText(/O que aconteceu/), { target: { value: 'O card não muda de etapa ao salvar.' } })
    expect(within(modal()).getByRole('button', { name: 'Enviar' })).toBeDisabled()
    fireEvent.click(within(modal()).getByRole('radio', { name: 'Não consegui' }))
    fireEvent.click(within(modal()).getByRole('radio', { name: 'Só comigo' }))
    // "Nada urgente" é exclusivo.
    fireEvent.click(within(modal()).getByRole('button', { name: 'Agendar' }))
    fireEvent.click(within(modal()).getByRole('button', { name: 'Nada urgente' }))
    expect(within(modal()).getByRole('button', { name: 'Agendar' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(within(modal()).getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(api.criar).toHaveBeenCalledTimes(1))
    const corpo = api.criar.mock.calls[0][0]
    expect(corpo).toMatchObject({
      origemDoProblema: 'plataforma', tipoDePedido: 'defeito' satisfies TipoDePedido, categoria: 'platform', conversationId: null, messageIds: [],
      ondeAconteceu: 'Funis', entrada: 'menu_do_usuario', fatos: { contornou: 'nao', quemMais: 'so_eu', impede: ['nada_urgente'] },
    })
    expect(corpo.contextoTecnico).toMatchObject({ tela: 'Funis', endereco: '/pipelines/abc' })
    expect(corpo).not.toHaveProperty('impacto')
  })

  it('1390: falha recente nesta tela aparece sugerida; incluída, vai no contexto técnico; desmarcada, não vai nada', async () => {
    limparAtividadeRecente()
    registrarTela('/campaigns', 'Disparos')
    registrarFalhaDeRede({ metodo: 'get', url: '/api/campaigns?busca=Maria', status: 500, requestId: 'c0ffee00-0000-4000-8000-000000000001' })
    api.criar.mockResolvedValue({ id: 't9', numero: 'SUP-0009' } as ChamadoDaEmpresa)
    const preencher = () => {
      fireEvent.click(tipo('Dúvida de uso'))
      fireEvent.change(within(modal()).getByLabelText(/O que você quer fazer/), { target: { value: 'A tela de disparos não abre.' } })
    }
    const { unmount } = render(<Tela rota="/campaigns" />)
    const sugestao = within(modal()).getByRole('region', { name: 'Falhas detectadas' })
    expect(sugestao).toHaveTextContent(/Detectamos nesta tela: Disparos não carregou \(erro 500 às/)
    const incluir = within(sugestao).getByRole('checkbox', { name: 'Incluir no chamado' })
    expect(incluir).toBeChecked()
    preencher()
    fireEvent.click(within(modal()).getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(api.criar).toHaveBeenCalledTimes(1))
    expect(api.criar.mock.calls[0][0].contextoTecnico?.recentes?.falhas).toEqual([
      expect.objectContaining({ tela: 'Disparos', rota: '/api/campaigns', status: 500, requestId: 'c0ffee00-0000-4000-8000-000000000001' }),
    ])
    unmount()
    // A pessoa decide: desmarcado, nada da atividade vai junto.
    render(<Tela rota="/campaigns" />)
    fireEvent.click(within(within(modal()).getByRole('region', { name: 'Falhas detectadas' })).getByRole('checkbox', { name: 'Incluir no chamado' }))
    preencher()
    fireEvent.click(within(modal()).getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(api.criar).toHaveBeenCalledTimes(2))
    expect(api.criar.mock.calls[1][0].contextoTecnico).not.toHaveProperty('recentes')
    limparAtividadeRecente()
  })

  it('criado: o aviso traz "Ver chamado", que leva à página Suporte', async () => {
    api.criar.mockResolvedValue({ id: 't9', numero: 'SUP-0009' } as ChamadoDaEmpresa)
    render(<Tela rota="/campaigns" />)
    fireEvent.click(tipo('Dúvida de uso'))
    fireEvent.change(within(modal()).getByLabelText(/O que você quer fazer/), { target: { value: 'Quero agendar um disparo para segunda.' } })
    fireEvent.click(within(modal()).getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(showToast).toHaveBeenCalled())
    const [mensagem, tipoDoAviso, acao] = vi.mocked(showToast).mock.calls[0]
    expect(mensagem).toContain('SUP-0009')
    expect(tipoDoAviso).toBe('success')
    expect(acao?.label).toBe('Ver chamado')
    acao?.onClick()
    expect(h.navigate).toHaveBeenCalledWith('/support?chamado=t9')
    expect(api.criar.mock.calls[0][0]).toMatchObject({ tipoDePedido: 'duvida', ondeAconteceu: 'Disparos', fatos: null })
  })

  it('fora das áreas conhecidas, "Onde" fica para a pessoa escolher', async () => {
    render(<Tela rota="/plataforma/algum-lugar" />)
    fireEvent.click(tipo('Está lento'))
    // Recolhido em "Mais detalhes", com o resumo dizendo que falta.
    fireEvent.click(within(modal()).getByRole('button', { name: /Mais detalhes/ }))
    expect(within(modal()).getByRole('button', { name: 'Onde aconteceu: não informado' })).toBeInTheDocument()
  })
})
