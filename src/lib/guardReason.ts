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

/** Todo o texto voltado ao operador para um bloqueio, num lugar só. */
interface GuardCopy {
  /** Frase do selo: "Verificação necessária: a IA {long}." */
  long: string
  /** Forma curta, para a autocorreção: "A IA se autocorrigiu ({short})". */
  short: string
  /** O que o operador deve conferir — bloco "O que verificar" do modal. */
  guidance: string
  /** Rótulo da linha "Tipo" no modal. */
  typeLabel: string
}

/** Cópia do anti-claim: ação alegada sem execução. */
function actionCopy(claimType: string | null | undefined): GuardCopy {
  const claim = phantomClaimLabel(claimType)
  return {
    long: `afirmou ${claim} sem executar a operação no sistema`,
    short: claim,
    guidance:
      `Confirme se ${claim} realmente precisa ser feito no sistema. ` +
      'Como a IA não concluiu a operação, ela pode não ter sido registrada.',
    typeLabel: claim,
  }
}

function copyFor(outcome: string | null | undefined, claimType: string | null | undefined): GuardCopy {
  switch (outcome) {
    case 'vg_money_blocked':
      return {
        long: 'citou um valor que não confere com o catálogo',
        short: 'valor',
        guidance: 'Confira o valor correto no catálogo antes de confirmar com o cliente.',
        typeLabel: 'Preço',
      }
    case 'vg_temporal_blocked':
      return {
        long: 'ofereceu um horário sem consultar a agenda',
        short: 'horário',
        guidance: 'Confirme na agenda se o horário oferecido existe e continua livre.',
        typeLabel: 'Horário',
      }
    case 'vg_entity_blocked':
      return {
        long: 'citou um nome que não foi confirmado nesta conversa',
        short: 'nome',
        guidance: 'Confirme se a pessoa citada realmente atende aqui antes de seguir.',
        typeLabel: 'Nome citado',
      }
    case 'vg_action_blocked':
      return actionCopy(claimType)
    default:
      // Um outcome do GATEWAY que ainda não tem texto próprio precisa cair em
      // algo neutro. Devolver a cópia de ação aqui reproduziria exatamente o
      // defeito de 04/08 — só que com um tipo futuro em vez de entity: o
      // operador lê "afirmou uma ação" e vai procurar um agendamento que
      // ninguém alegou. `gatewayOutcome` garante o prefixo `vg_`, então ele é
      // um discriminador confiável.
      if (typeof outcome === 'string' && outcome.startsWith('vg_')) {
        return {
          long: 'afirmou algo que não pôde ser confirmado',
          short: 'verificação',
          guidance: 'Confira a resposta da IA antes de seguir — algo nela não tinha confirmação.',
          typeLabel: 'Não confirmado',
        }
      }
      // Outcomes do anti-claim legado (retry_failed_fallback, regenerated_ok…)
      // sempre foram sobre ação alegada; a cópia de ação é a correta para eles.
      return actionCopy(claimType)
  }
}

/**
 * Explicação técnica do desfecho, para o modal de detalhe.
 *
 * Os outcomes legados descrevem a MECÂNICA do anti-claim (não tinha a skill,
 * a retentativa falhou); os do gateway descrevem QUE TIPO de fato não tinha
 * lastro. São eixos diferentes, então os legados têm precedência sobre o texto
 * por tipo — não há tipo a informar quando o guard legado é quem agiu.
 */
export function guardOutcomeDetail(
  outcome: string | null | undefined,
  claimType: string | null | undefined,
): string {
  switch (outcome) {
    case 'no_required_skill':
      return 'O agente não tem a ferramenta necessária configurada para executar essa ação.'
    case 'retry_failed_fallback':
      return 'A IA foi instruída a refazer chamando a ferramenta, mas não concluiu a operação.'
    case 'retry_threw_fallback':
      return 'Ocorreu um erro técnico ao tentar refazer a operação.'
    case 'regenerated_ok':
      return 'A IA se corrigiu e executou a operação corretamente antes de responder.'
    default:
      return `A IA ${copyFor(outcome, claimType).long}.`
  }
}

/** Bloco "O que verificar" do modal. */
export function guardCheckGuidance(
  outcome: string | null | undefined,
  claimType: string | null | undefined,
): string {
  return copyFor(outcome, claimType).guidance
}

/** Rótulo da linha "Tipo" do modal. */
export function guardTypeLabel(
  outcome: string | null | undefined,
  claimType: string | null | undefined,
): string {
  return copyFor(outcome, claimType).typeLabel
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

/**
 * Texto do selo na LISTA de conversas.
 *
 * A lista carrega apenas `hasRecentAnomaly: boolean` — o `outcome` não está no
 * payload dela, então não dá para dizer o motivo aqui sem mudar o DTO. Este
 * texto é deliberadamente genérico em vez de errado: dizer "confirmou uma ação"
 * manda o operador procurar um agendamento que pode nunca ter sido alegado.
 * Mora neste arquivo para que toda cópia de guard tenha um lugar só; quando o
 * `outcome` entrar no payload da lista, troque por `copyFor`.
 */
export const GUARD_LIST_BADGE_TITLE =
  'Verificação necessária: a IA respondeu algo que não pôde ser confirmado. Abra a conversa para ver o motivo.'

/** Linha do tempo, caso de autocorreção: o guard agiu mas ninguém foi acionado. */
export function guardCorrectedTimelineLabel(
  outcome: string | null | undefined,
  claimType: string | null | undefined,
): string {
  return `A IA ${copyFor(outcome, claimType).long} — corrigido automaticamente antes de enviar`
}
