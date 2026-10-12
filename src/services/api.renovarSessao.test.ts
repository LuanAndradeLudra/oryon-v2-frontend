/**
 * O servidor troca a chave de renovação a cada uso: duas renovações em
 * paralelo fazem a segunda chegar com a chave já trocada, ser recusada e
 * deslogar a pessoa. A checagem da sessão ao abrir o app e o websocket
 * chamavam a renovação por fora da fila do interceptor (29/09).
 */
import { describe, it, expect, afterEach } from 'vitest'
import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { renovarSessao } from './api'

describe('renovarSessao · fila única', () => {
  const original = axios.defaults.adapter
  afterEach(() => { axios.defaults.adapter = original })

  it('pedidos simultâneos viram UMA chamada de /auth/refresh', async () => {
    let chamadas = 0
    let liberar: () => void = () => {}
    const segura = new Promise<void>((r) => { liberar = r })
    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
      if ((config.url ?? '').includes('/auth/refresh')) chamadas++
      await segura
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    axios.defaults.adapter = adapter

    const a = renovarSessao()
    const b = renovarSessao()
    const c = renovarSessao()
    liberar()
    expect(await Promise.all([a, b, c])).toEqual([true, true, true])
    expect(chamadas).toBe(1)
  })

  it('depois que uma termina, a próxima renovação chama de novo', async () => {
    let chamadas = 0
    axios.defaults.adapter = async (config) => {
      chamadas++
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    await renovarSessao()
    await renovarSessao()
    expect(chamadas).toBe(2)
  })
})
