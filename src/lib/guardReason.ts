// ─── Motivo do selo de verificação, legível para o operador ─────────────────
//
// Achado de homologação (04/08): um bloqueio de ENTIDADE — a IA citou um nome
// que não estava na evidência do turno — aparecia na conversa como "a IA
// afirmou uma ação sem executar a operação no sistema". Motivo errado, e de um
// jeito que induz o operador a procurar a coisa errada.
//
// A causa não era uma ramificação equivocada: a frase inteira era específica do
// anti-claim guard, herdada da Fase 33c, quando ele era o único guard que
// existia. O Verification Gateway trouxe mais três motivos (money, temporal,
// entity) e o `claimType` deles vem `null` de propósito — o comentário do
// `gatewayClaimType` no agent-server diz "the other types send null and let
// `outcome` carry the detail". O front nunca implementou esse lado do contrato,
// então todo bloqueio caía no default 'uma ação' do phantomClaimLabel.
//
// Por que a interpretação mora AQUI e não no agent-server: o contrato do
// `outcome.ts` é explícito — "additive by design: the frontend already
// raw-prints outcomes it doesn't recognise, and the backend treats the field as
// an opaque string. Nothing downstream needs to ship in lockstep." Um valor
// novo de outcome cai no default abaixo e não quebra nada; texto em português
// no agent-server exigiria deploy casado dos dois.
//
// Vive em lib/ porque MessageBubble e ConversationActivitySection precisavam do
// mesmo rótulo e cada um tinha a sua cópia do phantomClaimLabel. Foi
// exatamente esse padrão — a mesma função em dois lugares, divergindo em
// silêncio — que produziu o SCRUM-278.

/** Tipo de ação alegada, quando o bloqueio é de action claim. */
export function phantomClaimLabel(raw: string | null | undefined): string {
  switch (raw) {
    case 'schedule': return 'um agendamento'
    case 'cancel': return 'um cancelamento'
    case 'confirm': return 'uma confirmação'
    default: return 'uma ação'
  }
}

/** Outcomes que o Verification Gateway emite, no formato `vg_<tipo>_blocked`. */
type GuardCopy = { long: string; short: string }

function copyFor(outcome: string | null | undefined, claimType: string | null | undefined): GuardCopy {
  switch (outcome) {
    case 'vg_money_blocked':
      return { long: 'citou um valor que não confere com o catálogo', short: 'valor' }
    case 'vg_temporal_blocked':
      return { long: 'ofereceu um horário sem consultar a agenda', short: 'horário' }
    case 'vg_entity_blocked':
      return { long: 'citou um nome que não foi confirmado nesta conversa', short: 'nome' }
    case 'vg_action_blocked':
      return {
        long: `afirmou ${phantomClaimLabel(claimType)} sem executar a operação no sistema`,
        short: phantomClaimLabel(claimType),
      }
    default:
      // Cobre os outcomes do anti-claim guard legado (retry_failed_fallback,
      // regenerated_ok…), que sempre foram sobre ação alegada, e qualquer
      // outcome novo que ainda não tenha texto próprio. O detalhe técnico
      // continua visível no modal de detalhes.
      return {
        long: `afirmou ${phantomClaimLabel(claimType)} sem executar a operação no sistema`,
        short: phantomClaimLabel(claimType),
      }
  }
}

/** Frase completa do selo na bolha e na linha do tempo. */
export function guardReasonLabel(anomaly: {
  kind: 'handoff' | 'corrected'
  outcome?: string | null
  claimType?: string | null
}): string {
  const copy = copyFor(anomaly.outcome, anomaly.claimType)
  return anomaly.kind === 'handoff'
    ? `Verificação necessária: a IA ${copy.long}.`
    : `A IA se autocorrigiu (${copy.short}) antes de enviar.`
}

/** Variante para a linha do tempo, que já diz o desfecho no fim da frase. */
export function guardReasonTimelineLabel(
  outcome: string | null | undefined,
  claimType: string | null | undefined,
): string {
  return `Verificação necessária: a IA ${copyFor(outcome, claimType).long} — transferido para atendente`
}
