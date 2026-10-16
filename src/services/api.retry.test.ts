// SCRUM-1161 (15/10): o interceptor de repetição zerava `x-retry-count` a cada
// tentativa (o limite nunca chegava) e repetia POST — um 502/504 depois de a
// mensagem já ter ido para o WhatsApp duplicava o envio.
import { describe, it, expect, afterEach } from 'vitest'
import type { AxiosAdapter } from 'axios'
import { AxiosError } from 'axios'
import { api, deveRepetirRequisicao } from './api'

const adapterOriginal = api.defaults.adapter

function falharSempre(status: number) {
  const chamadas: Array<{ retry: string }> = []
  const adapter: AxiosAdapter = async (config) => {
    chamadas.push({ retry: String(config.headers['x-retry-count']) })
    throw new AxiosError('falha', String(status), config, null, {
      status, statusText: '', headers: {}, config, data: {},
    })
  }
  api.defaults.adapter = adapter
  return chamadas
}

afterEach(() => { api.defaults.adapter = adapterOriginal })

describe('repetição de requisições', () => {
  it('GET com 503: 1 tentativa + 2 repetições, e para', async () => {
    const chamadas = falharSempre(503)
    await expect(api.get('/qualquer')).rejects.toBeTruthy()
    expect(chamadas).toHaveLength(3)
    expect(chamadas.map((c) => c.retry)).toEqual(['0', '1', '2'])
  })

  it('POST com 504 (pode já ter sido processado): não repete', async () => {
    const chamadas = falharSempre(504)
    await expect(api.post('/conversations/c1/messages', { body: 'oi' })).rejects.toBeTruthy()
    expect(chamadas).toHaveLength(1)
  })

  it('POST com 429 (recusado antes de processar): repete até o limite', async () => {
    const chamadas = falharSempre(429)
    await expect(api.post('/conversations/c1/messages', { body: 'oi' })).rejects.toBeTruthy()
    expect(chamadas).toHaveLength(3)
  })

  it('regra pura', () => {
    expect(deveRepetirRequisicao('get', 502, undefined, 0)).toBe(true)
    expect(deveRepetirRequisicao('get', undefined, 'ECONNRESET', 1)).toBe(true)
    expect(deveRepetirRequisicao('get', 502, undefined, 2)).toBe(false)
    expect(deveRepetirRequisicao('get', 500, undefined, 0)).toBe(false)
    expect(deveRepetirRequisicao('post', 503, undefined, 0)).toBe(false)
    expect(deveRepetirRequisicao('patch', undefined, 'ECONNRESET', 0)).toBe(false)
    expect(deveRepetirRequisicao('delete', 429, undefined, 0)).toBe(true)
  })
})
