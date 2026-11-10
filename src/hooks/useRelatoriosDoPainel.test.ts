import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act, cleanup } from '@testing-library/react'
import type { DateRange } from '@/types/dashboard'

type Resposta = { data: unknown }
const pendentes: Array<{ url: string; range?: string; resolve: (r: Resposta) => void; reject: (e: unknown) => void }> = []
const get = vi.fn((url: string, cfg?: { params?: { range?: string } }) =>
  new Promise<Resposta>((resolve, reject) => { pendentes.push({ url, range: cfg?.params?.range, resolve, reject }) }))

vi.mock('@/services/api', () => ({ api: { get: (url: string, cfg?: { params?: { range?: string } }) => get(url, cfg) } }))

// Socket falso: guarda os ouvintes para o teste disparar `metricas:mudou`.
const ouvintes = vi.hoisted(() => new Map<string, Set<(p: unknown) => void>>())
vi.mock('@/services/socket', () => ({
  connectSocket: () => ({
    on: (e: string, fn: (p: unknown) => void) => { if (!ouvintes.has(e)) ouvintes.set(e, new Set()); ouvintes.get(e)!.add(fn) },
    off: (e: string, fn: (p: unknown) => void) => { ouvintes.get(e)?.delete(fn) },
  }),
}))
const emitir = (e: string) => { for (const fn of ouvintes.get(e) ?? []) fn({ tenantId: 't1', version: 2, at: new Date().toISOString() }) }

import { useRelatoriosDoPainel } from './useRelatoriosDoPainel'
import { chaveDoPeriodo, type Periodo } from '@/lib/periodoDoPainel'

const fixo = (valor: DateRange): Periodo => ({ tipo: 'fixo', valor, comparar: 'anterior' })

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
    const { result } = renderHook(() => useRelatoriosDoPainel(fixo('7d')))
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
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(fixo(p)), { initialProps: { p: '7d' as DateRange } })
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
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(fixo(p)), { initialProps: { p: '7d' as DateRange } })
    await act(async () => { responder('7d', 5) })
    await waitFor(() => expect(result.current.carregando).toBe(false))
    rerender({ p: 'today' })
    expect(result.current.atualizando).toBe(true)
    expect(resolvidasDe(result.current)).toBe(5)
    await act(async () => { responder('today', 1) })
    await waitFor(() => expect(result.current.atualizando).toBe(false))
    expect(result.current.periodoCarregado && chaveDoPeriodo(result.current.periodoCarregado)).toBe('today')
    expect(resolvidasDe(result.current)).toBe(1)
  })

  it('sem permissão de ler a atividade da empresa, nem pede /activity-feed (antes: 403 engolido)', async () => {
    get.mockClear()
    renderHook(() => useRelatoriosDoPainel(fixo('7d'), false))
    await act(async () => { responder('7d', 1) })
    expect(get.mock.calls.map((c) => c[0])).not.toContain('/activity-feed')
  })

  it('só a resposta mais recente vale (troca rápida de período)', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(fixo(p)), { initialProps: { p: '7d' as DateRange } })
    rerender({ p: 'today' })
    // A de "Hoje" chega primeiro; a de "7 dias", atrasada, não pode sobrescrever.
    await act(async () => { responder('today', 1) })
    await act(async () => { responder('7d', 99) })
    await waitFor(() => expect(result.current.periodoCarregado && chaveDoPeriodo(result.current.periodoCarregado)).toBe('today'))
    expect(resolvidasDe(result.current)).toBe(1)
  })

  it('falha com dado anterior: mantém o dado e marca o erro do período pedido', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(fixo(p)), { initialProps: { p: '7d' as DateRange } })
    await act(async () => { responder('7d', 5) })
    rerender({ p: 'month' })
    await act(async () => { falhar('month') })
    await waitFor(() => expect(result.current.erro).toBe(true))
    expect(result.current.periodoCarregado && chaveDoPeriodo(result.current.periodoCarregado)).toBe('7d')
    expect(resolvidasDe(result.current)).toBe(5)
    expect(result.current.atualizando).toBe(false)
  })

  it('UI-FE-01: falha do snapshot não inventa status, preserva o período anterior e a data dele', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DateRange }) => useRelatoriosDoPainel(fixo(p)), { initialProps: { p: '7d' as DateRange } })
    await act(async () => { responder('7d', 5) })
    await waitFor(() => expect(result.current.atualizadoEm).not.toBeNull())
    const dataAnterior = result.current.atualizadoEm
    rerender({ p: 'month' })
    await act(async () => {
      responderStats('month', 1)
      falharSnapshot('month')
    })
    await waitFor(() => expect(result.current.erro).toBe(true))
    expect(result.current.periodoCarregado && chaveDoPeriodo(result.current.periodoCarregado)).toBe('7d')
    expect(resolvidasDe(result.current)).toBe(5)
    expect(result.current.atualizadoEm).toBe(dataAnterior)
  })

  it('falha sem dado nenhum: não fica carregando para sempre', async () => {
    const { result } = renderHook(() => useRelatoriosDoPainel(fixo('7d')))
    await act(async () => { falhar('7d') })
    await waitFor(() => expect(result.current.erro).toBe(true))
    expect(result.current.carregando).toBe(false)
    expect(result.current.snapshot).toBeNull()
  })
})

describe('useRelatoriosDoPainel — períodos novos (SCRUM-1216, 05/11)', () => {
  const pedidoDe = (url: string) => get.mock.calls.find(([u]) => u === url)?.[1]

  it('personalizado com o ano anterior: from/to sem range e compare=previous_year; o rótulo vem do eco', async () => {
    const p: Periodo = { tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-15', comparar: 'ano_anterior' }
    const { result } = renderHook(() => useRelatoriosDoPainel(p))
    expect(pedidoDe('/home/stats')).toEqual({ params: { from: '2026-10-01', to: '2026-10-15', compare: 'previous_year' } })
    expect(pedidoDe('/home/snapshot')).toEqual({ params: { from: '2026-10-01', to: '2026-10-15', compare: 'previous_year' } })
    expect((pedidoDe('/home/metrics') as { params: unknown }).params).toEqual({ from: '2026-10-01', to: '2026-10-15', compare: 'previous_year' })
    const eco = { id: 'custom', from: '2026-10-01', to: '2026-10-14', compare: 'previous_year', previousReason: 'before_account' }
    pendentes.find((x) => x.url === '/home/stats')!.resolve({ data: { ...stats(2).data, period: eco } })
    pendentes.find((x) => x.url === '/home/snapshot')!.resolve({ data: null })
    await waitFor(() => expect(result.current.snapshot).not.toBeNull())
    // Identidade = o pedido; rótulo = o que o backend calculou.
    expect(chaveDoPeriodo(result.current.periodoCarregado!)).toBe('2026-10-01..2026-10-15:ano')
    expect(result.current.periodoDaResposta).toEqual({ tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-14', comparar: 'ano_anterior' })
    expect(result.current.semComparacao).toBe(true)
    expect(result.current.atualizando).toBe(false)
  })

  it('422 do backend: a mensagem dele vai para o aviso', async () => {
    const { result } = renderHook(() => useRelatoriosDoPainel(fixo('90d')))
    expect(pedidoDe('/home/stats')).toEqual({ params: { range: '90d', compare: 1 } })
    pendentes.find((x) => x.url === '/home/stats')!.reject({ response: { status: 422, data: { statusCode: 422, error: 'validation_failed', message: 'Período maior que 400 dias.' } } })
    await waitFor(() => expect(result.current.erro).toBe(true))
    expect(result.current.mensagemDoErro).toBe('Período maior que 400 dias.')
  })
})

describe('useRelatoriosDoPainel — tempo real (06/11)', () => {
  const leiturasDeStats = () => get.mock.calls.filter(([u]) => u === '/home/stats').length
  let visibilidade: DocumentVisibilityState = 'visible'

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    visibilidade = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilidade)
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  async function carregado(p: Periodo) {
    const r = renderHook(() => useRelatoriosDoPainel(p))
    for (const x of pendentes.filter((y) => y.url !== '/activity-feed')) x.resolve(x.url === '/home/stats' ? stats(1) : { data: null })
    await waitFor(() => expect(r.result.current.snapshot).not.toBeNull())
    return r
  }

  it('aviso dentro dos 30 s: uma recarga só, no fim da janela, e em silêncio', async () => {
    const { result } = await carregado(fixo('7d'))
    expect(leiturasDeStats()).toBe(1)
    emitir('metricas:mudou'); emitir('metricas:mudou'); emitir('metricas:mudou')
    expect(leiturasDeStats()).toBe(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(leiturasDeStats()).toBe(2)
    expect(get).toHaveBeenLastCalledWith('/home/metrics', expect.objectContaining({ params: { range: '7d' } }))
    // Recarga do tempo real não esmaece a tela.
    expect(result.current.atualizando).toBe(false)
  })

  it('passados os 30 s, o aviso relê na hora', async () => {
    await carregado(fixo('today'))
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
    emitir('metricas:mudou')
    expect(leiturasDeStats()).toBe(2)
  })

  it('mês anterior e personalizado no passado nunca mudam: o aviso é ignorado', async () => {
    await carregado(fixo('last_month'))
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
    emitir('metricas:mudou')
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
    expect(leiturasDeStats()).toBe(1)
  })

  it('aba escondida só marca; ao voltar, relê', async () => {
    await carregado(fixo('30d'))
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
    visibilidade = 'hidden'
    emitir('metricas:mudou')
    expect(leiturasDeStats()).toBe(1)
    visibilidade = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(leiturasDeStats()).toBe(2)
    // Voltar de novo sem aviso novo não relê.
    document.dispatchEvent(new Event('visibilitychange'))
    expect(leiturasDeStats()).toBe(2)
  })

  it('desmontar tira o ouvinte e a recarga agendada', async () => {
    const { unmount } = await carregado(fixo('7d'))
    emitir('metricas:mudou')
    unmount()
    expect(ouvintes.get('metricas:mudou')?.size ?? 0).toBe(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(leiturasDeStats()).toBe(1)
  })
})
