import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const auth = vi.hoisted(() => ({ isAuthenticated: false, requiresPasswordChange: false }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }))

import { RequireGuest } from './RequireGuest'

function Arvore() {
  return (
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<RequireGuest><p>tela de login</p></RequireGuest>} />
        <Route path="/home" element={<p>plataforma</p>} />
        <Route path="/set-password" element={<p>trocar senha</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireGuest', () => {
  beforeEach(() => {
    auth.isAuthenticated = false
    auth.requiresPasswordChange = false
  })

  it('quem chega ao /login já logado vai para a plataforma', () => {
    auth.isAuthenticated = true
    render(<Arvore />)
    expect(screen.getByText('plataforma')).toBeInTheDocument()
  })

  it('quem chega logado e precisa trocar a senha vai para a troca', () => {
    auth.isAuthenticated = true
    auth.requiresPasswordChange = true
    render(<Arvore />)
    expect(screen.getByText('trocar senha')).toBeInTheDocument()
  })

  // ORY-94 (correção de 23/11): o login feito nesta tela não é desviado para /home — a tela de
  // login leva ao destino (o consentimento do OAuth). Antes, a cópia do /login que fica na tela
  // durante a transição mandava para /home por cima.
  it('quem entra nesta tela continua nela até o login levar ao destino (sem desvio para /home)', () => {
    const { rerender } = render(<Arvore />)
    expect(screen.getByText('tela de login')).toBeInTheDocument()
    auth.isAuthenticated = true
    rerender(<Arvore />)
    expect(screen.queryByText('plataforma')).toBeNull()
    expect(screen.getByText('tela de login')).toBeInTheDocument()
  })
})
