/**
 * ORY-96: a decisão do consentimento OAuth leva a senha (`senha`) e o token CSRF do pedido.
 * A auditoria de ações do cliente grava o corpo de toda escrita — esses dois campos saem
 * escondidos, nunca em claro.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { api } from './api'
import { appLogger } from './appLogger'

describe('auditoria do cliente · decisão do OAuth', () => {
  const adapterOriginal = api.defaults.adapter
  afterEach(() => {
    api.defaults.adapter = adapterOriginal
    vi.restoreAllMocks()
  })

  it('senha e csrf vão como [REDACTED] para o log de ações', async () => {
    const espiao = vi.spyOn(appLogger, 'logUserAction').mockImplementation(() => undefined)
    const responder: AxiosAdapter = async (config: InternalAxiosRequestConfig) => ({
      data: { redirecionarPara: 'https://claude.ai/cb?code=x' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })
    api.defaults.adapter = responder
    await api.post('/oauth/pedidos/p1/decisao', { csrf: 'csrf-secreto', aprovar: true, nivel: 'leitura', senha: 'minha-senha' })
    const chamadas = JSON.stringify(espiao.mock.calls)
    expect(chamadas).not.toContain('minha-senha')
    expect(chamadas).not.toContain('csrf-secreto')
    expect(chamadas).toContain('[REDACTED]')
  })
})
