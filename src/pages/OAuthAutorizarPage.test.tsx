import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { DetalheDoPedidoOAuth } from '@/services/oauthApi'

const api = vi.hoisted(() => ({ detalhar: vi.fn(), decidir: vi.fn() }))
vi.mock('@/services/oauthApi', async (original) => ({
  ...(await original<typeof import('@/services/oauthApi')>()),
  detalharPedidoOAuth: api.detalhar,
  decidirPedidoOAuth: api.decidir,
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: 'ana@empresa.test' }, logout: vi.fn() }) }))

import { OAuthAutorizarPage } from './OAuthAutorizarPage'

// Revisão ORY-94 (2ª rodada): o backend pede a senha em TODA aprovação (precisaSenha: true).
function pedido(extra: Partial<DetalheDoPedidoOAuth> = {}): DetalheDoPedidoOAuth {
  return {
    pedido: 'p1',
    csrf: 'csrf-1',
    cliente: { nome: 'Claude', dominio: 'claude.ai', logoUri: null },
    retornoPara: 'claude.ai',
    workspace: { nome: 'Empresa Teste' },
    pessoa: { nome: 'Ana' },
    apiLiberada: true,
    politica: { liberado: true, motivo: null, nivelMaximo: 'escrita' },
    niveis: {
      leitura: { disponivel: true, grupos: [{ grupo: 'Contatos', ver: true, alterar: false }] },
      escrita: { disponivel: true, grupos: [{ grupo: 'Contatos', ver: true, alterar: true }, { grupo: 'Agentes de IA', ver: true, alterar: true }] },
    },
    precisaSenha: true,
    ...extra,
  }
}

const erroHttp = (status: number, code: string, message = 'x') => Object.assign(new Error(code), { response: { status, data: { error: { code, message } } } })

function abrir(url = '/oauth/authorize?pedido=p1') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/oauth/authorize" element={<OAuthAutorizarPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const assign = vi.fn()
const digitarSenha = (valor = 'certa') => fireEvent.change(screen.getByLabelText('Confirme a sua senha'), { target: { value: valor } })

describe('OAuthAutorizarPage — "Conectar à Oryon"', () => {
  beforeEach(() => {
    api.detalhar.mockReset()
    api.decidir.mockReset()
    assign.mockReset()
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } })
  })
  afterEach(() => vi.restoreAllMocks())

  it('mostra o aplicativo verificado, o workspace, a conta logada e "Só consultar" marcado', async () => {
    api.detalhar.mockResolvedValue(pedido())
    abrir()
    expect(await screen.findByRole('heading', { name: 'Claude quer acessar a sua conta Oryon' })).toBeInTheDocument()
    expect(screen.getByText(/claude\.ai · aplicativo aprovado pela Oryon/)).toBeInTheDocument()
    expect(screen.getByText('Empresa Teste')).toBeInTheDocument()
    expect(screen.getByText('ana@empresa.test')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Só consultar/ })).toBeChecked()
    expect(screen.getByRole('list', { name: /poderá acessar/ })).toHaveTextContent('Contatos · ver')
    expect(api.detalhar).toHaveBeenCalledWith('p1')
  })

  it('escrita com a senha: manda o nível e a senha e volta ao aplicativo', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ redirecionarPara: 'https://claude.ai/api/mcp/auth_callback?code=c&state=s&iss=i' })
    abrir()
    fireEvent.click(await screen.findByRole('radio', { name: /Consultar e fazer alterações/ }))
    expect(screen.getByRole('list', { name: /poderá acessar/ })).toHaveTextContent('Agentes de IA · ver e alterar')
    digitarSenha()
    fireEvent.click(screen.getByRole('button', { name: 'Permitir' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?code=c&state=s&iss=i'))
    expect(api.decidir).toHaveBeenCalledWith('p1', { csrf: 'csrf-1', aprovar: true, nivel: 'escrita', senha: 'certa' })
    expect(await screen.findByText('Voltando para claude.ai…')).toBeInTheDocument()
  })

  it('sem a senha, "Permitir" fica desabilitado; recusar não pede senha', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ redirecionarPara: 'https://claude.ai/cb?error=access_denied' })
    abrir()
    expect(await screen.findByRole('button', { name: 'Permitir' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }))
    await waitFor(() => expect(assign).toHaveBeenCalled())
    expect(api.decidir).toHaveBeenCalledWith('p1', { csrf: 'csrf-1', aprovar: false })
  })

  it('envio duplo: dois cliques em "Permitir" mandam uma decisão só', async () => {
    api.detalhar.mockResolvedValue(pedido())
    let soltar: (v: { redirecionarPara: string }) => void = () => undefined
    api.decidir.mockReturnValue(new Promise((r) => (soltar = r)))
    abrir()
    await screen.findByRole('button', { name: 'Permitir' })
    digitarSenha()
    const permitir = screen.getByRole('button', { name: 'Permitir' })
    fireEvent.click(permitir)
    fireEvent.click(permitir)
    soltar({ redirecionarPara: 'https://claude.ai/cb?code=c' })
    await waitFor(() => expect(assign).toHaveBeenCalled())
    expect(api.decidir).toHaveBeenCalledTimes(1)
  })

  it('política só de consulta: a opção de alterar fica desabilitada e explica o porquê', async () => {
    api.detalhar.mockResolvedValue(pedido({ politica: { liberado: true, motivo: null, nivelMaximo: 'leitura' }, niveis: { ...pedido().niveis, escrita: { disponivel: false, grupos: [] } } }))
    abrir()
    expect(await screen.findByRole('radio', { name: /Consultar e fazer alterações/ })).toBeDisabled()
    expect(screen.getByText('O administrador deste workspace só liberou consultas.')).toBeInTheDocument()
  })

  it('senha errada avisa e limpa o campo', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockRejectedValueOnce(erroHttp(403, 'senha_incorreta'))
    abrir()
    await screen.findByRole('button', { name: 'Permitir' })
    digitarSenha('errada')
    fireEvent.click(screen.getByRole('button', { name: 'Permitir' }))
    expect(await screen.findByText('Senha incorreta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirme a sua senha')).toHaveValue('')
    expect(api.decidir).toHaveBeenCalledWith('p1', { csrf: 'csrf-1', aprovar: true, nivel: 'leitura', senha: 'errada' })
  })

  it.each([
    ['muitas_tentativas', 'Muitas tentativas de senha. Espere alguns minutos e tente de novo.'],
    ['indisponivel', 'Não foi possível conferir a senha agora. Tente de novo em instantes.'],
  ])('trava ou falha passageira (%s): mostra a mensagem do backend', async (code, mensagem) => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockRejectedValueOnce(erroHttp(code === 'indisponivel' ? 503 : 403, code, mensagem))
    abrir()
    await screen.findByRole('button', { name: 'Permitir' })
    digitarSenha()
    fireEvent.click(screen.getByRole('button', { name: 'Permitir' }))
    expect(await screen.findByText(mensagem)).toBeInTheDocument()
  })

  it('workspace sem o aplicativo liberado: mostra o motivo e só deixa recusar', async () => {
    api.detalhar.mockResolvedValue(pedido({ politica: { liberado: false, motivo: 'O administrador deste workspace ainda não liberou aplicativos de IA externos.', nivelMaximo: 'leitura' } }))
    abrir()
    expect(await screen.findByText(/ainda não liberou aplicativos de IA externos/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Permitir' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeEnabled()
  })

  it('pedido indisponível (texto neutro, com a conta), aplicativo não aprovado e sem pedido na URL', async () => {
    api.detalhar.mockRejectedValueOnce(erroHttp(404, 'pedido_expirado'))
    const um = abrir()
    expect(await screen.findByText('Este pedido de conexão não está mais disponível')).toBeInTheDocument()
    expect(screen.getByText(/pode ter sido concluído, vencido ou ser de outra conta/)).toBeInTheDocument()
    expect(screen.getByText('ana@empresa.test')).toBeInTheDocument()
    um.unmount()

    api.detalhar.mockRejectedValueOnce(erroHttp(403, 'cliente_nao_aprovado'))
    const dois = abrir()
    expect(await screen.findByText('Aplicativo não aprovado')).toBeInTheDocument()
    dois.unmount()

    abrir('/oauth/authorize')
    expect(await screen.findByText('Pedido de conexão inválido')).toBeInTheDocument()
    expect(api.detalhar).toHaveBeenCalledTimes(2)
  })

  it('retorno que não é https: não navega (segunda trava contra javascript: e afins)', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ redirecionarPara: 'javascript:alert(1)' })
    abrir()
    await screen.findByRole('button', { name: 'Permitir' })
    digitarSenha()
    fireEvent.click(screen.getByRole('button', { name: 'Permitir' }))
    expect(await screen.findByText(/não é seguro/)).toBeInTheDocument()
    expect(assign).not.toHaveBeenCalled()
  })

  it('dentro de um iframe: não carrega o pedido nem mostra os botões', async () => {
    const topo = Object.getOwnPropertyDescriptor(window, 'top')
    Object.defineProperty(window, 'top', { configurable: true, value: {} })
    try {
      abrir()
      expect(await screen.findByText(/não abre dentro de outra página/)).toBeInTheDocument()
      expect(api.detalhar).not.toHaveBeenCalled()
      expect(screen.queryByRole('button', { name: 'Permitir' })).toBeNull()
    } finally {
      if (topo) Object.defineProperty(window, 'top', topo)
    }
  })
})
