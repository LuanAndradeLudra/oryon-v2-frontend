import { describe, it, expect } from 'vitest'
import { formatActivity } from './activityFormatter'

/** SCRUM-1216 (revisão D) — ações da API pública no feed de atividade, em português. */
describe('formatActivity — API pública v1', () => {
  it('criação e revogação de chave', () => {
    expect(formatActivity({ action: 'api_key_created', subject: 'n8n' })).toBe('Chave de API "n8n" criada')
    expect(formatActivity({ action: 'api_key_revoked', subject: 'n8n' })).toBe('Chave de API "n8n" revogada')
  })

  it('escrita pela API com rota e, se houver, o erro', () => {
    expect(formatActivity({
      action: 'public_api_write', subject: 'POST /api/v1/contacts',
      details: { method: 'POST', route: '/api/v1/contacts', status: 201 },
    })).toBe('Escrita pela API — POST /api/v1/contacts')
    expect(formatActivity({
      action: 'public_api_write', subject: '',
      details: { method: 'PATCH', route: '/api/v1/deals/:id', status: 422 },
    })).toBe('Escrita pela API — PATCH /api/v1/deals/:id (erro 422)')
  })

  it('negação com o motivo traduzido (nunca o código cru)', () => {
    const txt = formatActivity({
      action: 'public_api_denied', subject: '',
      details: { code: 'insufficient_scope', method: 'POST', route: '/api/v1/deals' },
    })
    expect(txt).toBe('Chamada à API recusada — POST /api/v1/deals (chave sem permissão)')
    expect(formatActivity({ action: 'public_api_denied', subject: '', details: { code: 'auth_blocked' } }))
      .toBe('Chamada à API recusada (muitas chaves inválidas do mesmo IP)')
    expect(formatActivity({ action: 'public_api_denied', subject: '', details: { code: 'subscription_suspended' } }))
      .toBe('Chamada à API recusada (assinatura suspensa)')
  })
})
