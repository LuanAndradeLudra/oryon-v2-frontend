import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { DesktopRecommendedBanner } from '@/components/common/DesktopRecommendedBanner'
import { useDesktopRecommendedBanner } from '@/hooks/useDesktopRecommendedBanner'

function setMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('DesktopRecommendedBanner (component)', () => {
  it('renders the default message and dismiss button when visible', () => {
    const onDismiss = vi.fn()
    render(<DesktopRecommendedBanner visible onDismiss={onDismiss} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dispensar aviso' })).toBeInTheDocument()
    expect(screen.getByText(/funciona melhor no desktop/i)).toBeInTheDocument()
  })

  it('renders nothing when visible is false', () => {
    const { container } = render(<DesktopRecommendedBanner visible={false} onDismiss={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a custom message when provided', () => {
    render(<DesktopRecommendedBanner visible onDismiss={() => {}} message="Use o desktop, please" />)
    expect(screen.getByText('Use o desktop, please')).toBeInTheDocument()
  })

  it('calls onDismiss when the button is clicked', () => {
    const onDismiss = vi.fn()
    render(<DesktopRecommendedBanner visible onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dispensar aviso' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

describe('useDesktopRecommendedBanner', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns visible=false when not mobile', () => {
    setMatchMedia(false)
    const { result } = renderHook(() => useDesktopRecommendedBanner('admin/audit'))
    expect(result.current.visible).toBe(false)
  })

  it('returns visible=true when mobile and not dismissed', () => {
    setMatchMedia(true)
    const { result } = renderHook(() => useDesktopRecommendedBanner('admin/audit'))
    expect(result.current.visible).toBe(true)
  })

  it('dismiss() persists to sessionStorage and hides the banner', () => {
    setMatchMedia(true)
    const { result } = renderHook(() => useDesktopRecommendedBanner('admin/audit'))
    expect(result.current.visible).toBe(true)
    act(() => result.current.dismiss())
    expect(result.current.visible).toBe(false)
    expect(sessionStorage.getItem('oryon:desktop-banner:dismissed:admin/audit')).toBe('1')
  })

  it('respects per-route dismiss (dismiss on route A does not affect route B)', () => {
    setMatchMedia(true)
    const a = renderHook(() => useDesktopRecommendedBanner('routeA'))
    const b = renderHook(() => useDesktopRecommendedBanner('routeB'))
    act(() => a.result.current.dismiss())
    expect(a.result.current.visible).toBe(false)
    expect(b.result.current.visible).toBe(true)
  })

  it('reads existing sessionStorage dismissal on mount', () => {
    sessionStorage.setItem('oryon:desktop-banner:dismissed:admin/audit', '1')
    setMatchMedia(true)
    const { result } = renderHook(() => useDesktopRecommendedBanner('admin/audit'))
    expect(result.current.visible).toBe(false)
  })
})
