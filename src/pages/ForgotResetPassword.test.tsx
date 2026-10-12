import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const post = vi.fn()
vi.mock('@/services/api', () => ({
  api: { post: (...a: unknown[]) => post(...a) },
  SKIP_AUTH_REFRESH: { _skipAuthRefresh: true },
}))

import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'

const digitar = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } })

describe('ForgotPasswordPage', () => {
  beforeEach(() => { post.mockReset() })

  it('envia o e-mail aparado para /auth/forgot-password e mostra a confirmação', async () => {
    post.mockResolvedValue({})
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)
    digitar(screen.getByPlaceholderText('seu@email.com'), ' a@b.co ')
    fireEvent.click(screen.getByRole('button', { name: /enviar link/i }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.co' }, expect.anything()))
    expect(await screen.findByRole('heading', { name: /e-mail enviado/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar ao login/i })).toHaveAttribute('href', '/login')
  })

  it('falha: Banner role=alert e campo inválido', async () => {
    post.mockRejectedValue(new Error('x'))
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)
    digitar(screen.getByPlaceholderText('seu@email.com'), 'a@b.co')
    fireEvent.click(screen.getByRole('button', { name: /enviar link/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao enviar o e-mail')
    expect(screen.getByPlaceholderText('seu@email.com')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('ResetPasswordPage', () => {
  beforeEach(() => { post.mockReset() })
  const renderReset = (url = '/reset-password?token=tok123') =>
    render(<MemoryRouter initialEntries={[url]}><ResetPasswordPage /></MemoryRouter>)

  it('senhas diferentes: alerta e nenhuma chamada', () => {
    renderReset()
    digitar(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'senha-longa-1')
    digitar(screen.getByPlaceholderText('Repita a nova senha'), 'senha-longa-2')
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não coincidem')
    expect(post).not.toHaveBeenCalled()
  })

  it('sucesso: envia token + senha e mostra "Senha redefinida"', async () => {
    post.mockResolvedValue({})
    renderReset()
    digitar(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'senha-longa-1')
    digitar(screen.getByPlaceholderText('Repita a nova senha'), 'senha-longa-1')
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/reset-password', { token: 'tok123', password: 'senha-longa-1' }, expect.anything()))
    expect(await screen.findByRole('heading', { name: /senha redefinida/i })).toBeInTheDocument()
  })

  it('cada campo de senha tem o seu olho focável', () => {
    renderReset()
    expect(screen.getAllByRole('button', { name: 'Mostrar senha' })).toHaveLength(2)
  })
})
