// Revisão final 04/10: tela desligada por flag, ou fora do papel, não abre
// pela URL — vai para a Home em vez de mostrar erro.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const quem = vi.hoisted(() => ({ role: 'admin' }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: quem.role, email: 'x@empresa.example' }, featureFlags: [] }) }))
vi.mock('./NavegarSePresente', async () => {
  const { Navigate } = await import('react-router-dom')
  return { NavegarSePresente: (p: { to: string; replace?: boolean }) => <Navigate to={p.to} replace={p.replace} /> }
})

import { RotaPorPapel } from './RotaPorPapel'

const abrir = (rota: string) => render(
  <MemoryRouter initialEntries={[rota]}>
    <Routes>
      <Route path="/home" element={<p>Home</p>} />
      <Route path={rota} element={<RotaPorPapel><p>Tela</p></RotaPorPapel>} />
    </Routes>
  </MemoryRouter>,
)

beforeEach(() => { quem.role = 'admin' })

describe('RotaPorPapel', () => {
  it('Marketing com a flag desligada vai para a Home', () => {
    abrir('/marketing')
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
  it('Disparos: atendente vai para a Home; admin abre', () => {
    quem.role = 'agent'
    abrir('/campaigns')
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
  it('admin abre Disparos', () => {
    abrir('/campaigns')
    expect(screen.getByText('Tela')).toBeInTheDocument()
  })
})
