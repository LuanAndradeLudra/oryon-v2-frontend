import { describe, it, expect } from 'vitest'
import { computeOnboardingState, type OnboardingInput } from './onboardingState'
import { formatPhone } from '@/lib/phone'
import type { WhatsAppNumber, WhatsAppTemplate } from '@/types'

let seq = 0

function line(patch: Partial<WhatsAppNumber> = {}): WhatsAppNumber {
  seq += 1
  return { id: `n${seq}`, displayPhoneNumber: '5511999887766', status: 'CONNECTED', ...patch }
}

function tpl(patch: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  seq += 1
  return {
    id: `t${seq}`,
    tenantId: 'tenant',
    name: `template_${seq}`,
    language: 'pt_BR',
    category: 'MARKETING',
    status: 'APPROVED',
    body: 'Corpo',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...patch,
  }
}

function state(input: Partial<OnboardingInput> = {}) {
  return computeOnboardingState(
    { numbers: [], templates: [], campaignCount: 0, ...input },
    formatPhone,
  )
}

describe('computeOnboardingState', () => {
  it('conta vazia: o passo 1 é o atual e os outros dois esperam', () => {
    const s = state()
    expect(s.steps.map((x) => x.status)).toEqual(['current', 'todo', 'todo'])
    expect(s.doneCount).toBe(0)
    expect(s.remaining).toBe(3)
    expect(s.complete).toBe(false)
  })

  it('linha desativada não conta como linha conectada', () => {
    // `isActive: false` é a linha que existe mas não envia. Contá-la faria o
    // passo 2 liberar para um envio que falha na Meta.
    const s = state({ numbers: [line({ isActive: false })] })
    expect(s.steps[0].status).toBe('current')
    expect(s.doneCount).toBe(0)
  })

  it('`isActive` ausente conta como ativa — o campo é opcional no tipo', () => {
    const s = state({ numbers: [line()] })
    expect(s.steps[0].status).toBe('done')
  })

  it('o subtítulo da linha traz rótulo e telefone formatado, sem inventar selo', () => {
    const s = state({ numbers: [line({ label: 'WhatsApp Comercial' })] })
    expect(s.steps[0].detail).toBe('WhatsApp Comercial · +55 11 99988-7766')
    // "qualidade alta" do mockup depende de `/meta/health`, que é admin-only:
    // não sai daqui.
    expect(s.steps[0].detail).not.toMatch(/qualidade/)
  })

  it('sem rótulo, o subtítulo é só o telefone', () => {
    const s = state({ numbers: [line()] })
    expect(s.steps[0].detail).toBe('+55 11 99988-7766')
  })

  it('template aprovado fecha o passo 2 e o passo 3 vira o atual', () => {
    const s = state({ numbers: [line()], templates: [tpl()] })
    expect(s.steps.map((x) => x.status)).toEqual(['done', 'done', 'current'])
    expect(s.doneCount).toBe(2)
    expect(s.remaining).toBe(1)
  })

  it.each(['REJECTED', 'PAUSED', 'DISABLED', 'PENDING'] as const)(
    'template %s não conta como aprovado',
    (status) => {
      const s = state({ numbers: [line()], templates: [tpl({ status })] })
      expect(s.steps[1].status).toBe('current')
      expect(s.doneCount).toBe(1)
    },
  )

  it('aprovado mas sem linha atribuída não conta — não dá para disparar por ele', () => {
    // Migration #045: linha legada em tenant multi-WABA. Contar como pronto
    // liberaria o passo 3 para um envio que o backend recusa.
    const s = state({ numbers: [line()], templates: [tpl({ needsWabaAssignment: true })] })
    expect(s.steps[1].status).toBe('current')
  })

  it('em análise vira o chip âmbar, com contagem e o nome do mais recente', () => {
    const s = state({
      numbers: [line()],
      templates: [
        tpl({ status: 'PENDING', name: 'antigo', updatedAt: '2026-09-01T08:00:00Z' }),
        tpl({ status: 'PENDING', name: 'boas_vindas_v1', updatedAt: '2026-09-01T20:00:00Z' }),
      ],
    })
    expect(s.steps[1].pending).toEqual({ count: 2, latestName: 'boas_vindas_v1' })
  })

  it('sem nenhum em análise, não há chip — ausente, não zero', () => {
    const s = state({ numbers: [line()], templates: [tpl()] })
    expect(s.steps[1].pending).toBeUndefined()
  })

  it('uma campanha existente fecha o checklist', () => {
    const s = state({ numbers: [line()], templates: [tpl()], campaignCount: 1 })
    expect(s.complete).toBe(true)
    expect(s.doneCount).toBe(3)
    expect(s.remaining).toBe(0)
    expect(s.steps.map((x) => x.status)).toEqual(['done', 'done', 'done'])
  })

  it('só um passo é `current` em qualquer combinação', () => {
    const combos: Partial<OnboardingInput>[] = [
      {},
      { numbers: [line()] },
      { numbers: [line()], templates: [tpl()] },
      { templates: [tpl()] },
      { campaignCount: 3 },
      { numbers: [line()], campaignCount: 3 },
    ]
    for (const combo of combos) {
      const s = state(combo)
      expect(s.steps.filter((x) => x.status === 'current').length).toBeLessThanOrEqual(1)
    }
  })

  it('passo já feito fora de ordem continua feito, e o atual é o primeiro pendente', () => {
    // Uma campanha rascunho pode existir antes do template aprovado. O passo 3
    // não "desfaz"; quem manda no `current` é o primeiro pendente.
    const s = state({ campaignCount: 2 })
    expect(s.steps.map((x) => x.status)).toEqual(['current', 'todo', 'done'])
    expect(s.doneCount).toBe(1)
    expect(s.remaining).toBe(2)
  })

  it('remaining é sempre 3 menos os feitos', () => {
    expect(state().remaining).toBe(3)
    expect(state({ numbers: [line()] }).remaining).toBe(2)
    expect(state({ numbers: [line()], templates: [tpl()] }).remaining).toBe(1)
    expect(state({ numbers: [line()], templates: [tpl()], campaignCount: 1 }).remaining).toBe(0)
  })
})
