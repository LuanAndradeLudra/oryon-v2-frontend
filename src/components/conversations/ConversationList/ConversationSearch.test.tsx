// SCRUM-1096 — a busca por conteúdo é mais pesada que o ILIKE de contato que
// existia antes; sem debounce cada tecla disparava um fetch completo.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ConversationSearch } from './ConversationSearch'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('ConversationSearch — debounce', () => {
  it('digitar não chama onChange antes de 300ms', () => {
    const onChange = vi.fn()
    render(<ConversationSearch value="" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/Buscar conversas/), { target: { value: 'confi' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('chama onChange 300ms depois de parar de digitar, com o valor final', () => {
    const onChange = vi.fn()
    render(<ConversationSearch value="" onChange={onChange} />)
    const input = screen.getByPlaceholderText(/Buscar conversas/)
    fireEvent.change(input, { target: { value: 'c' } })
    act(() => vi.advanceTimersByTime(100))
    fireEvent.change(input, { target: { value: 'co' } })
    act(() => vi.advanceTimersByTime(100))
    fireEvent.change(input, { target: { value: 'confi' } })
    // Ainda não passou 300ms desde a última tecla — nenhuma chamada ainda,
    // nem intermediária com 'c' ou 'co'.
    expect(onChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('confi')
  })

  it('o botão de limpar aplica na hora, sem esperar o debounce', () => {
    const onChange = vi.fn()
    render(<ConversationSearch value="" onChange={onChange} />)
    const input = screen.getByPlaceholderText(/Buscar conversas/)
    fireEvent.change(input, { target: { value: 'confi' } })
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith('')
    expect(input).toHaveValue('')
  })

  it('valor externo (ex.: limpar filtros) reflete no input mesmo sem digitar', () => {
    const onChange = vi.fn()
    const { rerender } = render(<ConversationSearch value="algo" onChange={onChange} />)
    expect(screen.getByPlaceholderText(/Buscar conversas/)).toHaveValue('algo')
    rerender(<ConversationSearch value="" onChange={onChange} />)
    expect(screen.getByPlaceholderText(/Buscar conversas/)).toHaveValue('')
  })
})
