// Palco do hero: reduced-motion -> poster; a timeline avança por UM setTimeout
// encadeado; fora da viewport/aba oculta congela; unmount limpa o timer.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { HeroStage } from './HeroStage'
import { StagePoster } from './StagePoster'
import { STAGE_DEMO_LABEL } from './demoLabel'
import { DEMO_GUARD_LABEL } from './demoData'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => reduced.value,
}))

/** IntersectionObserver controlável: `setInView(false)` simula sair da viewport. */
let ioCallbacks: Array<(entries: Array<Partial<IntersectionObserverEntry>>) => void> = []
class FakeIO {
  private cb: (entries: Array<Partial<IntersectionObserverEntry>>) => void
  constructor(cb: (entries: Array<Partial<IntersectionObserverEntry>>) => void) { this.cb = cb; ioCallbacks.push(cb) }
  observe(target: Element) { this.cb([{ isIntersecting: true, intersectionRatio: 1, target }]) }
  disconnect() {}
  unobserve() {}
}
function setInView(inView: boolean) {
  act(() => { ioCallbacks.forEach((cb) => cb([{ isIntersecting: inView, intersectionRatio: inView ? 1 : 0 }])) })
}

/** Um `act` por beat: o próximo timer só existe depois que o React comita o passo. */
function beats(...delays: number[]) {
  for (const d of delays) act(() => { vi.advanceTimersByTime(d) })
}

const playing = () => document.querySelector('[data-stage-playing]')?.getAttribute('data-stage-playing')

describe('HeroStage', () => {
  beforeEach(() => {
    reduced.value = false
    ioCallbacks = []
    vi.useFakeTimers()
    vi.stubGlobal('IntersectionObserver', FakeIO)
    // Desktop (>= 768px).
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reduced-motion: mostra o poster (quadro do handoff), sem timer e sem playing', () => {
    reduced.value = true
    render(<HeroStage />)
    expect(playing()).toBe('false')
    // Quadro "handoff": a linha de guarda já está na tela.
    expect(screen.getAllByText(DEMO_GUARD_LABEL).length).toBeGreaterThan(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('autoplay=false comporta-se como poster', () => {
    render(<HeroStage autoplay={false} />)
    expect(playing()).toBe('false')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('jsdom sem IntersectionObserver utilizável: poster', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<HeroStage />)
    expect(playing()).toBe('false')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rótulo permanente "Dados de demonstração" no chrome do quadro', () => {
    render(<HeroStage />)
    expect(screen.getByText(STAGE_DEMO_LABEL)).toBeInTheDocument()
  })

  it('timeline: os beats avançam com fake timers, sempre com UM timer pendente', () => {
    render(<HeroStage />)
    expect(playing()).toBe('true')
    // Passo 0: chat vazio, sem a nova conversa.
    expect(screen.getByText('Selecione uma conversa')).toBeInTheDocument()
    expect(screen.queryByText('Marina Exemplo')).not.toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(1)

    beats(900) // -> passo 1: nova linha
    expect(screen.getAllByText('Marina Exemplo').length).toBeGreaterThan(0)
    expect(screen.getByText('Selecione uma conversa')).toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(1)

    beats(800) // -> passo 2: chat abre
    expect(screen.queryByText('Selecione uma conversa')).not.toBeInTheDocument()
    expect(screen.getByText('Agente IA no controle')).toBeInTheDocument()
    expect(screen.queryByText(DEMO_GUARD_LABEL)).not.toBeInTheDocument()

    // até a linha de guarda (passo 6): 2 -> 3 -> 4 -> 5 -> 6
    beats(1000, 1100, 1500, 1100)
    expect(screen.getByText(DEMO_GUARD_LABEL)).toBeInTheDocument()
    expect(screen.getByText('Verificação pendente')).toBeInTheDocument()

    // Assumir (6 -> 7 cursor -> 8 clique -> 9) -> humano no controle
    beats(1700, 900, 380)
    expect(screen.queryByText('Agente IA no controle')).not.toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(1)
  })

  it('volta ao início ao terminar (loop) e não acumula timers', () => {
    render(<HeroStage />)
    // Percorre o roteiro inteiro (soma dos holds) e mais um pouco: dá a volta.
    for (let i = 0; i < 40; i++) beats(3300)
    expect(vi.getTimerCount()).toBe(1)
    expect(playing()).toBe('true')
  })

  it('sai da viewport: congela (zero timers); volta a tocar ao reentrar', () => {
    render(<HeroStage />)
    expect(vi.getTimerCount()).toBe(1)
    setInView(false)
    expect(playing()).toBe('false')
    expect(vi.getTimerCount()).toBe(0)
    setInView(true)
    expect(playing()).toBe('true')
    expect(vi.getTimerCount()).toBe(1)
  })

  it('aba oculta: congela', () => {
    render(<HeroStage />)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(playing()).toBe('false')
    expect(vi.getTimerCount()).toBe(0)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(playing()).toBe('true')
  })

  it('unmount limpa o timer pendente', () => {
    const { unmount } = render(<HeroStage />)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('quadro aria-hidden + descrição sr-only; sem pointer-events', () => {
    render(<HeroStage />)
    const frame = document.querySelector('[data-stage-playing]') as HTMLElement
    expect(frame).toHaveAttribute('aria-hidden', 'true')
    expect(frame.className).toContain('pointer-events-none')
    expect(document.querySelector('p.sr-only')?.textContent).toContain('Agente Vendas')
  })
})

describe('StagePoster', () => {
  it('cada quadro congela um passo e nunca tem timer', () => {
    vi.useFakeTimers()
    const { rerender } = render(<StagePoster scene="inbox" frame="inicio" />)
    expect(screen.queryByText(DEMO_GUARD_LABEL)).not.toBeInTheDocument()
    rerender(<StagePoster scene="inbox" frame="handoff" />)
    expect(screen.getByText(DEMO_GUARD_LABEL)).toBeInTheDocument()
    rerender(<StagePoster scene="inbox" frame="humano" />)
    expect(screen.queryByText('Agente IA no controle')).not.toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
    expect(screen.getByText(STAGE_DEMO_LABEL)).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('layout compact mostra só a coluna do chat', () => {
    render(<StagePoster scene="inbox" frame="ia" layout="compact" />)
    expect(screen.queryByText('Buscar conversas')).not.toBeInTheDocument()
    expect(document.querySelector('[data-stage-layout="compact"]')).toBeInTheDocument()
  })
})
