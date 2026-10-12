import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Contact, Conversation, Tag } from '@/types'
import {
  aplicarNaConversa, aplicarNaLista, aplicarNasEtiquetas, aplicarNoContato,
  avisarMudancaDeEtiqueta, useMudancaDeEtiqueta,
} from './etiquetasAoVivo'

// SCRUM-1253 (PO, 11/10): excluir uma etiqueta não a tirava do chat nem de
// Leads até o F5.
const vip = { id: 't1', name: 'VIP', color: '#f00' } as Tag
const frio = { id: 't2', name: 'Frio', color: '#00f' } as Tag
const contato = { id: 'c1', displayName: 'Ana', tags: [vip, frio] } as unknown as Contact
const conversa = { id: 'v1', tags: [vip], contact: contato } as unknown as Conversation

describe('etiquetasAoVivo', () => {
  it('excluída some das etiquetas da conversa e do contato dela', () => {
    const c = aplicarNaConversa(conversa, { tipo: 'excluida', id: 't1' })
    expect(c.tags).toEqual([])
    expect(c.contact.tags).toEqual([frio])
  })

  it('alterada troca nome/cor mantendo o resto', () => {
    const tags = aplicarNasEtiquetas([vip], { tipo: 'alterada', tag: { id: 't1', name: 'Cliente VIP' } })
    expect(tags).toEqual([{ ...vip, name: 'Cliente VIP' }])
  })

  it('sem mudança devolve a mesma referência (não re-renderiza à toa)', () => {
    const lista = [contato]
    expect(aplicarNaLista(lista, { tipo: 'excluida', id: 'outra' }, aplicarNoContato)).toBe(lista)
  })

  it('quem escuta recebe o aviso da própria aba', () => {
    const cb = vi.fn()
    renderHook(() => useMudancaDeEtiqueta(cb))
    act(() => avisarMudancaDeEtiqueta({ tipo: 'excluida', id: 't1' }))
    expect(cb).toHaveBeenCalledWith({ tipo: 'excluida', id: 't1' })
  })
})
