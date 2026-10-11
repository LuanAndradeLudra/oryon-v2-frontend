import { describe, it, expect } from 'vitest'
import { ordenarMinhas } from './ordenarMinhas'
import type { Conversation } from '@/types'

const c = (id: string, status: Conversation['status'], min: number) =>
  ({ id, status, lastMessageAt: new Date(Date.UTC(2026, 9, 11, 10, min)).toISOString() }) as Conversation

describe('ordenarMinhas (revisão 11/10)', () => {
  it('1ª carga: pendentes primeiro (a mais antiga no topo), o resto na ordem do servidor', () => {
    const lista = [c('a', 'open', 9), c('b', 'pending', 8), c('d', 'open', 7), c('e', 'pending', 5)]
    expect(ordenarMinhas(lista, new Set(['a', 'b', 'd', 'e'])).map((x) => x.id)).toEqual(['e', 'b', 'a', 'd'])
  })

  it('página 2 anexada: o que já estava na tela não muda de lugar; a pendente da página 2 fica onde chegou', () => {
    const pagina1 = [c('a', 'open', 9), c('b', 'pending', 8)]
    const ids = new Set(pagina1.map((x) => x.id))
    const antes = ordenarMinhas(pagina1, ids).map((x) => x.id)
    const depois = ordenarMinhas([...pagina1, c('p2-open', 'open', 3), c('p2-pend', 'pending', 1)], ids).map((x) => x.id)
    expect(depois.slice(0, antes.length)).toEqual(antes)
    expect(depois).toEqual(['b', 'a', 'p2-open', 'p2-pend'])
  })

  it('linha que o socket pôs na frente entra na ordenação da cabeça', () => {
    const ids = new Set(['a', 'b'])
    const lista = [c('nova', 'pending', 0), c('a', 'open', 9), c('b', 'pending', 8), c('p2', 'pending', 1)]
    expect(ordenarMinhas(lista, ids).map((x) => x.id)).toEqual(['nova', 'b', 'a', 'p2'])
  })
})
