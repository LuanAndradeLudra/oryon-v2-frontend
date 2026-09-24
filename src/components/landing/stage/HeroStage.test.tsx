// Palco (técnica da Attio, dissecção 24/09): estado ESTÁTICO por cena, sem
// timeline nem cursor falso — então não há timers para avançar. reduced-motion
// e autoplay=false só desligam os laços ambientes; o conteúdo não muda.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react'
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

const ambientOn = () => document.querySelector('[data-stage-ambient]')?.getAttribute('data-stage-ambient')
const root = () => document.querySelector('[data-stage-mode]') as HTMLElement

describe('HeroStage', () => {
  beforeEach(() => {
    reduced.value = false
    ioCallbacks = []
    vi.stubGlobal('IntersectionObserver', FakeIO)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('reduced-motion: laços ambientes desligados, mas o conteúdo (estado mais completo) continua na tela', () => {
    reduced.value = true
    render(<HeroStage />)
    expect(ambientOn()).toBe('false')
    expect(root()).toHaveAttribute('data-stage-mode', 'poster')
    expect(screen.getByText(DEMO_GUARD_LABEL)).toBeInTheDocument()
  })

  it('autoplay=false comporta-se como poster (sem laços ambientes)', () => {
    render(<HeroStage autoplay={false} />)
    expect(ambientOn()).toBe('false')
  })

  it('jsdom sem IntersectionObserver utilizável: sem laços ambientes', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<HeroStage />)
    expect(root()).toHaveAttribute('data-stage-mode', 'poster')
    expect(ambientOn()).toBe('false')
  })

  it('sai da viewport: desliga o ambiente; volta a ligar ao reentrar', () => {
    render(<HeroStage />)
    expect(ambientOn()).toBe('true')
    setInView(false)
    expect(ambientOn()).toBe('false')
    expect(root()).toHaveAttribute('data-stage-inview', 'false')
    setInView(true)
    expect(ambientOn()).toBe('true')
  })

  it('aba oculta: desliga o ambiente', () => {
    render(<HeroStage />)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(ambientOn()).toBe('false')
    expect(root()).toHaveAttribute('data-stage-tab-visible', 'false')
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(ambientOn()).toBe('true')
  })

  it('não cria NENHUM timer — não há timeline a avançar', () => {
    vi.useFakeTimers()
    render(<HeroStage />)
    expect(vi.getTimerCount()).toBe(0)
    setInView(false)
    setInView(true)
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })

  it('rótulo permanente "Dados de demonstração" no chrome da janela', () => {
    render(<HeroStage />)
    expect(screen.getAllByText(STAGE_DEMO_LABEL).length).toBeGreaterThan(0)
  })

  it('moldura de janela: cantos só no topo, sem borda inferior, três pontos no chrome', () => {
    render(<HeroStage />)
    const frame = document.querySelector('[data-stage-ambient]') as HTMLElement
    expect(frame.className).toContain('rounded-t-[13px]')
    expect(frame.className).toContain('border-b-0')
    expect(frame.querySelectorAll('span.rounded-full').length).toBeGreaterThanOrEqual(3)
  })

  it('quadro aria-hidden + descrição sr-only', () => {
    render(<HeroStage />)
    const frame = document.querySelector('[data-stage-ambient]') as HTMLElement
    expect(frame).toHaveAttribute('aria-hidden', 'true')
    expect(document.querySelector('p.sr-only')?.textContent).toContain('Agente Vendas')
  })

  it('troca de cena pelas abas mostra a cena correta e avisa o chamador', () => {
    const onSceneChange = vi.fn()
    render(<HeroStage onSceneChange={onSceneChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Funis' }))
    expect(onSceneChange).toHaveBeenCalledWith('funil')
    expect(screen.getByText('Oryon · Funis')).toBeInTheDocument()
  })

  it('oferece as três cenas (nenhuma aba morta)', () => {
    render(<HeroStage />)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Conversas', 'Funis', 'Disparos'])
  })
})

describe('StagePoster', () => {
  it('nunca liga laços ambientes, mesmo mostrando o mesmo estado do HeroStage', () => {
    render(<StagePoster scene="inbox" frame="final" />)
    expect(ambientOn()).toBe('false')
    expect(screen.getByText(DEMO_GUARD_LABEL)).toBeInTheDocument()
  })

  it('layout compact esconde a lista/trilho, mostra só a coluna do chat', () => {
    render(<StagePoster scene="inbox" frame="ia" layout="compact" />)
    expect(document.querySelector('[data-stage-layout="compact"]')).toBeInTheDocument()
  })
})
