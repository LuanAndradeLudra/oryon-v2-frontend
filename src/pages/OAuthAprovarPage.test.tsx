import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { DetalheDaAprovacao } from '@/services/oauthApi'

const api = vi.hoisted(() => ({ detalhar: vi.fn(), decidir: vi.fn() }))
vi.mock('@/services/oauthApi', async (original) => ({
  ...(await original<typeof import('@/services/oauthApi')>()),
  detalharAprovacaoOAuth: api.detalhar,
  decidirAprovacaoOAuth: api.decidir,
}))

import { OAuthAprovarPage } from './OAuthAprovarPage'

const ID = 'a'.repeat(43)
function pedido(extra: Partial<DetalheDaAprovacao> = {}): DetalheDaAprovacao {
  return {
    id: ID,
    csrf: 'csrf-a',
    cliente: 'Claude',
    acao: 'enviar o texto "Olá" a Ana P. (conversa 1a2b3c4d) #abc123',
    previa: 'conversation:\n  contact: {"name":"Ana P."}\ntext: Olá',
    status: 'pendente',
    criadoEm: new Date().toISOString(),
    expiraEm: new Date(Date.now() + 300_000).toISOString(),
    ...extra,
  }
}
const erroHttp = (status: number, code: string) => Object.assign(new Error(code), { response: { status, data: { error: { code, message: code } } } })

function abrir() {
  return render(
    <MemoryRouter initialEntries={[`/oauth/aprovar/${ID}`]}>
      <Routes>
        <Route path="/oauth/aprovar/:id" element={<OAuthAprovarPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OAuthAprovarPage — aprovar a ação de um aplicativo externo', () => {
  beforeEach(() => {
    api.detalhar.mockReset()
    api.decidir.mockReset()
  })

  it('mostra quem pede, a ação e os detalhes', async () => {
    api.detalhar.mockResolvedValue(pedido())
    abrir()
    expect(await screen.findByRole('heading', { name: 'Claude quer fazer uma ação em seu nome' })).toBeInTheDocument()
    expect(screen.getByText(/enviar o texto "Olá" a Ana P\./)).toBeInTheDocument()
    expect(screen.getByText(/contact: \{"name":"Ana P\."\}/)).toBeInTheDocument()
    expect(api.detalhar).toHaveBeenCalledWith(ID)
  })

  it('aprovar manda o CSRF e mostra que é para voltar ao aplicativo', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ status: 'aprovada' })
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByRole('heading', { name: 'Ação aprovada' })).toBeInTheDocument()
    expect(screen.getByText(/Volte ao Claude e diga que aprovou/)).toBeInTheDocument()
    expect(api.decidir).toHaveBeenCalledWith(ID, { csrf: 'csrf-a', aprovar: true })
  })

  it('recusar diz que nada foi feito', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ status: 'recusada' })
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
    expect(await screen.findByRole('heading', { name: 'Ação recusada' })).toBeInTheDocument()
    expect(screen.getByText(/Nada foi feito/)).toBeInTheDocument()
    expect(api.decidir).toHaveBeenCalledWith(ID, { csrf: 'csrf-a', aprovar: false })
  })

  it('pedido já decidido abre direto no resultado (sem botões)', async () => {
    api.detalhar.mockResolvedValue(pedido({ status: 'aprovada' }))
    abrir()
    expect(await screen.findByRole('heading', { name: 'Ação aprovada' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull()
  })

  it('expirado (ou de outra pessoa): tela de erro clara', async () => {
    api.detalhar.mockRejectedValue(erroHttp(404, 'aprovacao_expirada'))
    abrir()
    expect(await screen.findByText('Este pedido de aprovação expirou')).toBeInTheDocument()
  })

  it('decidido em outra aba enquanto esta estava aberta: avisa sem quebrar', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockRejectedValue(erroHttp(409, 'ja_decidido'))
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByText(/já foi decidido/)).toBeInTheDocument()
  })

  it('dentro de um iframe: não carrega nem mostra os botões', async () => {
    const topo = Object.getOwnPropertyDescriptor(window, 'top')
    Object.defineProperty(window, 'top', { configurable: true, value: {} })
    try {
      abrir()
      expect(await screen.findByText(/não abre dentro de outra página/)).toBeInTheDocument()
      expect(api.detalhar).not.toHaveBeenCalled()
      expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull()
    } finally {
      if (topo) Object.defineProperty(window, 'top', topo)
    }
  })
})
