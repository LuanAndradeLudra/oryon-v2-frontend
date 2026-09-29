import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tenantId: 't1', role: 'agent' } }) }))

import { AcoesDaRevisao, MSG_ADMIN_PRECISA_PUBLICAR, statusAoSalvar } from './AgentBuilderWizard'

describe('assistente antigo — D11 (só admin publica)', () => {
  it('quem não publica sempre salva como rascunho, mesmo pedindo "active"', () => {
    expect(statusAoSalvar('active', false)).toBe('draft')
    expect(statusAoSalvar('draft', false)).toBe('draft')
  })

  it('administrador publica quando pede', () => {
    expect(statusAoSalvar('active', true)).toBe('active')
    expect(statusAoSalvar('draft', true)).toBe('draft')
  })

  it('não-admin: sem botão "Publicar", com aviso e rascunho como ação principal', () => {
    const onPublish = vi.fn()
    render(<AcoesDaRevisao podePublicar={false} publishing={false} temPrompt onPublish={onPublish} />)
    expect(screen.queryByText('Publicar agente')).not.toBeInTheDocument()
    expect(screen.getByText(MSG_ADMIN_PRECISA_PUBLICAR)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Salvar como rascunho'))
    expect(onPublish).toHaveBeenCalledWith('draft')
  })

  it('admin: vê "Publicar agente" e publica como ativo', () => {
    const onPublish = vi.fn()
    render(<AcoesDaRevisao podePublicar publishing={false} temPrompt onPublish={onPublish} />)
    expect(screen.queryByText(MSG_ADMIN_PRECISA_PUBLICAR)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Publicar agente'))
    expect(onPublish).toHaveBeenCalledWith('active')
  })
})
