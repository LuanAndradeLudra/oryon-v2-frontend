// ─── legacyMapping ─────────────────────────────────────────────────────────
// Conversão `AudienceDefinition` (modelo novo, BE.3) → `CampaignSegment` (o
// shape flat que `campaignsApi.countSegment`/`previewSegment` entendem hoje).
// Usado SÓ no fallback, quando `/campaigns/segments/evaluate` responde 404 —
// ou seja, enquanto o BE.3 não estiver no ar.
//
// A direção é só nova → antiga. A volta não existe de propósito: nada no
// produto grava `CampaignSegment` e pede para editar no construtor novo (o
// wizard legado continua editando o próprio formato).
//
// O motor antigo (`campaign-segment.service.ts`, `buildSegmentQuery`) combina
// todos os critérios não-vazios com AND e não tem noção de grupos, de OR
// entre grupos, nem de "excluir depois de incluir". Por isso o fallback é
// deliberadamente mais pobre que a UI completa: 1 grupo E, só os campos com
// equivalente direto, e opt-out imposto. O que não cabe é reportado em
// `unsupported` para a UI desabilitar a linha em vez de mentir uma contagem.
import type { CampaignSegment, ContactIntent, ContactSentiment, ContactSource } from '@/types'
import type { SegmentOperator } from '@/types/campaignsV2'
import type { AudienceDefinition, EditorCondition } from './segmentBuilder'

export interface LegacyMappingResult {
  segment: CampaignSegment
  /** Ids das condições que o motor antigo não sabe representar. A UI marca
   *  essas linhas como inativas — elas não entram na contagem exibida. */
  unsupported: string[]
}

/** Campos e operadores com equivalente direto em `CampaignSegmentFilter`.
 *  Fonte: tabela §3 do `coord/D6-plano.md`, conferida contra
 *  `buildSegmentQuery` em `campaign-segment.service.ts`. */
const SUPPORTED: Record<string, SegmentOperator[]> = {
  tags:             ['includes_any'],
  stage:            ['eq', 'in'],
  source:           ['eq', 'in'],
  intent:           ['eq', 'in'],
  sentiment:        ['eq', 'in'],
  optIn:            ['eq'],
  search:           ['contains'],
  hasConversations: ['eq'],
}

function isSupported(condition: EditorCondition): boolean {
  return SUPPORTED[condition.field]?.includes(condition.operator) ?? false
}

/** `eq` traz um escalar, `in` traz uma lista — os filtros antigos são todos
 *  `IN`, então ambos viram array. Vazio significa "critério não preenchido",
 *  e é omitido para não filtrar por lista vazia (o backend trataria como
 *  "nenhum contato", quando a intenção é "ainda não escolhi"). */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  return typeof value === 'string' && value.length > 0 ? [value] : []
}

export function toLegacySegment(definition: AudienceDefinition): LegacyMappingResult {
  const unsupported: string[] = []

  // Sem grupos entre si: o motor antigo só sabe UM conjunto de critérios
  // AND-combinados. Só o primeiro grupo com condições é traduzido; os demais
  // (o "OU" / "Incluir também" do mockup) ficam inteiros de fora — a UI já
  // esconde essa parte quando `available === false`, isto aqui é a rede de
  // segurança para uma definição carregada de fora nesse estado.
  const [firstGroup, ...restGroups] = definition.groups.filter((g) => g.conditions.length > 0)
  for (const group of restGroups) {
    for (const condition of group.conditions) unsupported.push(condition.id)
  }

  const segment: CampaignSegment = { type: 'filter' }

  for (const condition of firstGroup?.conditions ?? []) {
    if (!isSupported(condition)) {
      unsupported.push(condition.id)
      continue
    }

    switch (condition.field) {
      case 'tags': {
        const ids = toStringArray(condition.value)
        if (ids.length > 0) segment.filterTagIds = ids
        break
      }
      case 'stage': {
        const stages = toStringArray(condition.value)
        if (stages.length > 0) segment.filterStages = stages
        break
      }
      case 'source': {
        const sources = toStringArray(condition.value) as ContactSource[]
        if (sources.length > 0) segment.filterSource = sources
        break
      }
      case 'intent': {
        const intents = toStringArray(condition.value) as ContactIntent[]
        if (intents.length > 0) segment.filterIntent = intents
        break
      }
      case 'sentiment': {
        const sentiments = toStringArray(condition.value) as ContactSentiment[]
        if (sentiments.length > 0) segment.filterSentiment = sentiments
        break
      }
      case 'optIn':
        if (typeof condition.value === 'boolean') segment.filterOptIn = condition.value
        break
      case 'search':
        if (typeof condition.value === 'string' && condition.value.trim().length > 0) {
          segment.filterContactSearch = condition.value.trim()
        }
        break
      case 'hasConversations':
        if (typeof condition.value === 'boolean') segment.filterHasConversations = condition.value
        break
      default:
        unsupported.push(condition.id)
    }
  }

  // Opt-out imposto: o motor antigo não tem "excluir depois de incluir", só
  // filtros positivos. `filterOptIn: true` ("só quem tem opt-in") é a única
  // forma de expressar "não mandar para quem não aceitou" ali — mais grosseiro
  // que a Decisão D6 do BE.3, que também trata `optIn IS NULL` como opt-out,
  // mas na mesma direção conservadora. Vence uma condição `optIn` que o
  // usuário tenha montado no grupo: exclusão sempre ganha de inclusão.
  if (definition.exclude.optOut) segment.filterOptIn = true

  return { segment, unsupported }
}

/** Motivos de exclusão que só existem com BE.1/BE.3 no ar. A UI usa esta
 *  lista para esconder as linhas correspondentes no fallback, em vez de
 *  mostrá-las desabilitadas sem explicação. */
export const EXCLUSIONS_REQUIRING_BE3 = ['campaignedWithinDays', 'activeAiConversation'] as const
