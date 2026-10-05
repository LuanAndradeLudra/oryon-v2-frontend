import { describe, expect, it } from 'vitest'
import type { ChatTurnDebug } from '@/services/agentsApi'
import { fontesDaResposta, promptDeTeste } from './fontesDaResposta'

const resumo = { status: 'answered' as const, model: 'claude-haiku', turns: 1, toolsCalledCount: 0, tokens: { input: 1, output: 1, cacheRead: 0, cacheCreation: 0 } }
const debug = (d: Partial<ChatTurnDebug>): ChatTurnDebug => ({ toolCalls: [], turnSummary: resumo, guard: null, ...d })

describe('fontesDaResposta', () => {
  it('sem ferramenta nem verificação: diz que respondeu só com as instruções', () => {
    expect(fontesDaResposta(debug({}))).toEqual([{ tipo: 'instrucoes', rotulo: 'Respondeu só com as instruções' }])
  })

  it('usa o rótulo do catálogo de capacidades para ações de CRM', () => {
    const f = fontesDaResposta(debug({ toolCalls: [{ name: 'manage_deal_pipeline', kind: 'crm', success: true }] }))
    expect(f).toEqual([{ tipo: 'crm', rotulo: 'CRM: Mover negócio ou registro no funil', alerta: false }])
  })

  it('junta chamadas repetidas e marca falhas', () => {
    const f = fontesDaResposta(debug({
      toolCalls: [
        { name: 'search_kb', kind: 'kb', success: true },
        { name: 'search_kb', kind: 'kb', success: true },
        { name: 'agenda_livre', kind: 'http', success: false },
      ],
    }))
    expect(f.map((x) => x.rotulo)).toEqual(['Consultou a base de conhecimento', 'Integração: agenda livre (falhou)'])
    expect(f[1].alerta).toBe(true)
  })

  it('verificação que pediu transferência vira "chamou uma pessoa"', () => {
    const f = fontesDaResposta(debug({
      guard: { outcome: 'blocked', claimType: null, matchedText: null, handoffRequested: true, requiredSkill: null, skillFailures: [], correlationId: null },
    }))
    expect(f).toEqual([{ tipo: 'transferencia', rotulo: 'Chamou uma pessoa da equipe em vez de responder', alerta: true }])
  })

  it('sem debug (mensagem antiga): nada a mostrar', () => {
    expect(fontesDaResposta(undefined)).toEqual([])
  })
})

// Onda 3 (A12) — bancada fiel à produção.
describe('bancada: regras antes do modelo', () => {
  it('regra que respondeu aparece como regra, sem modelo, e avisa da transferência', () => {
    const f = fontesDaResposta({
      toolCalls: [], guard: null,
      simulated: { kind: 'handoff_rule', ruleName: 'Humano', message: 'Já te passo!', transfers: true },
    })
    expect(f.map((x) => x.tipo)).toEqual(['regra', 'transferencia'])
    expect(f[0].rotulo).toContain('Regra "Humano"')
    expect(f[0].rotulo).toContain('o modelo não foi chamado')
  })

  it('o prompt de teste é só o texto salvo — nada de "PRIORIDADE MÁXIMA"', () => {
    const agent = {
      system_prompt: 'Você é a Serrinha.',
      handoff_rules: { rules: [{ enabled: true, name: 'Humano', keywords: ['atendente'], matchMode: 'any_keyword', action: 'human_handoff', template: 'x' }] },
    } as never
    expect(promptDeTeste(agent)).toBe('Você é a Serrinha.')
  })
})
