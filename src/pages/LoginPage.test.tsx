import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const login = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ login }) }))

// SSO: por padrão lista vazia (produção hoje); um teste troca por um provedor.
const ssoState = vi.hoisted(() => ({ providers: [] as Array<{ id: string; label: string; href: string }> }))
vi.mock('@/components/auth/ssoProviders', () => ({
  get SSO_PROVIDERS() { return ssoState.providers },
}))

import { LoginPage } from './LoginPage'

const digitar = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } })
const emailInput = () => screen.getByPlaceholderText('seu@email.com')
const senhaInput = () => screen.getByPlaceholderText('••••••••')

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/conversations" element={<div>conversas</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset()
    ssoState.providers = []
  })

  it('mostra o formulário e NÃO oferece "Criar conta"', () => {
    renderLogin()
    expect(screen.getByRole('heading', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /esqueceu a senha/i })).toHaveAttribute('href', '/forgot-password')
    expect(screen.queryByText(/criar conta/i)).toBeNull()
  })

  it('sem provedores SSO não renderiza divisor nem botão morto', () => {
    renderLogin()
    expect(screen.queryByText('ou')).toBeNull()
    expect(screen.queryByRole('separator')).toBeNull()
  })

  it('com provedor SSO, divisor "ou" + botão aparecem depois do formulário', () => {
    ssoState.providers = [{ id: 'google', label: 'Continuar com Google', href: '/auth/oauth/google' }]
    renderLogin()
    expect(screen.getByText('ou')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar com Google' })).toBeInTheDocument()
  })

  it('o olho é um botão focável, alterna a senha e usa aria-pressed', () => {
    renderLogin()
    const olho = screen.getByRole('button', { name: 'Mostrar senha' })
    expect(olho.tagName).toBe('BUTTON')
    expect(olho).not.toHaveAttribute('tabindex', '-1') // o antigo tinha tabIndex=-1
    olho.focus()
    expect(olho).toHaveFocus()
    expect(senhaInput()).toHaveAttribute('type', 'password')
    expect(olho).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(olho)
    expect(senhaInput()).toHaveAttribute('type', 'text')
    expect(olho).toHaveAttribute('aria-pressed', 'true')
  })

  it('401: Banner com role=alert e os dois campos inválidos', async () => {
    login.mockRejectedValue({ response: { status: 401, data: { message: 'Credenciais inválidas' } } })
    renderLogin()
    digitar(emailInput(), 'a@b.co')
    digitar(senhaInput(), 'errada123')
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Credenciais inválidas')
    expect(emailInput()).toHaveAttribute('aria-invalid', 'true')
    expect(senhaInput()).toHaveAttribute('aria-invalid', 'true')
  })

  it('sem resposta do servidor (rede/bloqueio): diz que não conectou, não "senha inválida"', async () => {
    login.mockRejectedValue(new Error('Network Error'))
    renderLogin()
    digitar(emailInput(), 'a@b.co')
    digitar(senhaInput(), 'certa123')
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível conectar ao servidor')
    expect(alerta).not.toHaveTextContent(/inválid/i)
  })

  it('sucesso: chama login com o e-mail aparado e navega para /conversations', async () => {
    login.mockResolvedValue(undefined)
    renderLogin()
    digitar(emailInput(), '  a@b.co ')
    digitar(senhaInput(), 'senha-certa')
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(login).toHaveBeenCalledWith('a@b.co', 'senha-certa'))
    expect(await screen.findByText('conversas')).toBeInTheDocument()
  })

  it('ORY-96: volta para onde a pessoa ia, com a query (ex.: o pedido de conexão OAuth)', async () => {
    login.mockResolvedValue(undefined)
    const Onde = () => {
      const l = useLocation()
      return <div>{`${l.pathname}${l.search}`}</div>
    }
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/oauth/authorize', search: '?pedido=abc' } } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/authorize" element={<Onde />} />
        </Routes>
      </MemoryRouter>,
    )
    digitar(emailInput(), 'a@b.co')
    digitar(senhaInput(), 'senha-certa')
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByText('/oauth/authorize?pedido=abc')).toBeInTheDocument()
  })

  // ORY-94 (decisão do João, 23/11): o login que vem de uma conexão explica o motivo e manda o
  // pedido (a senha digitada aqui vale no consentimento dele).
  it('ORY-94: vindo de um pedido de conexão, explica o motivo e manda o id do pedido no login', async () => {
    login.mockResolvedValue(undefined)
    const PEDIDO = 'a'.repeat(43)
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/oauth/authorize', search: `?pedido=${PEDIDO}` } } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/authorize" element={<div>consentimento</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Para conectar um aplicativo de IA à sua conta Oryon')).toBeInTheDocument()
    expect(screen.getByText(/Nada é liberado sem você clicar em Permitir/)).toBeInTheDocument()
    digitar(emailInput(), 'a@b.co')
    digitar(senhaInput(), 'senha-certa')
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(login).toHaveBeenCalledWith('a@b.co', 'senha-certa', { oauthPedido: PEDIDO }))
    expect(await screen.findByText('consentimento')).toBeInTheDocument()
  })

  it('ORY-94: vindo de uma aprovação, explica o motivo e não manda pedido de conexão', async () => {
    login.mockResolvedValue(undefined)
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/oauth/aprovar/abc' } } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/aprovar/:id" element={<div>aprovação</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Para ver e aprovar uma ação pedida por um aplicativo de IA')).toBeInTheDocument()
    digitar(emailInput(), 'a@b.co')
    digitar(senhaInput(), 'senha-certa')
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(login).toHaveBeenCalledWith('a@b.co', 'senha-certa'))
  })

  it('login comum: sem aviso de aplicativo de IA', () => {
    renderLogin()
    expect(screen.getByText('Acesse sua conta')).toBeInTheDocument()
    expect(screen.queryByText(/aplicativo de IA/)).toBeNull()
  })

  it('botão Entrar desabilitado até preencher e-mail e senha', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeDisabled()
  })

  it('lg+: painel de marca com a frase-âncora e o palco em lazy; o título "Entrar" continua único', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: true, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as typeof window.matchMedia
    try {
      renderLogin()
      const painel = document.querySelector('aside') as HTMLElement
      expect(within(painel).getByText('Conversas que')).toBeInTheDocument()
      expect(within(painel).getByText('convertem.')).toBeInTheDocument()
      // A frase-âncora não pode casar com /entrar/ (o smoke usa getByRole('heading', /entrar/)).
      expect(screen.getAllByRole('heading', { name: /entrar/i })).toHaveLength(1)
      // O palco é estático e decorativo: fica escondido da árvore de acessibilidade.
      await waitFor(() => expect(document.querySelector('aside [aria-hidden="true"]')).not.toBeNull())
    } finally {
      window.matchMedia = original
    }
  })
})
