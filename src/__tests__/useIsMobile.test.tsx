import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useIsMobile } from '@/hooks/useIsMobile'

interface MatchMediaController {
  setMatches: (value: boolean) => void
  listenerCount: () => number
}

function installMatchMedia(initialMatches: boolean): MatchMediaController {
  const listeners = new Set<() => void>()
  let matches = initialMatches

  const mql = {
    get matches() {
      return matches
    },
    media: '',
    onchange: null,
    addEventListener: vi.fn((event: string, cb: () => void) => {
      if (event === 'change') listeners.add(cb)
    }),
    removeEventListener: vi.fn((event: string, cb: () => void) => {
      if (event === 'change') listeners.delete(cb)
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    ;(mql as unknown as { media: string }).media = query
    return mql
  }) as unknown as typeof window.matchMedia

  return {
    setMatches(value: boolean) {
      matches = value
      listeners.forEach((l) => l())
    },
    listenerCount: () => listeners.size,
  }
}

describe('useMediaQuery', () => {
  it('returns the initial match state', () => {
    installMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(result.current).toBe(true)
  })

  it('updates when the media query change event fires', () => {
    const ctrl = installMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(result.current).toBe(false)
    act(() => ctrl.setMatches(true))
    expect(result.current).toBe(true)
  })

  it('removes the listener on unmount', () => {
    const ctrl = installMatchMedia(false)
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(ctrl.listenerCount()).toBe(1)
    unmount()
    expect(ctrl.listenerCount()).toBe(0)
  })
})

describe('useIsMobile', () => {
  it('queries (max-width: 767px) — Tailwind md menos 1px', () => {
    installMatchMedia(false)
    renderHook(() => useIsMobile())
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
  })

  it('returns false when viewport is wider than mobile', () => {
    installMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true when viewport matches mobile', () => {
    installMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('reacts to viewport change events', () => {
    const ctrl = installMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    act(() => ctrl.setMatches(true))
    expect(result.current).toBe(true)
  })
})
