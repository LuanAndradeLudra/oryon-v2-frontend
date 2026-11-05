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
function falharSnapshot(range: string) {
  for (const p of pendentes.filter((x) => x.range === range && x.url === '/home/snapshot')) p.reject(new Error('snapshot falhou'))
}
function responderStats(range: string, resolvidas: number) {
  for (const p of pendentes.filter((x) => x.range === range && x.url === '/home/stats')) p.resolve(stats(resolvidas))
}
const resolvidasDe = (r: { snapshot: { kpis: Array<{ id: string; value: number | null }> } | null }) =>
  r.snapshot?.kpis.find((k) => k.id === 'resolved')?.value

beforeEach(() => { pendentes.length = 0; get.mockClear(); vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => cleanup())

describe('useRelatoriosDoPainel', () => {
  it('SCRUM-1465 (A2/A3): métricas do negócio à parte — a falha não derruba a aba e o catálogo põe o card em erro', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useRelatoriosDoPainel('7d'))
    const catalogo = pendentes.find((p) => p.url === '/home/metrics/catalog')!
    catalogo.resolve({ data: { escopo: 'empresa', metricas: [{ chave: 'appointments_scheduled', rotulo: 'Agendamentos', grupo: 'Do seu negócio', unidade: 'count', sentido: 'up', ajuda: null, selos: [], versao: 1, publicadaEm: null }] } })
    for (const p of pendentes.filter((x) => x.range === '7d' && x.url !== '/home/metrics')) p.resolve(p.url === '/home/stats' ? stats(4) : { data: null })
    await waitFor(() => expect(result.current.snapshot).not.toBeNull())
    // Valores ainda não chegaram: o card do catálogo aparece "carregando", nunca o fixo.
    expect(result.current.snapshot!.kpis.find((k) => k.id === 'appointments_scheduled')!.negocio?.estado).toBe('carregando')
    pendentes.find((p) => p.url === '/home/metrics')!.reject(new Error('500'))
    await waitFor(() => expect(result.current.snapshot!.kpis.find((k) => k.id === 'appointments_scheduled')!.negocio?.estado).toBe('erro'))
    expect(result.current.erro).toBe(false)
    expect(result.current.catalogoPronto).toBe(true)
    expect(resolvidasDe(result.current)).toBe(4)
  })

  it('manda o período nas duas leituras e a atividade uma vez só', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(p), { initialProps: { p: '7d' as DateRange } })
    expect(get).toHaveBeenCalledWith('/home/stats', { params: { range: '7d', compare: 1 } })
    expect(get).toHaveBeenCalledWith('/home/snapshot', { params: { range: '7d', compare: 1 } })
    await act(async () => { responder('7d', 5) })
    await waitFor(() => expect(resolvidasDe(result.current)).toBe(5))

    rerender({ p: '30d' })
    expect(get).toHaveBeenCalledWith('/home/stats', { params: { range: '30d', compare: 1 } })
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

  it('UI-FE-01: falha do snapshot não inventa status, preserva o período anterior e a data dele', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(p), { initialProps: { p: '7d' as DateRange } })
    await act(async () => { responder('7d', 5) })
    await waitFor(() => expect(result.current.atualizadoEm).not.toBeNull())
    const dataAnterior = result.current.atualizadoEm
    rerender({ p: 'month' })
    await act(async () => {
      responderStats('month', 1)
      falharSnapshot('month')
    })
    await waitFor(() => expect(result.current.erro).toBe(true))
    expect(result.current.periodoCarregado).toBe('7d')
    expect(resolvidasDe(result.current)).toBe(5)
    expect(result.current.atualizadoEm).toBe(dataAnterior)
  })

  it('falha sem dado nenhum: não fica carregando para sempre', async () => {
    const { result } = renderHook(() => useRelatoriosDoPainel('7d'))
    await act(async () => { falhar('7d') })
    await waitFor(() => expect(result.current.erro).toBe(true))
    expect(result.current.carregando).toBe(false)
    expect(result.current.snapshot).toBeNull()
  })
})
