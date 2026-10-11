import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const get = vi.fn()
const patch = vi.fn()
vi.mock('@/services/api', () => ({ api: { get: (...a: unknown[]) => get(...a), patch: (...a: unknown[]) => patch(...a) } }))

import { useKnowledgeBase, __zerarBaseParaTestes } from './useKnowledgeBase'

const doc = (id: string) => ({ id, name: `${id}.txt`, kind: 'text' as const, content: 'x', size: 1, createdAt: '' })

describe('useKnowledgeBase — fonte única (revisão 11/10)', () => {
  beforeEach(() => {
    __zerarBaseParaTestes()
    get.mockReset()
    patch.mockReset()
  })

  it('duas telas compartilham o estado: excluir doc numa e salvar instruções na outra não traz o doc de volta', async () => {
    get.mockResolvedValue({ data: { instructions: 'a', companyFields: [], documents: [doc('d1'), doc('d2')] } })
    patch.mockResolvedValue({ data: {} })
    const t1 = renderHook(() => useKnowledgeBase('t'))
    const t2 = renderHook(() => useKnowledgeBase('t'))
    await waitFor(() => expect(t1.result.current.carga).toBe('pronta'))
    expect(get).toHaveBeenCalledTimes(1)

    await act(async () => { await t1.result.current.deleteDocument('d1') })
    await act(async () => { await t2.result.current.setInstructions('b') })

    // PATCH parcial: cada gravação manda só o campo alterado.
    expect(patch.mock.calls[0][1]).toEqual({ documents: [doc('d2')] })
    expect(patch.mock.calls[1][1]).toEqual({ instructions: 'b' })
    expect(t1.result.current.kb.instructions).toBe('b')
    expect(t2.result.current.kb.documents.map((d) => d.id)).toEqual(['d2'])
  })

  it('GET com erro não vira base vazia gravável', async () => {
    get.mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => useKnowledgeBase('t'))
    await waitFor(() => expect(result.current.carga).toBe('erro'))
    let r: Awaited<ReturnType<typeof result.current.setInstructions>> | undefined
    await act(async () => { r = await result.current.setInstructions('x') })
    expect(r?.ok).toBe(false)
    expect(patch).not.toHaveBeenCalled()
    expect(result.current.erroAoSalvar).toBeTruthy()
  })

  it('não grava antes de carregar', async () => {
    get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useKnowledgeBase('t'))
    let r: Awaited<ReturnType<typeof result.current.deleteDocument>> | undefined
    await act(async () => { r = await result.current.deleteDocument('d1') })
    expect(r?.ok).toBe(false)
    expect(patch).not.toHaveBeenCalled()
  })

  it('PATCH com erro desfaz e devolve o erro (sem "salvo" falso)', async () => {
    get.mockResolvedValue({ data: { instructions: 'a', companyFields: [], documents: [] } })
    patch.mockRejectedValue({ response: { status: 403 } })
    const { result } = renderHook(() => useKnowledgeBase('t'))
    await waitFor(() => expect(result.current.carga).toBe('pronta'))
    let r: Awaited<ReturnType<typeof result.current.setInstructions>> | undefined
    await act(async () => { r = await result.current.setInstructions('b') })
    expect(r).toEqual({ ok: false, erro: expect.stringContaining('administrador') })
    expect(result.current.kb.instructions).toBe('a')
  })

})
