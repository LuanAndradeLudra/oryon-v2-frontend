/**
 * Com o backend fora do ar, a lista dizia "Nenhuma conversa" — a falha de
 * leitura (useConversations.error) nunca chegava à tela. Agora: sem conversas
 * carregadas, o estado de erro com "Tentar novamente"; com a lista já na tela,
 * um aviso que não apaga o que existe.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConversationList } from './ConversationList'
import type { Conversation } from '@/types'

function montar(props: { conversations?: Conversation[]; erro?: string | null; onTentarDeNovo?: () => void }) {
  return render(
    <MemoryRouter>
      <ConversationList
        conversations={props.conversations ?? []}
        loading={false}
        activeId={null}
        filters={{}}
        allTags={[]}
        onSelectConversation={() => {}}
        onFiltersChange={() => {}}
        erro={props.erro}
        onTentarDeNovo={props.onTentarDeNovo}
      />
    </MemoryRouter>,
  )
}

describe('ConversationList · falha ao carregar', () => {
  it('sem conversas e com erro: mostra o erro, nunca "Nenhuma conversa"', () => {
    const tentar = vi.fn()
    montar({ erro: 'Erro ao carregar conversas', onTentarDeNovo: tentar })
    expect(screen.getByText('Não foi possível carregar as conversas')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma conversa')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(tentar).toHaveBeenCalledTimes(1)
  })

  it('sem erro e sem conversas: continua "Nenhuma conversa"', () => {
    montar({ erro: null })
    expect(screen.getByText('Nenhuma conversa')).toBeInTheDocument()
  })
})
