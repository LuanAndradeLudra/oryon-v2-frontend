// ─── guardReason — motivo do selo de verificação ─────────────────────────────
// Achado de homologação (04/08): um bloqueio de ENTIDADE aparecia na conversa
// como "a IA afirmou uma ação sem executar a operação no sistema". Motivo
// errado, e do tipo que manda o operador procurar a coisa errada — ele vai
// conferir se um agendamento foi gravado quando o que houve foi a IA citar um
// nome sem confirmação.
//
// A frase inteira era específica do anti-claim guard, herdada de quando ele era
// o único guard. O Verification Gateway trouxe money, temporal e entity, cujo
// `claimType` vem `null` de propósito — o agent-server manda o detalhe no
// `outcome` e o front nunca leu esse campo, então tudo caía no default do
// phantomClaimLabel.

import { describe, it, expect } from 'vitest'
import { guardReasonLabel, guardReasonTimelineLabel, phantomClaimLabel } from '@/lib/guardReason'

describe('guardReasonLabel — bolha da conversa', () => {
  it('entidade: o caso que apareceu em homologação', () => {
    const label = guardReasonLabel({
      kind: 'handoff',
      outcome: 'vg_entity_blocked',
      claimType: null,
    })

    expect(label).toBe('Verificação necessária: a IA citou um nome que não foi confirmado nesta conversa.')
    // A regressão em si: o texto não pode voltar a falar de ação.
    expect(label).not.toContain('uma ação')
  })

  it('preço e horário têm motivo próprio', () => {
    expect(guardReasonLabel({ kind: 'handoff', outcome: 'vg_money_blocked', claimType: null }))
      .toBe('Verificação necessária: a IA citou um valor que não confere com o catálogo.')
    expect(guardReasonLabel({ kind: 'handoff', outcome: 'vg_temporal_blocked', claimType: null }))
      .toBe('Verificação necessária: a IA ofereceu um horário sem consultar a agenda.')
  })

  it('ação continua com o texto e o tipo de sempre', () => {
    expect(guardReasonLabel({ kind: 'handoff', outcome: 'vg_action_blocked', claimType: 'schedule' }))
      .toBe('Verificação necessária: a IA afirmou um agendamento sem executar a operação no sistema.')
  })

  it('outcome do guard legado não regride', () => {
    // O anti-claim guard continua emitindo os outcomes dele, e eles sempre
    // foram sobre ação alegada. Nada aqui pode ter mudado.
    expect(guardReasonLabel({ kind: 'handoff', outcome: 'retry_failed_fallback', claimType: 'confirm' }))
      .toBe('Verificação necessária: a IA afirmou uma confirmação sem executar a operação no sistema.')
  })

  it('outcome desconhecido cai num texto neutro em vez de quebrar', () => {
    // O contrato do agent-server diz que valores novos de outcome são aditivos
    // e não exigem deploy casado. Um valor que ainda não tem texto próprio
    // precisa render uma frase válida.
    const label = guardReasonLabel({ kind: 'handoff', outcome: 'vg_futuro_blocked', claimType: null })
    expect(label).toMatch(/^Verificação necessária: a IA .+\.$/)
  })

  it('autocorreção usa a forma curta', () => {
    expect(guardReasonLabel({ kind: 'corrected', outcome: 'vg_money_blocked', claimType: null }))
      .toBe('A IA se autocorrigiu (valor) antes de enviar.')
    expect(guardReasonLabel({ kind: 'corrected', outcome: 'vg_entity_blocked', claimType: null }))
      .toBe('A IA se autocorrigiu (nome) antes de enviar.')
  })
})

describe('guardReasonTimelineLabel — linha do tempo', () => {
  it('carrega o mesmo motivo e o desfecho', () => {
    expect(guardReasonTimelineLabel('vg_entity_blocked', null)).toBe(
      'Verificação necessária: a IA citou um nome que não foi confirmado nesta conversa — transferido para atendente',
    )
  })

  it('tolera outcome ausente — linhas gravadas antes do gateway', () => {
    // Linhas antigas de `agent_phantom_confirmation_handoff` não têm `outcome`
    // nos details. Elas eram todas do anti-claim, então o texto de ação é o
    // correto para elas.
    expect(guardReasonTimelineLabel(null, 'schedule')).toContain('afirmou um agendamento')
  })
})

describe('phantomClaimLabel', () => {
  it('mapeia os tipos conhecidos', () => {
    expect(phantomClaimLabel('schedule')).toBe('um agendamento')
    expect(phantomClaimLabel('cancel')).toBe('um cancelamento')
    expect(phantomClaimLabel('confirm')).toBe('uma confirmação')
  })

  it('cai em "uma ação" para nulo ou desconhecido', () => {
    expect(phantomClaimLabel(null)).toBe('uma ação')
    expect(phantomClaimLabel('qualquer_outro')).toBe('uma ação')
  })
})
