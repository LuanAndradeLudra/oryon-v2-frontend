import { describe, it, expect, beforeEach } from 'vitest'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import {
  DRAFT_FIELDS, changedFields, draftStorageKey, fieldLabel, isDraftField,
  pruneDraft, readStoredDraft, sameValue, writeStoredDraft,
} from './agentDraftCore'

function makeAgent(over: Partial<AgentConfigWithTools> = {}): AgentConfigWithTools {
  return {
    id: 'a1',
    tenant_id: 't1',
    created_by: null,
    name: 'Sofia',
    icon: 'bot',
    sector: null,
    objective: null,
    status: 'active',
    system_prompt: 'prompt publicado',
    handoff_rules: { rules: [] },
    channels: {},
    wizard_config: {},
    test_count: 0,
    last_tested_at: null,
    conversation_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    tools: [],
    ...over,
  } as unknown as AgentConfigWithTools
}

describe('agentDraftCore — campos rascunháveis', () => {
  it('cobre exatamente o subconjunto do contrato AS.2, sem repetido', () => {
    expect(new Set(DRAFT_FIELDS).size).toBe(DRAFT_FIELDS.length)
    expect(DRAFT_FIELDS).toContain('system_prompt')
    expect(DRAFT_FIELDS).toContain('handoff_rules')
    expect(isDraftField('system_prompt')).toBe(true)
    // `name`/`status` são edição direta, não rascunho — não podem entrar.
    expect(isDraftField('name')).toBe(false)
    expect(isDraftField('status')).toBe(false)
  })

  it('todo campo tem rótulo humano, e campo desconhecido não some', () => {
    for (const f of DRAFT_FIELDS) {
      expect(fieldLabel(f)).not.toBe(f)
      expect(fieldLabel(f).length).toBeGreaterThan(0)
    }
    // Backend pode mandar um campo novo antes de o frontend conhecê-lo: cai no
    // próprio nome, senão o contador diria 3 e a lista mostraria 2.
    expect(fieldLabel('campo_novo_do_backend')).toBe('campo_novo_do_backend')
  })
})

describe('agentDraftCore — comparação de valor', () => {
  it('compara objeto por estrutura, não por referência', () => {
    // O caso que importa: re-render recria o objeto com o MESMO conteúdo.
    expect(sameValue({ rules: [] }, { rules: [] })).toBe(true)
    expect(sameValue({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    expect(sameValue({ rules: [{ k: 'x' }] }, { rules: [{ k: 'y' }] })).toBe(false)
  })

  it('array respeita ordem (regra reordenada É uma alteração)', () => {
    expect(sameValue([1, 2], [2, 1])).toBe(false)
    expect(sameValue([1, 2], [1, 2])).toBe(true)
  })

  it('null/undefined não são tratados como iguais a objeto vazio', () => {
    expect(sameValue(null, {})).toBe(false)
    expect(sameValue(undefined, null)).toBe(false)
    expect(sameValue(null, null)).toBe(true)
  })

  it('valor cíclico não lança e não é dado como igual', () => {
    const a: Record<string, unknown> = {}
    a.self = a
    const b: Record<string, unknown> = {}
    b.self = b
    expect(() => sameValue(a, b)).not.toThrow()
    expect(sameValue(a, b)).toBe(false)
  })
})

describe('agentDraftCore — changedFields', () => {
  const agent = makeAgent()

  it('rascunho vazio ou nulo não gera alteração', () => {
    expect(changedFields(agent, null)).toEqual([])
    expect(changedFields(agent, {})).toEqual([])
  })

  it('conta só o que difere do publicado', () => {
    expect(changedFields(agent, { system_prompt: 'novo' })).toEqual(['system_prompt'])
    // Mesmo valor do publicado NÃO conta — é o caso de desfazer na mão.
    expect(changedFields(agent, { system_prompt: 'prompt publicado' })).toEqual([])
    // Objeto igual em conteúdo também não conta.
    expect(changedFields(agent, { handoff_rules: { rules: [] } })).toEqual([])
  })

  it('mantém a ordem de DRAFT_FIELDS, não a de digitação', () => {
    const out = changedFields(agent, { handoff_rules: { rules: [{ k: 'x' }] }, system_prompt: 'novo' })
    expect(out).toEqual(['system_prompt', 'handoff_rules'])
  })

  it('ignora chave que não é campo de rascunho', () => {
    const draft = { name: 'Outro nome' } as unknown as Parameters<typeof changedFields>[1]
    expect(changedFields(agent, draft)).toEqual([])
  })
})

describe('agentDraftCore — pruneDraft', () => {
  const agent = makeAgent()

  it('remove campo que voltou ao valor publicado', () => {
    expect(pruneDraft(agent, { system_prompt: 'novo', handoff_rules: { rules: [] } }))
      .toEqual({ system_prompt: 'novo' })
  })

  it('devolve null quando nada difere — é o que zera "Alterações (N)"', () => {
    expect(pruneDraft(agent, { system_prompt: 'prompt publicado' })).toBeNull()
    expect(pruneDraft(agent, {})).toBeNull()
    expect(pruneDraft(agent, null)).toBeNull()
  })
})

describe('agentDraftCore — persistência local', () => {
  beforeEach(() => localStorage.clear())

  it('a chave é por agente (dois agentes não se misturam)', () => {
    expect(draftStorageKey('a1')).not.toBe(draftStorageKey('a2'))
  })

  it('grava e lê de volta', () => {
    writeStoredDraft('a1', { system_prompt: 'x' })
    expect(readStoredDraft('a1')).toEqual({ system_prompt: 'x' })
  })

  it('null apaga a chave', () => {
    writeStoredDraft('a1', { system_prompt: 'x' })
    writeStoredDraft('a1', null)
    expect(readStoredDraft('a1')).toBeNull()
  })

  it('descarta lixo em vez de lançar', () => {
    localStorage.setItem(draftStorageKey('a1'), 'não é json')
    expect(readStoredDraft('a1')).toBeNull()
    localStorage.setItem(draftStorageKey('a1'), '[1,2,3]')
    expect(readStoredDraft('a1')).toBeNull()
    localStorage.setItem(draftStorageKey('a1'), 'null')
    expect(readStoredDraft('a1')).toBeNull()
  })

  it('filtra campo que não é de rascunho ao ler (defesa contra chave adulterada)', () => {
    localStorage.setItem(draftStorageKey('a1'), JSON.stringify({ system_prompt: 'x', status: 'active' }))
    expect(readStoredDraft('a1')).toEqual({ system_prompt: 'x' })
  })

  it('objeto só com campos inválidos vira null, não rascunho vazio', () => {
    localStorage.setItem(draftStorageKey('a1'), JSON.stringify({ status: 'active' }))
    expect(readStoredDraft('a1')).toBeNull()
  })
})
