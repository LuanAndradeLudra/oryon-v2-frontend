import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { LayerProvider } from '@/contexts/LayerContext'
import { SinoDaEquipe } from './SinoDaEquipe'

/** SCRUM-1386 — o sino no shell da equipe de suporte. */

const reload = vi.fn(async () => undefined)
let naoLidas = 3
vi.mock('@/hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: naoLidas, reload }) }))
vi.mock('@/components/layout/TopBar', () => ({
  NotificationsPanel: ({ semPreferencias }: { semPreferencias?: boolean }) => (
    <div role="dialog" aria-label="Painel">{semPreferencias ? 'sem preferências' : 'com preferências'}</div>
  ),
}))

const montar = () => render(<LayerProvider><SinoDaEquipe /><p>fora</p></LayerProvider>)

describe('SinoDaEquipe', () => {
  beforeEach(() => {
    naoLidas = 3
    reload.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('mostra as não lidas e abre o painel sem o botão de preferências', () => {
    montar()
    const sino = screen.getByRole('button', { name: 'Notificações (3 não lidas)' })
    expect(sino).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(sino)
    expect(screen.getByRole('dialog', { name: 'Painel' })).toHaveTextContent('sem preferências')
    expect(sino).toHaveAttribute('aria-expanded', 'true')
  })

  it('fecha com Esc e atualiza a contagem', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Notificações/ }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Painel' })).toBeNull()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('sem não lidas, o rótulo não traz contador; mais de 9 vira "9+"', () => {
    naoLidas = 0
    const { unmount } = montar()
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument()
    unmount()
    naoLidas = 12
    montar()
    expect(screen.getByRole('button', { name: 'Notificações (9+ não lidas)' })).toHaveTextContent('9+')
  })

  it('atualiza a cada 30 s com a aba visível', () => {
    vi.useFakeTimers()
    const visibilidade = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    montar()
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(reload).toHaveBeenCalledTimes(1)
    visibilidade.mockReturnValue('hidden')
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(reload).toHaveBeenCalledTimes(1)
    visibilidade.mockRestore()
  })
})
