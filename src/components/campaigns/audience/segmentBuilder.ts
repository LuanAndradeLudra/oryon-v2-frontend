// ─── segmentBuilder ────────────────────────────────────────────────────────
// Estado + redutor puro do construtor de público (D6/SCRUM-1021). Espelha
// 1:1 o body de `POST /campaigns/segments/evaluate` (CONTRATOS.md § BE.3), de
// modo que serializar o estado para a API é só remover as chaves de UI (`id`
// e `count`) — nenhuma tradução de shape. Zero I/O aqui: quem chama a API é
// `useAudienceEvaluate`, que despacha `apply_counts` quando a resposta chega.
import type {
  SegmentCondition,
  SegmentExclusions,
  SegmentField,
  SegmentGroup as ApiSegmentGroup,
  SegmentOperator,
  CampaignSegmentDefinition,
} from '@/types/campaignsV2'

/** Condição do editor: a condição da API + chaves só de UI. `id` é a chave
 *  estável do React (a API é posicional e não tem noção de identidade), e
 *  `count` é a última contagem parcial conhecida, vinda de `perCondition`. */
export interface EditorCondition extends SegmentCondition {
  id: string
  count?: number
}

export interface EditorGroup {
  id: string
  /** Combina as condições DENTRO do grupo. Grupos entre si são sempre OR'd. */
  op: 'and' | 'or'
  conditions: EditorCondition[]
}

export interface AudienceDefinition {
  groups: EditorGroup[]
  exclude: SegmentExclusions
}

/** O que o `AudienceBlock` recebe e devolve. `segmentId` presente significa
 *  "partiu de um segmento salvo"; some no primeiro edit manual, porque a
 *  definição deixa de ser a que está gravada em `campaign_segments`. */
export interface AudienceDraft {
  segmentId?: string
  definition: AudienceDefinition
}

export type SegmentBuilderAction =
  | { type: 'add_group' }
  | { type: 'remove_group'; groupId: string }
  | { type: 'set_group_op'; groupId: string; op: 'and' | 'or' }
  | { type: 'add_condition'; groupId: string; field?: SegmentField; operator?: SegmentOperator; value?: unknown }
  | { type: 'update_condition'; groupId: string; conditionId: string; patch: Partial<Omit<EditorCondition, 'id'>> }
  | { type: 'remove_condition'; groupId: string; conditionId: string }
  | { type: 'set_exclude'; patch: Partial<SegmentExclusions> }
  | { type: 'apply_counts'; perCondition: number[][] }
  | { type: 'load_definition'; definition: AudienceDefinition }

let idCounter = 0

/** Ids são locais ao editor e nunca vão para a API — um contador é suficiente
 *  e mantém os testes determinísticos (nada de `crypto.randomUUID`). */
export function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}_${idCounter}`
}

export function createCondition(
  field: SegmentField = 'tags',
  operator: SegmentOperator = 'includes_any',
  value: unknown = [],
): EditorCondition {
  return { id: nextId('cond'), field, operator, value }
}

export function createGroup(conditions: EditorCondition[] = [createCondition()]): EditorGroup {
  return { id: nextId('grp'), op: 'and', conditions }
}

export function createEmptyDefinition(): AudienceDefinition {
  return { groups: [createGroup()], exclude: { optOut: true } }
}

function mapGroup(
  state: AudienceDefinition,
  groupId: string,
  fn: (group: EditorGroup) => EditorGroup,
): AudienceDefinition {
  let changed = false
  const groups = state.groups.map((g) => {
    if (g.id !== groupId) return g
    changed = true
    return fn(g)
  })
  return changed ? { ...state, groups } : state
}

export function segmentBuilderReducer(
  state: AudienceDefinition,
  action: SegmentBuilderAction,
): AudienceDefinition {
  switch (action.type) {
    case 'add_group':
      return { ...state, groups: [...state.groups, createGroup()] }

    case 'remove_group': {
      // O mockup sempre mostra ao menos "Incluir quem atende a todas" — um
      // público sem nenhum grupo não tem representação na UI nem na API.
      if (state.groups.length <= 1) return state
      const groups = state.groups.filter((g) => g.id !== action.groupId)
      return groups.length === state.groups.length ? state : { ...state, groups }
    }

    case 'set_group_op':
      return mapGroup(state, action.groupId, (g) => (g.op === action.op ? g : { ...g, op: action.op }))

    case 'add_condition':
      return mapGroup(state, action.groupId, (g) => ({
        ...g,
        conditions: [...g.conditions, createCondition(action.field, action.operator, action.value)],
      }))

    case 'update_condition':
      return mapGroup(state, action.groupId, (g) => {
        let changed = false
        const conditions = g.conditions.map((c) => {
          if (c.id !== action.conditionId) return c
          changed = true
          // Trocar campo/operador/valor invalida a contagem parcial: ela veio
          // da condição anterior e mostraria um número que não corresponde
          // mais ao que está escrito na linha.
          const invalidates = 'field' in action.patch || 'operator' in action.patch || 'value' in action.patch
          const next: EditorCondition = { ...c, ...action.patch }
          if (invalidates && !('count' in action.patch)) delete next.count
          return next
        })
        return changed ? { ...g, conditions } : g
      })

    case 'remove_condition':
      return mapGroup(state, action.groupId, (g) => {
        const conditions = g.conditions.filter((c) => c.id !== action.conditionId)
        return conditions.length === g.conditions.length ? g : { ...g, conditions }
      })

    // Merge raso: um patch com só `optOut` não pode apagar
    // `campaignedWithinDays`, que é controlado por outra linha da UI.
    case 'set_exclude':
      return { ...state, exclude: { ...state.exclude, ...action.patch } }

    // `perCondition` é posicional (grupo × condição, na ordem enviada). O
    // hook envia a definição corrente e a resposta volta na mesma ordem;
    // índices fora do intervalo (resposta atrasada de uma definição já
    // editada) simplesmente não pintam contagem, em vez de casar errado.
    case 'apply_counts':
      return {
        ...state,
        groups: state.groups.map((g, gi) => ({
          ...g,
          conditions: g.conditions.map((c, ci) => {
            const count = action.perCondition[gi]?.[ci]
            return typeof count === 'number' ? { ...c, count } : c
          }),
        })),
      }

    case 'load_definition':
      return action.definition

    default:
      return state
  }
}

// ── Serialização para a API ────────────────────────────────────────────────

/** Estado do editor → body de `/segments/evaluate` e `/segments/preview`:
 *  descarta `id`/`count` (chaves de UI) e grupos sem condição alguma, que a
 *  API rejeitaria como grupo vazio. */
export function toEvaluateGroups(definition: AudienceDefinition): ApiSegmentGroup[] {
  return definition.groups
    .filter((g) => g.conditions.length > 0)
    .map((g) => ({
      op: g.op,
      conditions: g.conditions.map(({ field, operator, value }) => ({ field, operator, value })),
    }))
}

/** Definição a persistir em `campaign_segments` — mesmo shape do evaluate,
 *  sem `sample`/paginação. */
export function toSegmentDefinition(definition: AudienceDefinition): CampaignSegmentDefinition {
  return { groups: toEvaluateGroups(definition), exclude: definition.exclude }
}

/** Definição salva (vinda da API) → estado do editor, gerando os ids de UI. */
export function fromSegmentDefinition(saved: CampaignSegmentDefinition): AudienceDefinition {
  const groups = saved.groups.map((g) => ({
    id: nextId('grp'),
    op: g.op,
    conditions: g.conditions.map((c) => ({ ...c, id: nextId('cond') })),
  }))
  return {
    groups: groups.length > 0 ? groups : [createGroup()],
    exclude: saved.exclude ?? {},
  }
}

/** Uma definição só é avaliável quando tem ao menos uma condição preenchida —
 *  sem isso o evaluate devolveria a base inteira, que não é o que o operador
 *  quis dizer com um construtor recém-aberto. */
export function hasAnyCondition(definition: AudienceDefinition): boolean {
  return definition.groups.some((g) => g.conditions.length > 0)
}
