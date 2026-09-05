import { describe, expect, it } from 'vitest'
import { withFallback } from './withFallback'

function httpError(status: number, message = 'erro') {
  return Object.assign(new Error(message), { status })
}

function axiosLikeError(status: number, message = 'erro') {
  return Object.assign(new Error(message), { response: { status } })
}

describe('withFallback', () => {
  it('retorna o dado real com available:true quando a chamada resolve', async () => {
    const result = await withFallback(async () => 'ok', 'fallback')
    expect(result).toEqual({ data: 'ok', available: true })
  })

  it('cai no fallback em 404 — endpoint ainda não existe', async () => {
    const result = await withFallback(async () => {
      throw httpError(404)
    }, 'fallback')
    expect(result).toEqual({ data: 'fallback', available: false })
  })

  it('cai no fallback em 501 — feature desligada no backend', async () => {
    const result = await withFallback(async () => {
      throw axiosLikeError(501)
    }, 'fallback')
    expect(result).toEqual({ data: 'fallback', available: false })
  })

  it.each([401, 403, 500])('propaga o erro em vez de engolir (status %i)', async (status) => {
    await expect(
      withFallback(async () => {
        throw httpError(status)
      }, 'fallback'),
    ).rejects.toThrow()
  })

  it('propaga erros sem status (ex.: falha de rede)', async () => {
    await expect(
      withFallback(async () => {
        throw new Error('network down')
      }, 'fallback'),
    ).rejects.toThrow('network down')
  })
})
