/**
 * 401 de negócio (senha atual errada em Minha conta) não pode derrubar a
 * sessão. Antes: o 401 disparava o refresh, a repetição voltava 401 com
 * `_retry` e o interceptor chamava clearSessionAndRedirect() — o admin que
 * errava a senha atual ia parar em /login.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { api, UNAUTHORIZED_IS_BUSINESS } from './api'

const SESSION_KEY = 'oryon:session'

function responder(status: (url: string) => number): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? ''
    const s = status(url)
    const response = { data: {}, status: s, statusText: String(s), headers: {}, config }
    if (s >= 400) throw new AxiosError('fail', String(s), config, null, response)
    return response
  }
}

describe('interceptor de sessão · 401 de negócio', () => {
  const adapterApi = api.defaults.adapter
  const adapterAxios = axios.defaults.adapter

  beforeEach(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: { id: 'u1' } }))
  })
  afterEach(() => {
    api.defaults.adapter = adapterApi
    axios.defaults.adapter = adapterAxios
    localStorage.clear()
  })

  it('senha atual errada: rejeita com 401 e mantém a sessão', async () => {
    // A renovação dá certo (sessão viva); o PATCH segue recusando.
    axios.defaults.adapter = responder((url) => (url.includes('/auth/refresh') ? 200 : 401))
    api.defaults.adapter = responder(() => 401)

    await expect(api.patch('/settings/password', {}, { ...UNAUTHORIZED_IS_BUSINESS }))
      .rejects.toMatchObject({ response: { status: 401 } })
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull()
  })

  it('sessão vencida de verdade (refresh falha): continua indo para o login', async () => {
    axios.defaults.adapter = responder(() => 401)
    api.defaults.adapter = responder(() => 401)

    await expect(api.patch('/settings/password', {}, { ...UNAUTHORIZED_IS_BUSINESS })).rejects.toBeTruthy()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('sem a marca, o comportamento antigo segue igual (repetição 401 = sessão morta)', async () => {
    axios.defaults.adapter = responder((url) => (url.includes('/auth/refresh') ? 200 : 401))
    api.defaults.adapter = responder(() => 401)

    await expect(api.get('/qualquer')).rejects.toBeTruthy()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })
})
