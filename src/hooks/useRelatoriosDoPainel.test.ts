import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act, cleanup } from '@testing-library/react'
import type { DateRange } from '@/types/dashboard'

type Resposta = { data: unknown }
const pendentes: Array<{ url: string; range?: string; resolve: (r: Resposta) => void; reject: (e: unknown) => void }> = []
const get = vi.fn((url: string, cfg?: { params?: { range?: string } }) =>
  new Promise<Resposta>((resolve, reject) => { pendentes.push({ url, range: cfg?.params?.range, resolve, reject }) }))

vi.mock('@/services/api', () => ({ api: { get: (url: string, cfg?: { params?: { range?: string } }) => get(url, cfg) } }))

import { useRelatoriosDoPainel } from './useRelatoriosDoPainel'

const stats = (resolvidas: number) => ({ data: { conversationsOpen: 3, queueCount: 1, conversationsResolvedToday: resolvidas, totalConversations: 10 } })

/** Responde as leituras de período ainda pendentes para `range`. */
function responder(range: string, resolvidas: number) {
  for (const p of pendentes.filter((x) => x.range === range && x.url !== '/activity-feed')) {
    p.resolve(p.url === '/home/stats' ? stats(resolvidas) : { data: null })
  }
}
function falhar(range: string) {
  for (const p of pendentes.filter((x) => x.range === range && x.url === '/home/stats')) p.reject(new Error('falhou'))
}
const resolvidasDe = (r: { snapshot: { kpis: Array<{ id: string; value: number | null }> } | null }) =>
  r.snapshot?.kpis.find((k) => k.id === 'resolved')?.value

beforeEach(() => { pendentes.length = 0; get.mockClear(); vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => cleanup())

describe('useRelatoriosDoPainel', () => {
  it('manda o período nas duas leituras e a atividade uma vez só', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(p), { initialProps: { p: '7d' as DateRange } })
    expect(get).toHaveBeenCalledWith('/home/stats', { params: { range: '7d' } })
    expect(get).toHaveBeenCalledWith('/home/snapshot', { params: { range: '7d' } })
    await act(async () => { responder('7d', 5) })
    await waitFor(() => expect(resolvidasDe(result.current)).toBe(5))

    rerender({ p: '30d' })
    expect(get).toHaveBeenCalledWith('/home/stats', { params: { range: '30d' } })
    // Trocar de período não refaz a atividade (janela própria de 4 h).
    expect(get.mock.calls.filter(([u]) => u === '/activity-feed')).toHaveLength(1)
  })

  it('enquanto o novo período não chega, o anterior fica na tela como "atualizando"', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(p), { initialProps: { p: '7d' as DateRange } })
    await act(async () => { responder('7d', 5) })
    await waitFor(() => expect(result.current.carregando).toBe(false))
    rerender({ p: 'today' })
    expect(result.current.atualizando).toBe(true)
    expect(resolvidasDe(result.current)).toBe(5)
    await act(async () => { responder('today', 1) })
    await waitFor(() => expect(result.current.atualizando).toBe(false))
    expect(result.current.periodoCarregado).toBe('today')
    expect(resolvidasDe(result.current)).toBe(1)
  })

  it('sem permissão de ler a atividade da empresa, nem pede /activity-feed (antes: 403 engolido)', async () => {
    get.mockClear()
    renderHook(() => useRelatoriosDoPainel('7d', false))
    await act(async () => { responder('7d', 1) })
    expect(get.mock.calls.map((c) => c[0])).not.toContain('/activity-feed')
  })

  it('só a resposta mais recente vale (troca rápida de período)', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(p), { initialProps: { p: '7d' as DateRange } })
    rerender({ p: 'today' })
    // A de "Hoje" chega primeiro; a de "7 dias", atrasada, não pode sobrescrever.
    await act(async () => { responder('today', 1) })
    await act(async () => { responder('7d', 99) })
    await waitFor(() => expect(result.current.periodoCarregado).toBe('today'))
    expect(resolvidasDe(result.current)).toBe(1)
  })

  it('falha com dado anterior: mantém o dado e marca o erro do período pedido', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(p), { initialProps: { p: '7d' as DateRange } })
    await act(async () => { responder('7d', 5) })
    rerender({ p: 'month' })
    await act(async () => { falhar('month') })
    await waitFor(() => expect(result.current.erro).toBe(true))
    expect(result.current.periodoCarregado).toBe('7d')
    expect(resolvidasDe(result.current)).toBe(5)
    expect(result.current.atualizando).toBe(false)
  })

  it('falha sem dado nenhum: não fica carregando para sempre', async () => {
    const { result } = renderHook(() => useRelatoriosDoPainel('7d'))
    await act(async () => { falhar('7d') })
    await waitFor(() => expect(result.current.erro).toBe(true))
    expect(result.current.carregando).toBe(false)
    expect(result.current.snapshot).toBeNull()
  })
})
