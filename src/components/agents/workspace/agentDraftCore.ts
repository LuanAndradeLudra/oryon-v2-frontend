// ─── Núcleo do rascunho do agente (A2 / SCRUM-1013) ──────────────────────────
// Parte PURA do `useAgentDraft`: quais campos são rascunháveis, o que conta
// como alterado e como o campo vira rótulo humano. Sem React e sem rede, para
// ser testável sem render — é o alvo do teste `useDraft` da rubrica.

import type { AgentConfigWithTools } from '@/services/agentsApi'

/** Subconjunto rascunhável, igual ao do contrato AS.2 (CONTRATOS.md §AS.2).
 *  Manter em lockstep: um campo fora desta lista nunca entra no `draft` nem é
 *  contado em "Alterações (N)". */
export const DRAFT_FIELDS = [
  'system_prompt',
  'wizard_config',
  'handoff_rules',
  'channels',
  'crm_capabilities',
  'preferred_model',
  'decision_criteria_resolved',
  'decision_criteria_stage_transitions',
  'decision_criteria_tags',
  'decision_criteria_handoff',
] as const

export type DraftField = (typeof DRAFT_FIELDS)[number]

export type AgentDraft = Partial<Record<DraftField, unknown>>

export function isDraftField(key: string): key is DraftField {
  return (DRAFT_FIELDS as readonly string[]).includes(key)
}

/** Rótulo humano por campo, para o card "N alterações não publicadas". Um
 *  `changed_fields` cru ("decision_criteria_stage_transitions") não é texto de
 *  interface. */
const FIELD_LABEL: Record<DraftField, string> = {
  system_prompt:                       'Prompt',
  wizard_config:                       'Configuração',
  handoff_rules:                       'Regras',
  channels:                            'Canais',
  crm_capabilities:                    'Capacidades',
  preferred_model:                     'Modelo',
  decision_criteria_resolved:          'Critério · resolvida',
  decision_criteria_stage_transitions: 'Critério · etapa',
  decision_criteria_tags:              'Critério · etiquetas',
  decision_criteria_handoff:           'Critério · transferência',
}

/** Campo desconhecido (o backend pode passar a mandar um novo antes de o
 *  frontend saber dele) cai no próprio nome em vez de sumir da lista — some
 *  seria pior: o contador diria 3 e a lista mostraria 2. */
export function fieldLabel(field: string): string {
  return isDraftField(field) ? FIELD_LABEL[field] : field
}

/** Comparação estrutural estável. `system_prompt` é string, mas
 *  `handoff_rules`/`channels`/`crm_capabilities` são objetos — comparar por
 *  referência marcaria como alterado qualquer re-render que recriasse o
 *  objeto, e "Alterações (2)" apareceria sem ninguém ter mexido em nada. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === undefined || b === undefined || a === null || b === null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  try {
    return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b))
  } catch {
    // Ciclo ou valor não serializável: não dá para afirmar que são iguais, e
    // um falso "igual" esconderia uma alteração real do usuário.
    return false
  }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((value as Record<string, unknown>)[k])
        return acc
      }, {})
  }
  return value
}

/** Campos do rascunho que realmente diferem do publicado, na ordem de
 *  `DRAFT_FIELDS` (estável — a lista não pula de posição entre renders). */
export function changedFields(agent: AgentConfigWithTools, draft: AgentDraft | null): DraftField[] {
  if (!draft) return []
  const live = agent as unknown as Record<string, unknown>
  return DRAFT_FIELDS.filter(
    field => field in draft && !sameValue(draft[field], live[field]),
  )
}

/** Rascunho sem os campos que voltaram ao valor publicado. Evita publicar um
 *  PATCH com campo que não mudou, e é o que zera o "Alterações (N)" quando a
 *  pessoa desfaz a edição na mão. */
export function pruneDraft(agent: AgentConfigWithTools, draft: AgentDraft | null): AgentDraft | null {
  const changed = changedFields(agent, draft)
  if (changed.length === 0) return null
  const pruned: AgentDraft = {}
  for (const field of changed) pruned[field] = draft![field]
  return pruned
}

export function draftStorageKey(agentId: string): string {
  return `agent-draft:${agentId}`
}

/** Lê o rascunho do localStorage, descartando o que não for utilizável.
 *  Nunca lança: localStorage pode estar indisponível (aba privativa, storage
 *  bloqueado) e o Workspace tem que abrir mesmo assim, só sem rascunho. */
export function readStoredDraft(agentId: string): AgentDraft | null {
  try {
    const raw = localStorage.getItem(draftStorageKey(agentId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const clean: AgentDraft = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isDraftField(k)) clean[k] = v
    }
    return Object.keys(clean).length > 0 ? clean : null
  } catch {
    return null
  }
}

export function writeStoredDraft(agentId: string, draft: AgentDraft | null): void {
  try {
    if (draft === null) localStorage.removeItem(draftStorageKey(agentId))
    else localStorage.setItem(draftStorageKey(agentId), JSON.stringify(draft))
  } catch {
    // Sem persistência o rascunho ainda vive em memória nesta aba; falhar aqui
    // não pode derrubar a edição em curso.
  }
}
