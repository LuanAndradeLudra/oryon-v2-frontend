import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArtifactProvider } from '@/contexts/ArtifactContext'
import type { CopilotMessage } from '@/contexts/CopilotContext'
import { Bancada } from './Bancada'
import { contarPendentes } from './lotes'

// SCRUM-1253: a bancada recebe o que a conversa produz — a aprovação abre
// nela (sem modal), com o irreversível marcado e "Recusar tudo" separado.

const mensagens: CopilotMessage[] = [
  { id: 'u1', role: 'user', content: 'Cadastre a Marina e exclua a etiqueta teste', timestamp: new Date() },
  {
    id: 'a1', role: 'assistant', content: 'Preparei as ações.', timestamp: new Date(),
    toolCalls: [
      { id: 't1', name: 'list_contacts', input: {}, result: { contacts: [] }, status: 'done' },
      {
        id: 'lote', name: '__approval_batch__', input: {}, status: 'running', approvalStatus: 'pending',
        batchItems: [
          { id: 'i1', name: 'create_contact', input: { displayName: 'Marina' } },
          { id: 'i2', name: 'delete_tag', input: { tagId: 'x', name: 'teste' } },
        ],
      },
    ],
  },
]

function montar(aba: 'aprovacoes' | 'resultados' | 'artefatos', resolveBatch = vi.fn()) {
  const onAba = vi.fn()
  render(
    <ArtifactProvider>
      <Bancada ctx={{ messages: mensagens, resolveBatch, enviar: vi.fn(), ocupado: false }} aba={aba} onAba={onAba} />
    </ArtifactProvider>,
  )
  return { onAba, resolveBatch }
}

describe('Bancada do Copilot', () => {
  it('conta só os lotes que esperam aprovação', () => {
    expect(contarPendentes(mensagens)).toBe(1)
  })

  it('mostra a aprovação na própria bancada, com o irreversível marcado', () => {
    montar('aprovacoes')
    expect(screen.getByText('Revise as 2 ações antes de aprovar')).toBeInTheDocument()
    expect(screen.getByText('Não dá para desfazer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprovar 2 ações' })).toBeInTheDocument()
  })

  it('"Recusar tudo" recusa o lote inteiro', () => {
    const { resolveBatch } = montar('aprovacoes')
    fireEvent.click(screen.getByRole('button', { name: 'Recusar tudo' }))
    expect(resolveBatch).toHaveBeenCalledWith('lote', [])
  })

  it('a troca de aba sobe para quem guarda o estado (a URL)', () => {
    const { onAba } = montar('aprovacoes')
    fireEvent.click(screen.getByRole('tab', { name: /Resultados/ }))
    expect(onAba).toHaveBeenCalledWith('resultados')
  })

  it('em Resultados, cada resultado vem com o pedido que o gerou', () => {
    montar('resultados')
    expect(screen.getByText('Cadastre a Marina e exclua a etiqueta teste')).toBeInTheDocument()
  })

  it('sem artefatos, explica onde eles aparecem', () => {
    montar('artefatos')
    expect(screen.getByText('Nenhum artefato ainda')).toBeInTheDocument()
  })
})
