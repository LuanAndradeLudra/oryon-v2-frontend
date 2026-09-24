// `?id=` ↔ conversa aberta. O caso que importa (PO, 24/09): "Nova conversa" navega
// para /conversations?id=<id> estando JÁ na página — inclusive para uma conversa
// recém-criada que a lista ainda não tem.
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useConversationFromUrl } from './useConversationFromUrl'
import type { Conversation } from '@/types'

const conv = (id: string) => ({ id } as Conversation)

function setup(initial: Partial<Parameters<typeof useConversationFromUrl>[0]> = {}) {
  const onFoundInList = vi.fn()
  const onFetched = vi.fn()
  const fetchById = vi.fn(async (id: string) => conv(id))
  const props = { urlId: null as string | null, conversations: [] as Conversation[], loading: false, activeId: null as string | null, onFoundInList, onFetched, fetchById, ...initial }
  const hook = renderHook((p: typeof props) => useConversationFromUrl(p), { initialProps: props })
  return { hook, props, onFoundInList, onFetched, fetchById }
}

describe('useConversationFromUrl', () => {
  it('conversa da URL está na lista: seleciona sem buscar', () => {
    const { onFoundInList, fetchById } = setup({ urlId: 'a', conversations: [conv('a')] })
    expect(onFoundInList).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
    expect(fetchById).not.toHaveBeenCalled()
  })

  it('conversa recém-criada (fora da lista) com a página já carregada: busca por id', async () => {
    const { hook, props, onFetched, fetchById } = setup({ conversations: [conv('x')], activeId: 'x' })
    hook.rerender({ ...props, urlId: 'novo', activeId: 'x', conversations: [conv('x')] })
    await waitFor(() => expect(onFetched).toHaveBeenCalledWith(expect.objectContaining({ id: 'novo' })))
    expect(fetchById).toHaveBeenCalledWith('novo')
  })

  it('NÃO é só no mount: trocar o ?id= depois de já ter restaurado abre a nova conversa', () => {
    const { hook, props, onFoundInList } = setup({ urlId: 'a', conversations: [conv('a'), conv('b')] })
    hook.rerender({ ...props, urlId: 'a', activeId: 'a', conversations: [conv('a'), conv('b')] })
    hook.rerender({ ...props, urlId: 'b', activeId: 'a', conversations: [conv('a'), conv('b')] })
    expect(onFoundInList).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'b' }))
  })

  it('espera a carga inicial antes de buscar por id', async () => {
    const { hook, props, fetchById, onFetched } = setup({ urlId: 'z', loading: true })
    expect(fetchById).not.toHaveBeenCalled()
    hook.rerender({ ...props, urlId: 'z', loading: false })
    await waitFor(() => expect(onFetched).toHaveBeenCalled())
    expect(fetchById).toHaveBeenCalledTimes(1)
  })

  it('id inválido: uma tentativa só (sem loop) e sem estourar', async () => {
    const fetchById = vi.fn(async () => { throw new Error('404') })
    const { hook, props, onFetched } = setup({ urlId: 'ruim', fetchById })
    hook.rerender({ ...props, urlId: 'ruim', fetchById, conversations: [conv('q')] })
    await new Promise((r) => setTimeout(r, 20))
    expect(fetchById).toHaveBeenCalledTimes(1)
    expect(onFetched).not.toHaveBeenCalled()
  })

  it('tirar o ?id= zera o controle: reabrir o mesmo id funciona de novo', () => {
    const { hook, props, onFoundInList } = setup({ urlId: 'a', conversations: [conv('a')] })
    hook.rerender({ ...props, urlId: null, activeId: null, conversations: [conv('a')] })
    hook.rerender({ ...props, urlId: 'a', activeId: null, conversations: [conv('a')] })
    expect(onFoundInList).toHaveBeenCalledTimes(2)
  })
})
