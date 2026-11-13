import { describe, it, expect } from 'vitest'
import { formatActivity } from './activityFormatter'

/** SCRUM-1216 (revisão D) — ações da API pública no feed de atividade, em português. */
describe('formatActivity — API pública v1', () => {
  it('criação e revogação de chave', () => {
    expect(formatActivity({ action: 'api_key_created', subject: 'n8n' })).toBe('Chave de API "n8n" criada')
    expect(formatActivity({ action: 'api_key_revoked', subject: 'n8n' })).toBe('Chave de API "n8n" revogada')
    expect(formatActivity({ action: 'api_key_rotated', subject: 'n8n' })).toBe('Chave de API "n8n" trocada')
    expect(formatActivity({ action: 'api_key_rotation_undone', subject: 'n8n' })).toBe('Troca da chave de API "n8n" desfeita')
  })

  it('pico de leituras em português', () => {
    expect(formatActivity({ action: 'public_api_read_spike', subject: 'leituras da API v1' }))
      .toBe('Leituras pela API muito acima do normal')
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

  it('recusa por assinatura traduz cada status do backend (B2: subscription_<status>)', () => {
    const recusa = (code: string) => formatActivity({ action: 'public_api_denied', subject: '', details: { code } })
    expect(recusa('subscription_paused')).toBe('Chamada à API recusada (assinatura pausada)')
    expect(recusa('subscription_canceled')).toBe('Chamada à API recusada (assinatura cancelada)')
    // Status novo que a tela ainda não conhece: frase genérica, nunca o código cru.
    expect(recusa('subscription_ended')).toBe('Chamada à API recusada (assinatura inativa)')
    expect(recusa('codigo_desconhecido')).toBe('Chamada à API recusada')
  })
})

describe('formatActivity — status da conversa em português (auditoria 12/11)', () => {
  it('resolvida, arquivada (por inatividade) e os demais status traduzidos', () => {
    expect(formatActivity({ action: 'conversation_status_updated', subject: 'Ana', details: { to: 'resolved' } })).toBe('Conversa de Ana resolvida')
    expect(formatActivity({ action: 'conversation_status_updated', subject: 'Ana', details: { to: 'abandoned', motivo: 'inatividade' } }))
      .toBe('Conversa de Ana arquivada por inatividade')
    expect(formatActivity({ action: 'conversation_status_updated', subject: 'Ana', details: { status: 'pending' } })).toBe('Status da conversa de Ana alterado para pendente')
    expect(formatActivity({ action: 'conversation_status_updated', subject: 'Ana', details: {} })).toBe('Status da conversa de Ana alterado')
  })
})
