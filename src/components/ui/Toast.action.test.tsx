// F9 (SCRUM-879) — toast com ação ("Ver no board"): renderiza o link, executa e
// dispensa; toast sem ação continua igual.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastContainer } from './Toast'
import { showToast, dismissToast } from '@/hooks/useToast'

describe('Toast com ação (F9)', () => {
  it('mostra o botão da ação, executa o onClick e dispensa o toast', () => {
    const onClick = vi.fn()
    const onDismiss = vi.fn()
    render(<ToastContainer toasts={[{ id: 't1', type: 'success', message: 'Mariana entrou em Suporte.', action: { label: 'Ver no board', onClick } }]} onDismiss={onDismiss} />)
    expect(screen.getByText('Mariana entrou em Suporte.')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('toast-action'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledWith('t1')
  })

  it('sem ação não renderiza o botão', () => {
    render(<ToastContainer toasts={[{ id: 't2', type: 'info', message: 'ok' }]} onDismiss={vi.fn()} />)
    expect(screen.queryByTestId('toast-action')).toBeNull()
  })

  it('showToast aceita a ação como 3º argumento e a guarda no toast', () => {
    const id = showToast('x', 'success', { label: 'Ver', onClick: () => {} })
    expect(typeof id).toBe('string')
    dismissToast(id)
  })
})
