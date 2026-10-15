import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  atividadeRecente, falhaQueImporta, limparAtividadeRecente, mascararNoNavegador, registrarErroDaPagina, registrarFalhaDeRede,
  registrarTela, rotaSemDados,
} from './atividadeRecente'
import { sugestaoDaAtividade } from '@/components/support/contextoTecnico'

/** SCRUM-1390 — o que o navegador guarda (só em memória, 15 min) para o chamado. */

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-15T10:00:00Z'))
  limparAtividadeRecente()
})
afterEach(() => vi.useRealTimers())

describe('sem dado pessoal', () => {
  it('rota sem query nem ids', () => {
    expect(rotaSemDados('/contacts/3f2b1c4d-1111-4222-8333-123456789abc/notes?q=Maria&tel=2199')).toBe('/contacts/:id/notes')
    expect(rotaSemDados('http://localhost:3100/api/invoices/123456?x=1#y')).toBe('/api/invoices/:id')
    expect(rotaSemDados('/reports')).toBe('/reports')
  })

  it('máscara simples na mensagem do erro', () => {
    expect(mascararNoNavegador('falhou para maria@clinica.com.br, CPF 123.456.789-09, tel (21) 99876-5432'))
      .toBe('falhou para [e-mail], CPF [cpf], tel [número]')
  })

  it('só falhas que importam: 5xx, sem resposta, 408, 429 (403 é negativa esperada)', () => {
    expect([500, 503, null, 408, 429].every(falhaQueImporta)).toBe(true)
    expect([400, 401, 403, 404, 409, 422].some(falhaQueImporta)).toBe(false)
  })
})

describe('memória de 15 minutos', () => {
  it('guarda falhas com a tela da hora; descarta o que passou de 15 min; tem teto', () => {
    registrarTela('/reports?de=2026', 'Relatórios')
    registrarFalhaDeRede({ metodo: 'get', url: '/api/reports?busca=Maria', status: 500, requestId: 'c0ffee00-0000-4000-8000-000000000001' })
    expect(atividadeRecente().falhas).toEqual([
      { em: '2026-10-15T10:00:00.000Z', tela: 'Relatórios', metodo: 'GET', rota: '/api/reports', status: 500, requestId: 'c0ffee00-0000-4000-8000-000000000001' },
    ])
    vi.setSystemTime(new Date('2026-10-15T10:16:00Z'))
    expect(atividadeRecente().falhas).toEqual([])
    for (let i = 0; i < 30; i++) registrarFalhaDeRede({ metodo: 'post', url: '/api/x', status: 502, requestId: null })
    expect(atividadeRecente().falhas).toHaveLength(20)
  })

  it('requestId que não é UUID não vai; tela repetida não conta; erro da página vai curto e mascarado', () => {
    registrarTela('/home', 'Início')
    registrarTela('/home', 'Início')
    registrarTela('/reports', 'Relatórios')
    expect(atividadeRecente().telas.map((t) => t.tela)).toEqual(['Início', 'Relatórios'])
    registrarFalhaDeRede({ metodo: 'get', url: '/api/x', status: null, requestId: 'injetado"><script>' })
    expect(atividadeRecente().falhas[0].requestId).toBeNull()
    registrarErroDaPagina('TypeError', `x is undefined para joao@x.com\n    at stack (file.js:1)`)
    expect(atividadeRecente().erros[0]).toMatchObject({ tela: 'Relatórios', tipo: 'TypeError', mensagem: 'x is undefined para [e-mail]' })
  })
})

describe('a sugestão do formulário', () => {
  it('a falha mais recente NESTA tela; e quanto mais há', () => {
    registrarTela('/pipelines', 'Funis')
    registrarFalhaDeRede({ metodo: 'get', url: '/api/pipelines', status: 502, requestId: null })
    registrarTela('/reports', 'Relatórios')
    vi.setSystemTime(new Date('2026-10-15T10:12:00Z'))
    registrarFalhaDeRede({ metodo: 'get', url: '/api/reports', status: 500, requestId: null })
    registrarErroDaPagina('TypeError', 'boom')
    const s = sugestaoDaAtividade(atividadeRecente(), 'Relatórios')!
    expect(s.principal).toMatch(/^nesta tela: Relatórios não carregou \(erro 500 às \d{2}:12\)$/)
    expect(s.mais).toBe('E mais: 1 outra(s) falha(s) de rede e 1 erro(s) na página nos últimos 15 min.')
  })

  it('sem falha nesta tela: a de outra; sem nada: nenhuma sugestão', () => {
    expect(sugestaoDaAtividade(atividadeRecente(), 'Funis')).toBeNull()
    registrarTela('/reports', 'Relatórios')
    registrarFalhaDeRede({ metodo: 'get', url: '/api/reports', status: null, requestId: null })
    expect(sugestaoDaAtividade(atividadeRecente(), 'Funis')!.principal).toMatch(/^em outra tela: Relatórios não carregou \(sem resposta do servidor/)
  })
})
