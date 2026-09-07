import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorkspaceHeader } from './WorkspaceHeader'
import type { UseAgentDraft } from './useAgentDraft'
import type { AgentConfigWithTools } from '@/services/agentsApi'

const updateAgent = vi.fn()
vi.mock('@/services/agentsApi', () => ({
  updateAgent: (...a: unknown[]) => updateAgent(...a),
}))

function makeAgent(over: Partial<AgentConfigWithTools> = {}): AgentConfigWithTools {
  return {
    id: 'a1', name: 'Sofia', status: 'active',
    system_prompt: 'prompt publicado',
    handoff_rules: { rules: [{ id: '1' }, { id: '2' }] },
    channels: {}, wizard_config: {}, updated_at: '2026-01-01T00:00:00Z',
    ...over,
  } as unknown as AgentConfigWithTools
}

function makeDraft(over: Partial<UseAgentDraft> = {}): UseAgentDraft {
  return {
    draft: { handoff_rules: { rules: [{ id: '1' }, { id: '2' }, { id: '3' }] } },
    changedFields: ['handoff_rules'],
    isDirty: true,
    setDraftField: vi.fn(),
    publish: vi.fn().mockResolvedValue(undefined),
    discard: vi.fn(),
    publishing: false,
    publishError: null,
    available: false,
    ...over,
  }
}

describe('WorkspaceHeader — "Alterações (N)" revela, não descarta', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    updateAgent.mockResolvedValue(makeAgent())
  })

  it('clicar no botão NÃO descarta nada — ele só abre a lista', async () => {
    // Este é o defeito: o botão chamava `discard()` direto, apagando também no
    // servidor, sem confirmação, com rótulo substantivo e ícone de histórico.
    const draft = makeDraft()
    render(<WorkspaceHeader agent={makeAgent()} draft={draft} onUpdate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Alterações \(1\)/ }))

    expect(draft.discard).not.toHaveBeenCalled()
    expect(await screen.findByText('1 alteração não publicada')).toBeInTheDocument()
  })

  it('a lista mostra O QUE mudou, não a mesma frase repetida', async () => {
    render(<WorkspaceHeader agent={makeAgent()} draft={makeDraft()} onUpdate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Alterações/ }))

    expect(await screen.findByText('Regras')).toBeInTheDocument()
    expect(screen.getByText('2 → 3 regras')).toBeInTheDocument()
  })

  it('o Descartar mora dentro da lista, tem nome de verbo e PEDE confirmação', async () => {
    const draft = makeDraft()
    render(<WorkspaceHeader agent={makeAgent()} draft={draft} onUpdate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Alterações/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar alterações' }))

    // Abriu o diálogo e ainda não destruiu nada.
    expect(await screen.findByText('Descartar alterações?')).toBeInTheDocument()
    expect(draft.discard).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(draft.discard).toHaveBeenCalledTimes(1)
  })

  it('cancelar a confirmação preserva o rascunho', async () => {
    const draft = makeDraft()
    render(<WorkspaceHeader agent={makeAgent()} draft={draft} onUpdate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Alterações/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar alterações' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(draft.discard).not.toHaveBeenCalled()
  })

  it('sem alteração o botão não existe — e nada abre', () => {
    render(
      <WorkspaceHeader
        agent={makeAgent()}
        draft={makeDraft({ isDirty: false, changedFields: [], draft: null })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /Alterações/ })).not.toBeInTheDocument()
    // "Publicar" continua visível, desabilitado — é mais honesto que sumir.
    expect(screen.getByRole('button', { name: /Publicar/ })).toBeDisabled()
  })

  it('a lista não rouba o foco ao montar — só a AÇÃO de abrir move foco', async () => {
    render(<WorkspaceHeader agent={makeAgent()} draft={makeDraft()} onUpdate={vi.fn()} />)

    expect(document.body).toHaveFocus()

    const gatilho = screen.getByRole('button', { name: /Alterações/ })
    fireEvent.click(gatilho)
    await screen.findByText('1 alteração não publicada')
    await waitFor(() => expect(gatilho).not.toHaveFocus())
  })

  it('o switch não alcança "draft" — fica desligado e desabilitado, sem fingir que um rascunho está no ar', () => {
    render(
      <WorkspaceHeader agent={makeAgent({ status: 'draft' })} draft={makeDraft()} onUpdate={vi.fn()} />,
    )
    const sw = screen.getByRole('switch')
    expect(sw).toBeDisabled()
    expect(sw).not.toBeChecked()
  })
})
