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

import { OAuthAutorizarPage } from './OAuthAutorizarPage'

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
    precisaSenha: false,
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

describe('OAuthAutorizarPage — "Conectar à Oryon"', () => {
  beforeEach(() => {
    api.detalhar.mockReset()
    api.decidir.mockReset()
    assign.mockReset()
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } })
  })
  afterEach(() => vi.restoreAllMocks())

  it('mostra o aplicativo verificado, o workspace, para onde volta e "Só consultar" marcado', async () => {
    api.detalhar.mockResolvedValue(pedido())
    abrir()
    expect(await screen.findByRole('heading', { name: 'Claude quer acessar a sua conta Oryon' })).toBeInTheDocument()
    expect(screen.getByText(/claude\.ai · aplicativo aprovado pela Oryon/)).toBeInTheDocument()
    expect(screen.getByText('Empresa Teste')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Só consultar/ })).toBeChecked()
    expect(screen.getByRole('list', { name: /poderá acessar/ })).toHaveTextContent('Contatos · ver')
    expect(api.detalhar).toHaveBeenCalledWith('p1')
  })

  it('trocar para "Consultar e fazer alterações" mostra o que poderá alterar; permitir manda o nível e volta ao aplicativo', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ redirecionarPara: 'https://claude.ai/api/mcp/auth_callback?code=c&state=s&iss=i' })
    abrir()
    fireEvent.click(await screen.findByRole('radio', { name: /Consultar e fazer alterações/ }))
    expect(screen.getByRole('list', { name: /poderá acessar/ })).toHaveTextContent('Agentes de IA · ver e alterar')
    fireEvent.click(screen.getByRole('button', { name: 'Permitir' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?code=c&state=s&iss=i'))
    expect(api.decidir).toHaveBeenCalledWith('p1', { csrf: 'csrf-1', aprovar: true, nivel: 'escrita' })
    expect(await screen.findByText('Voltando para claude.ai…')).toBeInTheDocument()
  })

  it('recusar volta ao aplicativo sem nível nem senha', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ redirecionarPara: 'https://claude.ai/cb?error=access_denied' })
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
    await waitFor(() => expect(assign).toHaveBeenCalled())
    expect(api.decidir).toHaveBeenCalledWith('p1', { csrf: 'csrf-1', aprovar: false })
  })

  it('política só de consulta: a opção de alterar fica desabilitada e explica o porquê', async () => {
    api.detalhar.mockResolvedValue(pedido({ politica: { liberado: true, motivo: null, nivelMaximo: 'leitura' }, niveis: { ...pedido().niveis, escrita: { disponivel: false, grupos: [] } } }))
    abrir()
    expect(await screen.findByRole('radio', { name: /Consultar e fazer alterações/ })).toBeDisabled()
    expect(screen.getByText('O administrador deste workspace só liberou consultas.')).toBeInTheDocument()
  })

  it('pede a senha quando precisa; sem senha, "Permitir" fica desabilitado; senha errada avisa e limpa', async () => {
    api.detalhar.mockResolvedValue(pedido({ precisaSenha: true }))
    api.decidir.mockRejectedValueOnce(erroHttp(403, 'senha_incorreta'))
    abrir()
    const permitir = await screen.findByRole('button', { name: 'Permitir' })
    expect(permitir).toBeDisabled()
    const campo = screen.getByLabelText('Confirme a sua senha')
    fireEvent.change(campo, { target: { value: 'errada' } })
    fireEvent.click(permitir)
    expect(await screen.findByText('Senha incorreta.')).toBeInTheDocument()
    expect(campo).toHaveValue('')
    expect(api.decidir).toHaveBeenCalledWith('p1', { csrf: 'csrf-1', aprovar: true, nivel: 'leitura', senha: 'errada' })
  })

  it('o backend pede a senha mesmo sem o aviso prévio (confirmação venceu): o campo aparece', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockRejectedValueOnce(erroHttp(403, 'senha_necessaria'))
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Permitir' }))
    expect(await screen.findByLabelText('Confirme a sua senha')).toBeInTheDocument()
  })

  it('workspace sem o aplicativo liberado: mostra o motivo e só deixa recusar', async () => {
    api.detalhar.mockResolvedValue(pedido({ politica: { liberado: false, motivo: 'O administrador deste workspace ainda não liberou aplicativos de IA externos.', nivelMaximo: 'leitura' } }))
    abrir()
    expect(await screen.findByText(/ainda não liberou aplicativos de IA externos/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Permitir' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeEnabled()
  })

  it('pedido expirado, sem pedido na URL e aplicativo não aprovado: telas de erro claras', async () => {
    api.detalhar.mockRejectedValueOnce(erroHttp(404, 'pedido_expirado'))
    const um = abrir()
    expect(await screen.findByText('Este pedido de conexão expirou')).toBeInTheDocument()
    um.unmount()

    abrir('/oauth/authorize')
    expect(await screen.findByText('Pedido de conexão inválido')).toBeInTheDocument()
    expect(api.detalhar).toHaveBeenCalledTimes(1)
  })

  it('retorno que não é https: não navega (segunda trava contra javascript: e afins)', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ redirecionarPara: 'javascript:alert(1)' })
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Permitir' }))
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
