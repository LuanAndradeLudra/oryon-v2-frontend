// ─── `generatePrompt` × a derivação compartilhada (SCRUM-1013) ───────────────
//
// POR QUE ESTE ARQUIVO EXISTE. O `wizardConfigToPrompt.ts` prometia, em
// comentário, que a sua derivação de `deployment` era espelho da do
// `generatePrompt`, e que "o teste compara as duas". As duas frases eram
// falsas: o teste de espelho reimplementava a derivação numa TERCEIRA cópia,
// escrita à mão dentro dele, e comparava as duas cópias NOVAS entre si. O
// `generatePrompt` — o único caminho capaz de produzir a divergência — nunca
// era executado por teste nenhum.
//
// O Calibre provou trocando `slice(0, 20)` por `slice(0, 3)` no
// `generatePrompt`: suíte 25/25 verde, typecheck limpo.
//
// Compartilhar a função resolve METADE do problema. A outra metade é esta: se
// só um dos lados tiver teste, mutar a função compartilhada derruba um sítio
// só, e "os dois usam a mesma função" continua sendo uma afirmação que
// ninguém verifica. Este arquivo cobre o lado que faltava, e é o que faz a
// prova ser observável — mutar o `slice` dentro de `derivarDeployment` agora
// tem de quebrar AQUI e no teste do mapeador.
//
// O que se afirma aqui é o REQUEST QUE SAI, capturado na fronteira da rede.
// Não se testa a implementação da derivação (isso é do mapeador): testa-se que
// este caminho realmente passa por ela.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { AgentPromptRequest, HandoffRule } from '@/services/agentsApi'

const generateAgentPrompt = vi.fn<(r: AgentPromptRequest) => Promise<string>>()

vi.mock('@/services/agentsApi', () => ({
  generateAgentPrompt: (r: AgentPromptRequest) => generateAgentPrompt(r),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  getAgent: vi.fn(),
  addAgentKnowledge: vi.fn(),
}))

vi.mock('@/services/companyContextService', () => ({
  loadHub: () => null,
  hubToBrandLinks: () => '',
  hubHasContent: () => false,
}))

vi.mock('@/services/appLogger', () => ({
  appLogger: {
    logWizardEvent: vi.fn(), logAIGeneration: vi.fn(),
    logAIExecution: vi.fn(), logActivity: vi.fn(),
  },
}))

const { useStudioDraft } = await import('./useStudioDraft')

const regra = (over: Partial<HandoffRule>): HandoffRule => ({
  id: 'r', name: 'R', priority: 1, enabled: true, matchMode: 'any_keyword',
  keywords: [], action: 'human_handoff',
  aiGenerated: false, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
  ...over,
})

/** 25 keywords em 3 regras: passa do corte de 20 de propósito, senão o
 *  `slice` não teria como acusar nada. */
const REGRAS: HandoffRule[] = [
  regra({ id: 'r1', name: 'Reembolso', description: 'quer reembolso', department: 'Financeiro',
    keywords: Array.from({ length: 12 }, (_, i) => `reemb${i}`) }),
  regra({ id: 'r2', name: 'Reclamação', department: 'Jurídico',
    keywords: Array.from({ length: 10 }, (_, i) => `recl${i}`) }),
  regra({ id: 'r3', name: 'Cancelamento', description: 'quer cancelar',
    keywords: ['cancelar', 'cancelamento', 'desistir'] }),
]

async function gerarComoNoWizard(): Promise<AgentPromptRequest> {
  const { result } = renderHook(() => useStudioDraft())

  act(() => {
    result.current.setData((d) => ({
      ...d,
      name: 'Sofia', sector: 'ecommerce', objective: 'vender',
      handoff_rules: REGRAS,
      channels_whatsapp: true,
      channels_messenger: false,
      channels_instagram: true,
    }))
  })

  await act(async () => { await result.current.generatePrompt() })
  await waitFor(() => expect(generateAgentPrompt).toHaveBeenCalled())

  return generateAgentPrompt.mock.calls.at(-1)![0]
}

describe('useStudioDraft.generatePrompt · o deployment que sai pela rede', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    generateAgentPrompt.mockResolvedValue('# prompt')
  })

  it('corta as keywords em 20 — o corte é da função compartilhada, não daqui', async () => {
    const req = await gerarComoNoWizard()
    expect(req.deployment.escalation_keywords).toHaveLength(20)
    // A ordem também importa: é `flatMap` na ordem das regras, então o corte
    // cai no meio da segunda.
    expect(req.deployment.escalation_keywords[0]).toBe('reemb0')
    expect(req.deployment.escalation_keywords[19]).toBe('recl7')
    expect(req.deployment.escalation_keywords).not.toContain('cancelar')
  })

  it('descrição manda, e o nome da regra é a queda quando não há descrição', async () => {
    const req = await gerarComoNoWizard()
    expect(req.deployment.escalation_conditions).toEqual([
      'quer reembolso', 'Reclamação', 'quer cancelar',
    ])
  })

  it('o departamento é o do PRIMEIRO que tiver um, não o último nem uma lista', async () => {
    const req = await gerarComoNoWizard()
    expect(req.deployment.escalation_department).toBe('Financeiro')
  })

  it('os canais saem na ordem da casa, e só os ligados', async () => {
    const req = await gerarComoNoWizard()
    expect(req.deployment.channels).toEqual(['WhatsApp', 'Instagram'])
  })

  it('sem regra nenhuma, os três campos ficam vazios em vez de sumirem', async () => {
    const { result } = renderHook(() => useStudioDraft())
    act(() => {
      result.current.setData((d) => ({ ...d, name: 'Sofia', handoff_rules: [], channels_whatsapp: true }))
    })
    await act(async () => { await result.current.generatePrompt() })

    const req = generateAgentPrompt.mock.calls.at(-1)![0]
    expect(req.deployment.escalation_keywords).toEqual([])
    expect(req.deployment.escalation_conditions).toEqual([])
    // String vazia, não `undefined`: o endpoint recebe as quatro chaves sempre.
    expect(req.deployment.escalation_department).toBe('')
    expect(req.deployment.channels).toEqual(['WhatsApp'])
  })
})
