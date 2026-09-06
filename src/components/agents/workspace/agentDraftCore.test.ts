import { describe, it, expect, beforeEach } from 'vitest'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import {
  DRAFT_FIELDS, changeSummary, changedFields, draftStorageKey, fieldAccent,
  fieldLabel, isDraftField, pruneDraft, readStoredDraft, sameValue,
  writeStoredDraft,
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

describe('agentDraftCore — acento por campo', () => {
  it('usa o acento da seção dona, o mesmo que o snav pinta', () => {
    // O mockup (`p2a-agentes.html:142`) pinta "Regras" em rosa e "Capacidades"
    // em verde, que são exatamente os acentos dessas seções na nav.
    expect(fieldAccent('handoff_rules')).toBe('rose')
    expect(fieldAccent('crm_capabilities')).toBe('green')
    expect(fieldAccent('system_prompt')).toBe('violet')
    expect(fieldAccent('decision_criteria_tags')).toBe('cyan')
  })

  it('campo desconhecido cai em brand em vez de sumir da lista', () => {
    // Mesma razão do `fieldLabel`: sumir faria o contador dizer 3 e a lista
    // mostrar 2.
    expect(fieldAccent('campo_que_o_backend_inventou')).toBe('brand')
  })
})

describe('agentDraftCore — resumo da alteração', () => {
  it('conta as regras em vez de dizer só que mudou', () => {
    const agent = makeAgent({ handoff_rules: { rules: [{ id: '1' }, { id: '2' }, { id: '3' }] } } as never)
    const draft = { handoff_rules: { rules: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }] } }
    expect(changeSummary(agent, draft, 'handoff_rules')).toBe('3 → 4 regras')
  })

  it('usa o singular quando o resultado é um só', () => {
    const agent = makeAgent({ handoff_rules: { rules: [{ id: '1' }, { id: '2' }] } } as never)
    expect(changeSummary(agent, { handoff_rules: { rules: [{ id: '1' }] } }, 'handoff_rules')).toBe('2 → 1 regra')
  })

  it('conta só o canal LIGADO, não a chave presente', () => {
    const agent = makeAgent({ channels: { whatsapp: true, instagram: false } } as never)
    expect(changeSummary(agent, { channels: { whatsapp: true, instagram: true } }, 'channels'))
      .toBe('1 → 2 canais')
  })

  it('texto longo vira tamanho, com separador de milhar pt-BR', () => {
    const agent = makeAgent({ system_prompt: 'x'.repeat(1842) })
    expect(changeSummary(agent, { system_prompt: 'x'.repeat(1910) }, 'system_prompt'))
      .toBe('1.842 → 1.910 caracteres')
  })

  it('texto curto mostra o VALOR, que diz mais que o tamanho dele', () => {
    const agent = makeAgent()
    expect(changeSummary(agent, { preferred_model: 'claude-opus-5' }, 'preferred_model'))
      .toBe('— → claude-opus-5')
  })

  it('não inventa número quando o shape não é o esperado', () => {
    // `handoff_rules` sem a lista dentro: cai no genérico em vez de afirmar
    // uma contagem que ninguém consegue verificar.
    const agent = makeAgent({ handoff_rules: { outra_coisa: 1 } } as never)
    expect(changeSummary(agent, { handoff_rules: { outra_coisa: 2 } }, 'handoff_rules'))
      .toBe('Editado neste rascunho')
  })
})
