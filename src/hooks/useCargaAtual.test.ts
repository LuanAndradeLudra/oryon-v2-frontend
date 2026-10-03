// Revisão 03/10 — primitivas da causa 3: carga atrasada e cache de sessão.
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCargaAtual } from './useCargaAtual'
import { useConversationFromUrl } from './useConversationFromUrl'
import { aoSairDaSessao, limparSessao } from '@/lib/limpezaDaSessao'
import type { Conversation } from '@/types'

describe('useCargaAtual', () => {
  it('vale() cai quando a chave muda ou quando outra carga começa', () => {
    const { result, rerender } = renderHook(({ k }) => useCargaAtual(k), { initialProps: { k: 'A' } })
    const vA = result.current()
    expect(vA()).toBe(true)
    const vA2 = result.current()
    expect(vA()).toBe(false) // carga mais nova começou
    rerender({ k: 'B' })
    expect(vA2()).toBe(false) // trocou de registro
    expect(result.current()()).toBe(true)
  })
})

describe('limpezaDaSessao', () => {
  it('roda todas as limpezas registradas, mesmo se uma falhar', () => {
    const a = vi.fn(() => { throw new Error('x') })
    const b = vi.fn()
    aoSairDaSessao(a); aoSairDaSessao(b)
    limparSessao()
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })
})

describe('useConversationFromUrl · busca por id atrasada', () => {
  it('não abre X se o usuário já foi para Y antes de a busca voltar', async () => {
    const soltar: Record<string, (c: Conversation) => void> = {}
    const onFetched = vi.fn()
    const base = { conversations: [] as Conversation[], loading: false, activeId: null, onFoundInList: vi.fn(), onFetched,
      fetchById: vi.fn((id: string) => new Promise<Conversation>((r) => { soltar[id] = r })) }
    const { rerender } = renderHook((p: { urlId: string | null }) => useConversationFromUrl({ ...base, ...p }), { initialProps: { urlId: 'X' } })
    rerender({ urlId: 'Y' })
    await act(async () => { soltar.X({ id: 'X' } as Conversation) })
    expect(onFetched).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'X' }))
  })
})
