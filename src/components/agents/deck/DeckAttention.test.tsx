// DeckAttention (A1/SCRUM-1012) — a coluna "Atenção" do Deck.
//
// A regra que produz os itens vive em `deriveAttention` e é testada em
// useDeckData.test.ts. Aqui o que importa é o contrato visual: contador,
// estado tranquilo, e ações que mudam com o tipo do alerta (só o pausado
// oferece "Reativar").

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { DeckAttention } from './DeckAttention'
import type { DeckAttentionItem } from './useDeckData'

describe('DeckAttention', () => {
  const item = (over: Partial<DeckAttentionItem> = {}): DeckAttentionItem => ({
    id: 'i1',
    kind: 'paused',
    accent: 'amber',
    agentId: 'a1',
    agentName: 'Rafa',
    title: 'Rafa pausado há 3 dias',
    description: 'Ninguém está respondendo as conversas dele.',
    ...over,
  })

  it('lista os itens com o contador e o texto de cada um', () => {
    render(<DeckAttention items={[item(), item({ id: 'i2', kind: 'untested', title: 'Sofia sem teste há 9 dias' })]} onOpenAgent={vi.fn()} onResumeAgent={vi.fn()} />)

    expect(screen.getByText('Rafa pausado há 3 dias')).toBeInTheDocument()
    expect(screen.getByText('Sofia sem teste há 9 dias')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('mostra estado tranquilo quando não há nada pedindo atenção', () => {
    render(<DeckAttention items={[]} onOpenAgent={vi.fn()} onResumeAgent={vi.fn()} />)
    expect(screen.getByText('Nada pedindo atenção agora')).toBeInTheDocument()
  })

  it('só o item de pausado oferece Reativar, e a ação recebe o id do agente', () => {
    const onResume = vi.fn()
    render(<DeckAttention items={[item()]} onOpenAgent={vi.fn()} onResumeAgent={onResume} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reativar' }))
    expect(onResume).toHaveBeenCalledWith('a1')
  })

  it('adapta o rótulo da ação secundária ao tipo do alerta', () => {
    const onOpen = vi.fn()
    const { rerender } = render(<DeckAttention items={[item({ kind: 'untested' })]} onOpenAgent={onOpen} onResumeAgent={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Testar agora' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reativar' })).not.toBeInTheDocument()

    rerender(<DeckAttention items={[item({ kind: 'token_expiring' })]} onOpenAgent={onOpen} onResumeAgent={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }))
    expect(onOpen).toHaveBeenCalledWith('a1')
  })

  it('mostra esqueleto enquanto a lista de agentes ainda está carregando', () => {
    const { container } = render(<DeckAttention items={[]} loading onOpenAgent={vi.fn()} onResumeAgent={vi.fn()} />)
    expect(screen.queryByText('Nada pedindo atenção agora')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
