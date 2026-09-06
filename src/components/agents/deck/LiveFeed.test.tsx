// LiveFeed (A1/SCRUM-1012) — ressalva do Lince: era o único ponto
// não-defensivo de uma pilha que em todo o resto é meticulosa com isso
// (`num()`, `withFallback`, `draftProgress` devolvendo `null`).
//
// `KIND_STYLE[item.kind]` sem fallback é seguro em tempo de COMPILAÇÃO — o
// `Record<AgentFeedItemKind, …>` obriga o mapa a cobrir a união — e inseguro em
// RUNTIME, que é de onde o `kind` vem. O mockup desenha 6 tipos de evento e o
// contrato do BE.7 entrega 3; o quarto que o backend emitir chega como string
// que o mapa não tem, `style` vira `undefined`, e `style.color` derruba a
// coluna inteira do Deck — não só a linha do evento desconhecido.
//
// Por isso o teste força o kind por um cast: o compilador impediria escrever
// isso, e é justamente o caso que o compilador não pode impedir na fronteira
// com a rede.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { LiveFeed } from './LiveFeed'
import type { AgentFeedItem } from '@/types/agentsOps'

const agora = new Date().toISOString()

function item(over: Partial<AgentFeedItem> = {}): AgentFeedItem {
  return {
    agentId: 'a1',
    agentName: 'Sofia',
    kind: 'replied',
    text: 'respondeu a Marina T.',
    at: agora,
    ...over,
  } as AgentFeedItem
}

describe('LiveFeed', () => {
  it('desenha os 3 kinds que o contrato entrega', () => {
    render(
      <LiveFeed
        items={[
          item({ kind: 'replied', text: 'respondeu a Marina' }),
          item({ kind: 'handoff_requested', text: 'pediu transferência' }),
          item({ kind: 'handoff_returned', text: 'retomou a conversa' }),
        ]}
      />,
    )

    expect(screen.getByText('respondeu a Marina')).toBeInTheDocument()
    expect(screen.getByText('pediu transferência')).toBeInTheDocument()
    expect(screen.getByText('retomou a conversa')).toBeInTheDocument()
  })

  it('sem eventos, diz que não houve atividade em vez de lista vazia', () => {
    render(<LiveFeed items={[]} />)
    expect(screen.getByText('Nenhuma atividade ainda hoje.')).toBeInTheDocument()
  })

  // O achado. Antes do fallback isto lançava e levava a coluna junto.
  it('kind desconhecido NÃO derruba o feed — a linha aparece, degradada', () => {
    const desconhecido = item({ kind: 'sale_attributed' as AgentFeedItem['kind'], text: 'registrou uma venda' })

    expect(() => render(<LiveFeed items={[desconhecido]} />)).not.toThrow()
    expect(screen.getByText('registrou uma venda')).toBeInTheDocument()
  })

  // O que mais importa: um evento desconhecido no meio não pode apagar os
  // conhecidos ao redor. Era esse o custo real do índice sem fallback.
  it('um kind desconhecido no meio não apaga os eventos conhecidos', () => {
    render(
      <LiveFeed
        items={[
          item({ kind: 'replied', text: 'respondeu a Marina' }),
          item({ kind: 'funnel_moved' as AgentFeedItem['kind'], text: 'moveu no funil' }),
          item({ kind: 'handoff_returned', text: 'retomou a conversa' }),
        ]}
      />,
    )

    expect(screen.getByText('respondeu a Marina')).toBeInTheDocument()
    expect(screen.getByText('moveu no funil')).toBeInTheDocument()
    expect(screen.getByText('retomou a conversa')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })
})
