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
import {
  guardCheckGuidance,
  guardCorrectedTimelineLabel,
  guardOutcomeDetail,
  guardReasonLabel,
  guardReasonTimelineLabel,
  guardTypeLabel,
  phantomClaimLabel,
} from '@/lib/guardReason'

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

  it('outcome NOVO do gateway cai em texto neutro, nunca no de ação', () => {
    // O contrato do agent-server diz que valores novos de outcome são aditivos
    // e não exigem deploy casado. Mas cair na cópia de ação reproduziria o
    // defeito de 04/08 com um tipo futuro no lugar do entity: o operador leria
    // "afirmou uma ação" e iria procurar um agendamento que ninguém alegou.
    const label = guardReasonLabel({ kind: 'handoff', outcome: 'vg_politica_blocked', claimType: null })
    expect(label).toMatch(/^Verificação necessária: a IA .+\.$/)
    expect(label).not.toContain('uma ação')
    expect(label).not.toContain('operação no sistema')
  })

  it('outcome legado NÃO-vg continua na cópia de ação', () => {
    // O discriminador é o prefixo `vg_`, que o gatewayOutcome garante. Os
    // outcomes do anti-claim sempre foram sobre ação alegada.
    expect(guardReasonLabel({ kind: 'handoff', outcome: 'no_required_skill', claimType: 'cancel' }))
      .toContain('afirmou um cancelamento')
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

// ── O modal de detalhe ───────────────────────────────────────────────────────
// O selo na bolha foi corrigido primeiro, mas o modal que ele abre mantinha as
// próprias cópias e continuava dizendo "afirmou ter concluído a ação". A
// contradição aparecia exatamente onde o operador vai buscar o detalhe.
describe('guardOutcomeDetail', () => {
  it('entity não fala mais de ação concluída', () => {
    const detail = guardOutcomeDetail('vg_entity_blocked', null)
    expect(detail).toBe('A IA citou um nome que não foi confirmado nesta conversa.')
    expect(detail).not.toContain('ação')
  })

  it('preserva as explicações de mecânica do guard legado', () => {
    // Esses descrevem COMO o anti-claim agiu, não que tipo de fato faltou —
    // eixo diferente, e têm precedência.
    expect(guardOutcomeDetail('no_required_skill', 'schedule'))
      .toBe('O agente não tem a ferramenta necessária configurada para executar essa ação.')
    expect(guardOutcomeDetail('retry_failed_fallback', 'confirm'))
      .toBe('A IA foi instruída a refazer chamando a ferramenta, mas não concluiu a operação.')
    expect(guardOutcomeDetail('regenerated_ok', null))
      .toBe('A IA se corrigiu e executou a operação corretamente antes de responder.')
  })
})

describe('guardCheckGuidance', () => {
  it('manda o operador conferir a coisa certa', () => {
    expect(guardCheckGuidance('vg_money_blocked', null)).toContain('catálogo')
    expect(guardCheckGuidance('vg_temporal_blocked', null)).toContain('agenda')
    expect(guardCheckGuidance('vg_entity_blocked', null)).toContain('pessoa citada')
  })

  it('e para ação continua mandando conferir o sistema', () => {
    expect(guardCheckGuidance('vg_action_blocked', 'schedule'))
      .toContain('Confirme se um agendamento realmente precisa ser feito no sistema')
  })
})

describe('guardTypeLabel', () => {
  it('não chama de "ação" o que não é ação', () => {
    expect(guardTypeLabel('vg_money_blocked', null)).toBe('Preço')
    expect(guardTypeLabel('vg_temporal_blocked', null)).toBe('Horário')
    expect(guardTypeLabel('vg_entity_blocked', null)).toBe('Nome citado')
    expect(guardTypeLabel('vg_action_blocked', 'cancel')).toBe('um cancelamento')
  })
})

describe('guardCorrectedTimelineLabel', () => {
  it('a autocorreção também carrega o motivo real', () => {
    expect(guardCorrectedTimelineLabel('vg_money_blocked', null))
      .toBe('A IA citou um valor que não confere com o catálogo — corrigido automaticamente antes de enviar')
  })

  it('linha antiga sem outcome continua legível', () => {
    expect(guardCorrectedTimelineLabel(null, 'confirm')).toContain('afirmou uma confirmação')
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

// ─── findingReasonLabel (sinal v2 — SCRUM-511) ──────────────────────────────
// A legenda de cada trecho marcado na mensagem retida. Mesmo contrato aditivo
// do resto do arquivo: motivo novo cai em default honesto, nunca em texto de
// outro tipo.
import { findingReasonLabel } from '../lib/guardReason'

describe('findingReasonLabel', () => {
  it('rotula os motivos conhecidos por (type, reason)', () => {
    expect(findingReasonLabel('money', 'price_pair_mismatch')).toBe('valor não confere com o convênio citado')
    expect(findingReasonLabel('temporal', 'no_temporal_source')).toBe('horário oferecido sem consultar a agenda')
    expect(findingReasonLabel('temporal', 'slot_not_attested')).toBe('horário fora da agenda consultada')
    expect(findingReasonLabel('entity', 'entity_not_in_ledger')).toBe('nome sem cadastro correspondente')
  })

  it('motivo NOVO cai no default do TYPE — nunca no texto de outro motivo', () => {
    expect(findingReasonLabel('money', 'motivo_que_nao_existe')).toBe('valor sem confirmação')
    expect(findingReasonLabel('temporal', 'motivo_que_nao_existe')).toBe('horário sem confirmação')
  })

  it('type desconhecido cai no default neutro', () => {
    expect(findingReasonLabel('politica', 'x')).toBe('sem confirmação nas fontes')
    expect(findingReasonLabel(null, null)).toBe('sem confirmação nas fontes')
  })
})
