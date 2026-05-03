import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Drawer } from '@/components/ui/Drawer'
import { BottomSheet } from '@/components/ui/BottomSheet'

function getBackdrop(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.fixed.inset-0.z-\\[60\\]')
  if (!el) throw new Error('backdrop not found')
  return el
}

describe('Drawer', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders children when open', () => {
    render(
      <Drawer open onClose={() => {}}>
        <div>conteudo do drawer</div>
      </Drawer>,
    )
    expect(screen.getByText('conteudo do drawer')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(
      <Drawer open={false} onClose={() => {}}>
        <div>conteudo do drawer</div>
      </Drawer>,
    )
    expect(screen.queryByText('conteudo do drawer')).not.toBeInTheDocument()
  })

  it('exposes role="dialog" and aria-label on the panel', () => {
    render(
      <Drawer open onClose={() => {}} ariaLabel="Menu lateral">
        <div>conteudo</div>
      </Drawer>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Menu lateral' })
    expect(dialog).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked (dismissible)', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <div>conteudo</div>
      </Drawer>,
    )
    fireEvent.click(getBackdrop())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose on backdrop click when dismissible=false', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} dismissible={false}>
        <div>conteudo</div>
      </Drawer>,
    )
    fireEvent.click(getBackdrop())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on Escape when dismissible', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <div>conteudo</div>
      </Drawer>,
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close on Escape when dismissible=false', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} dismissible={false}>
        <div>conteudo</div>
      </Drawer>,
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('locks body scroll while open and restores on close', () => {
    const { rerender } = render(
      <Drawer open onClose={() => {}}>
        <div>conteudo</div>
      </Drawer>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Drawer open={false} onClose={() => {}}>
        <div>conteudo</div>
      </Drawer>,
    )
    expect(document.body.style.overflow).toBe('')
  })
})

describe('BottomSheet', () => {
  it('renders inside a bottom-side Drawer with children', () => {
    render(
      <BottomSheet open onClose={() => {}} ariaLabel="Acoes">
        <div>opcoes</div>
      </BottomSheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Acoes' })).toBeInTheDocument()
    expect(screen.getByText('opcoes')).toBeInTheDocument()
  })

  it('hides the drag handle when hideHandle is true', () => {
    const { container } = render(
      <BottomSheet open onClose={() => {}} hideHandle>
        <div>opcoes</div>
      </BottomSheet>,
    )
    // The handle is the only element with the aria-hidden + flex-shrink-0 wrapper
    const handles = container.querySelectorAll('[aria-hidden="true"]')
    expect(handles.length).toBe(0)
  })
})
