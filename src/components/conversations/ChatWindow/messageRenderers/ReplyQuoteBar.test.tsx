// SCRUM-1158 — clique na barra de citação pula pra mensagem original (estilo
// WhatsApp). Só é clicável quando `quoted` foi resolvido pelo MessageList
// (onClick vem undefined quando a original está fora da janela carregada).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReplyQuoteBar } from './ReplyQuoteBar'
import type { Message } from '@/types'

const baseMessage: Message = {
  id: 'm1',
  conversationId: 'c1',
  direction: 'inbound',
  type: 'text',
  status: 'delivered',
  sentAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
}

const quoted: Message = { ...baseMessage, id: 'quoted-1', body: 'Confirmado para quinta às 14h' }
const reply: Message = { ...baseMessage, id: 'm2', contextWamid: 'wamid-1', body: 'Perfeito, obrigado!' }

describe('ReplyQuoteBar', () => {
  it('quoted resolvida + onClick: fica clicável (role=button) e dispara onClick', () => {
    const onClick = vi.fn()
    render(<ReplyQuoteBar message={reply} quoted={quoted} onClick={onClick} />)
    const bar = screen.getByRole('button')
    fireEvent.click(bar)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('Enter/Espaço no teclado também disparam o pulo (acessibilidade)', () => {
    const onClick = vi.fn()
    render(<ReplyQuoteBar message={reply} quoted={quoted} onClick={onClick} />)
    const bar = screen.getByRole('button')
    fireEvent.keyDown(bar, { key: 'Enter' })
    fireEvent.keyDown(bar, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('clique propaga stopPropagation — não deve borbulhar pro pai', () => {
    const onClick = vi.fn()
    const parentClick = vi.fn()
    render(
      <div onClick={parentClick}>
        <ReplyQuoteBar message={reply} quoted={quoted} onClick={onClick} />
      </div>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('quoted não resolvida (fora da janela carregada): sem onClick, sem role=button — degrada graciosamente', () => {
    render(<ReplyQuoteBar message={reply} quoted={null} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Mensagem original')).toBeInTheDocument()
  })

  it('quoted resolvida mas sem onJumpToMessage disponível: também não é clicável', () => {
    render(<ReplyQuoteBar message={reply} quoted={quoted} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
