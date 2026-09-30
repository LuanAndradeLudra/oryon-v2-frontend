import { describe, it, expect, vi, afterEach } from 'vitest'

// A rota passou a devolver truncated/warning (A9) e 422 no lugar de texto-placeholder (A8).

vi.mock('axios', () => ({ default: { get: vi.fn(async () => ({ data: { token: 't' } })) } }))
vi.mock('@/services/appLogger', () => ({ appLogger: {} }))

import { extractBrandFile, extractBrandFileDetailed } from './agentsApi'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

function respond(status: number, body: unknown) {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
}

describe('extractBrandFileDetailed', () => {
  it('repassa o corte e o aviso', async () => {
    respond(200, { data: { extractedText: 'parte', truncated: true, warning: 'lido só em parte' } })
    await expect(extractBrandFileDetailed('a.pdf', 'application/pdf', 'x', 'base64'))
      .resolves.toEqual({ text: 'parte', truncated: true, warning: 'lido só em parte' })
  })

  it('servidor antigo, sem os campos novos → truncated false', async () => {
    respond(200, { data: { extractedText: 'tudo' } })
    await expect(extractBrandFileDetailed('a.txt', 'text/plain', 'tudo', 'text'))
      .resolves.toEqual({ text: 'tudo', truncated: false, warning: undefined })
  })

  it('422 vira erro com a mensagem da rota', async () => {
    respond(422, { error: 'Formato de "a.xlsx" não suportado.' })
    await expect(extractBrandFileDetailed('a.xlsx', '', 'x', 'base64')).rejects.toThrow('não suportado')
  })
})

describe('extractBrandFile (compatível)', () => {
  it('continua devolvendo só o texto', async () => {
    respond(200, { data: { extractedText: 'tudo', truncated: false } })
    await expect(extractBrandFile('a.txt', 'text/plain', 'tudo', 'text')).resolves.toBe('tudo')
  })
})
