// ─── `publish()` × edição em voo (A2 / SCRUM-1013) ───────────────────────────
//
// Achado da Régua no #135, medido com cliente diferido. O `publish()` fazia,
// DEPOIS do `await`, `setDraft(null)` + `writeStoredDraft(agent.id, null)` — a
// partir do retrato de rascunho de quando o publish começou. Quem continuava
// digitando enquanto a rede respondia perdia o que escreveu, da tela e do
// `localStorage`, e `changedFields` voltava vazio: a tela afirmava "nada
// pendente" no instante em que acabara de descartar o que estava pendente.
//
// A suíte não via nada disso — apagar as duas linhas deixava 44/44 verde.
// Mutação que não derruba nada é achado: não havia teste do `setDraft(null)`
// em direção nenhuma, nem que limpa nem que apaga demais. Este arquivo cobre as
// DUAS direções, porque cobrir só a corrida deixaria "nunca mais limpe nada"
// passar como conserto.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'

const updateAgent = vi.fn()
const draftPatch = vi.fn()

vi.mock('@/services/agentsApi', () => ({
  updateAgent: (...a: unknown[]) => updateAgent(...a),
}))

// AS.2 fora do ar: é o caminho `available=false`, que é o que roda hoje e o
// único em que o `updateAgent` aparece. `withFallback` só engole 404/501.
vi.mock('@/services/agentsOpsApi', () => ({
  agentDraftApi: {
    get: () => Promise.reject(Object.assign(new Error('nope'), { response: { status: 404 } })),
    patch: (...a: unknown[]) => draftPatch(...a),
    publish: () => Promise.reject(Object.assign(new Error('nope'), { response: { status: 404 } })),
    discard: () => Promise.resolve(),
  },
}))

const { useAgentDraft } = await import('./useAgentDraft')
const { draftStorageKey } = await import('./agentDraftCore')

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((res) => { resolve = res })
  return { promise, resolve }
}

const AGENTE = {
  id: 'a1', tenant_id: 't1', created_by: null, name: 'Sofia', icon: 'bot',
  sector: 'Vendas', objective: null, status: 'active',
  system_prompt: 'PUBLICADO',
  handoff_rules: {}, channels: {}, wizard_config: {},
  test_count: 0, last_tested_at: null, conversation_count: 0,
  created_at: '', updated_at: '', tools: [],
} as unknown as AgentConfigWithTools

const guardado = () => localStorage.getItem(draftStorageKey(AGENTE.id))

describe('useAgentDraft.publish · a edição feita durante o voo sobrevive', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    draftPatch.mockResolvedValue(undefined)
  })
  afterEach(() => { localStorage.clear() })

  it('editar DURANTE o publish não perde o que foi digitado', async () => {
    const voo = deferred<AgentConfig>()
    updateAgent.mockReturnValue(voo.promise)

    const { result } = renderHook(() => useAgentDraft(AGENTE, () => {}))
    await waitFor(() => expect(result.current.available).toBe(false))

    act(() => { result.current.setDraftField('system_prompt', 'RASCUNHO A') })
    expect(result.current.changedFields).toEqual(['system_prompt'])

    // Publica e NÃO resolve: a rede fica em voo.
    let publicando!: Promise<void>
    act(() => { publicando = result.current.publish() })
    await waitFor(() => expect(result.current.publishing).toBe(true))

    // A pessoa continua digitando — o textarea não está desabilitado.
    act(() => { result.current.setDraftField('system_prompt', 'RASCUNHO B') })
    expect(guardado()).toContain('RASCUNHO B')

    // A rede responde com o que foi ENVIADO (o A), que é o que o servidor viu.
    await act(async () => {
      voo.resolve({ ...AGENTE, system_prompt: 'RASCUNHO A' } as AgentConfig)
      await publicando
    })

    // O B tem de continuar de pé: na tela, no changedFields e no localStorage.
    expect(result.current.draft).toEqual({ system_prompt: 'RASCUNHO B' })
    expect(result.current.changedFields).toEqual(['system_prompt'])
    expect(guardado()).toContain('RASCUNHO B')
    // E o que foi enviado é o retrato do clique, não o texto de depois.
    expect(updateAgent).toHaveBeenCalledWith('a1', { system_prompt: 'RASCUNHO A' })
  })

  it('GUARDA contra o conserto exagerado: publicar sem editar junto ainda limpa', async () => {
    // Sem este caso, "nunca mais limpe nada" passaria como correção — e aí o
    // "Alterações (N)" ficaria contando alteração já publicada para sempre.
    updateAgent.mockImplementation((_id: string, campos: Partial<AgentConfig>) =>
      Promise.resolve({ ...AGENTE, ...campos } as AgentConfig))

    let publicado = AGENTE
    const { result, rerender } = renderHook(
      ({ agente }: { agente: AgentConfigWithTools }) =>
        useAgentDraft(agente, (a) => { publicado = { ...a, tools: [] } as AgentConfigWithTools }),
      { initialProps: { agente: AGENTE } },
    )
    await waitFor(() => expect(result.current.available).toBe(false))

    act(() => { result.current.setDraftField('system_prompt', 'NOVO') })
    await act(async () => { await result.current.publish() })

    // Quem limpa é o efeito sobre o agente novo, via `pruneDraft` — então o
    // consumidor tem de repassar o agente publicado, que é o que a página faz.
    rerender({ agente: publicado })

    await waitFor(() => expect(result.current.changedFields).toEqual([]))
    expect(result.current.draft).toBeNull()
    expect(guardado()).toBeNull()
  })
})
