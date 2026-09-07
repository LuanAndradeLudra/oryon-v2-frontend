/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ── Mock import.meta.env ─────────────────────────────────────────────────────
// Vitest handles import.meta.env natively; seed defaults here if needed.
;(globalThis as Record<string, unknown>).__VITE_API_URL__ = 'http://localhost:3000/api'

// ── Mock localStorage & sessionStorage ───────────────────────────────────────
// jsdom provides these, but we ensure they are clean between tests.
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

// ── Mock window.matchMedia ───────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ── Mock ResizeObserver ──────────────────────────────────────────────────────
// D2 (SCRUM-935): uma CLASSE real, não `vi.fn().mockImplementation(...)` — no
// Vitest 4 o retorno de mockImplementation não é `new`-ável, e libs que
// instanciam com `new ResizeObserver(...)` (ex.: recharts ResponsiveContainer)
// quebravam com "is not a constructor" ao serem testadas diretamente.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver = ResizeObserverMock

// ── Mock IntersectionObserver ────────────────────────────────────────────────
;(globalThis as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn().mockReturnValue([]),
}))

// ── Mock scrollTo ────────────────────────────────────────────────────────────
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

// ── Mock scrollIntoView ──────────────────────────────────────────────────────
// A2 (SCRUM-1013): jsdom não implementa scrollIntoView — qualquer componente
// que rola até o fim de uma lista (SimulatorPanel, MessageList) lança
// "not a function" ao ser montado num teste. É a mesma classe de lacuna do
// matchMedia/ResizeObserver acima, então mora aqui e não em cada suíte.
Element.prototype.scrollIntoView = vi.fn()

// ── Mock socket.io-client ────────────────────────────────────────────────────
vi.mock('socket.io-client', () => {
  const socket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'mock-socket-id',
    io: { on: vi.fn(), off: vi.fn() },
  }
  return {
    io: vi.fn(() => socket),
    default: vi.fn(() => socket),
  }
})
