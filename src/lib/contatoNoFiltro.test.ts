import { describe, it, expect } from 'vitest'
import { contatoAtendeFiltros } from './contatoNoFiltro'
import type { Contact } from '@/types'

const base = {
  id: 'c1', tenantId: 't', waId: '5547999990000', displayName: 'Ana Souza',
  createdAt: '2026-10-01T00:00:00Z', stage: 'novo', intent: 'unknown', source: 'manual',
  tags: [{ id: 'vip', name: 'VIP' }], leadScore: 30,
} as unknown as Contact

describe('contatoAtendeFiltros', () => {
  it('sem filtro, atende', () => {
    expect(contatoAtendeFiltros(base, {})).toBe(true)
  })
  it('aba Quentes (intenção alta) com contato que não é quente: fora', () => {
    expect(contatoAtendeFiltros(base, { intent: 'high' })).toBe(false)
  })
  it('busca por nome, e-mail ou telefone', () => {
    expect(contatoAtendeFiltros(base, { search: 'ana' })).toBe(true)
    expect(contatoAtendeFiltros(base, { search: '99999' })).toBe(true)
    expect(contatoAtendeFiltros(base, { search: 'bruno' })).toBe(false)
  })
  it('situação, etiqueta e faixa de score', () => {
    expect(contatoAtendeFiltros(base, { stage: ['novo'] as Contact['stage'][] as never })).toBe(true)
    expect(contatoAtendeFiltros(base, { tagId: ['outra'] })).toBe(false)
    expect(contatoAtendeFiltros(base, { leadScoreBand: 'low' })).toBe(true)
    expect(contatoAtendeFiltros(base, { leadScoreBand: 'high' })).toBe(false)
  })
  it('sem último contato: atende "nunca", não atende "7 dias"', () => {
    expect(contatoAtendeFiltros(base, { lastContact: 'none' })).toBe(true)
    expect(contatoAtendeFiltros(base, { lastContact: '7d' })).toBe(false)
  })
  it('filtro que não dá para conferir aqui: não afirma nada', () => {
    expect(contatoAtendeFiltros(base, { sentiment: 'positive' as never })).toBeNull()
    expect(contatoAtendeFiltros(base, {}, { commercial: 'customer' })).toBeNull()
  })
  it('falha conhecida vence a dúvida', () => {
    expect(contatoAtendeFiltros(base, { intent: 'high' }, { commercial: 'customer' })).toBe(false)
  })
})
