// ─── Núcleo do rascunho do agente (A2 / SCRUM-1013) ──────────────────────────
// Parte PURA do `useAgentDraft`: quais campos são rascunháveis, o que conta
// como alterado e como o campo vira rótulo humano. Sem React e sem rede, para
// ser testável sem render — é o alvo do teste `useDraft` da rubrica.

import type { Accent } from '@/components/ui/accentColor'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import { sectionById, type SectionId } from './sectionNavCore'

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

/** Seção do Workspace dona de cada campo rascunhável. Serve para a lista de
 *  alterações pintar o chip com o MESMO acento da seção onde a pessoa vai
 *  consertar aquilo — é o que o mockup faz (`p2a-agentes.html:142`: "Regras"
 *  em rosa, "Capacidades" em verde, exatamente os acentos do `snav`).
 *
 *  `channels` e `preferred_model` caem em "Visão geral" porque não têm seção
 *  própria na nav — é onde eles aparecem hoje, não uma seção inventada. */
const FIELD_SECTION: Record<DraftField, SectionId> = {
  system_prompt:                       'prompt',
  wizard_config:                       'overview',
  handoff_rules:                       'rules',
  channels:                            'overview',
  crm_capabilities:                    'capabilities',
  preferred_model:                     'overview',
  decision_criteria_resolved:          'criteria',
  decision_criteria_stage_transitions: 'criteria',
  decision_criteria_tags:              'criteria',
  decision_criteria_handoff:           'criteria',
}

/** Acento do campo, pela seção dona. Campo desconhecido cai em `brand` — a
 *  mesma razão do `fieldLabel`: melhor um chip neutro na lista do que um item
 *  a menos, que faria o contador e a lista discordarem. */
export function fieldAccent(field: string): Accent {
  return isDraftField(field) ? sectionById(FIELD_SECTION[field]).accent : 'brand'
}

// ── resumo do que mudou ─────────────────────────────────────────────────────
// O card de alterações precisa dizer O QUE mudou, não repetir a mesma frase
// uma vez por linha — repetir lista, não revela. O mockup traz uma descrição
// escrita à mão por alteração ("Nova regra cancelar → Retenção"), que ninguém
// consegue gerar a partir de dois valores. O que dá para afirmar com verdade é
// a GRANDEZA da mudança, e é só isso que estas funções dizem.

/** Contagem que representa o campo, quando existe uma. `null` quando o campo
 *  não tem uma grandeza óbvia — aí o resumo cai no genérico em vez de inventar
 *  um número. */
const FIELD_COUNT: Partial<Record<DraftField, (v: unknown) => number | null>> = {
  handoff_rules:    v => arrayLength(prop(v, 'rules')),
  crm_capabilities: v => arrayLength(prop(v, 'capabilities')),
  channels:         v => (isRecord(v) ? Object.values(v).filter(Boolean).length : null),
}

const COUNT_NOUN: Partial<Record<DraftField, [string, string]>> = {
  handoff_rules:    ['regra', 'regras'],
  crm_capabilities: ['capacidade', 'capacidades'],
  channels:         ['canal', 'canais'],
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function prop(v: unknown, key: string): unknown {
  return isRecord(v) ? v[key] : undefined
}

function arrayLength(v: unknown): number | null {
  return Array.isArray(v) ? v.length : null
}

const nf = (n: number) => n.toLocaleString('pt-BR')

/**
 * Uma linha curta e verdadeira sobre a alteração de um campo. Nunca afirma
 * mais do que os dois valores sustentam:
 *   • texto longo (prompt)      → "1.842 → 1.910 caracteres"
 *   • texto curto (modelo)      → o valor antigo e o novo
 *   • coleção conhecida         → "3 → 4 regras"
 *   • qualquer outra coisa      → só diz que mudou
 */
export function changeSummary(agent: AgentConfigWithTools, draft: AgentDraft | null, field: DraftField): string {
  const antes = (agent as unknown as Record<string, unknown>)[field]
  const depois = draft?.[field]

  const count = FIELD_COUNT[field]
  if (count) {
    const a = count(antes)
    const d = count(depois)
    if (a !== null && d !== null) {
      const [sing, plur] = COUNT_NOUN[field] ?? ['item', 'itens']
      return `${nf(a)} → ${nf(d)} ${d === 1 ? sing : plur}`
    }
  }

  // Lado AUSENTE conta como texto vazio, não como "não sei comparar": campo
  // que o agente ainda não tem e o rascunho passou a ter é alteração comum
  // (`preferred_model`, por exemplo), e "— → claude-opus-5" diz mais do que o
  // genérico. Só vale quando o outro lado é texto — objeto contra `undefined`
  // continua caindo no genérico.
  const textual = (v: unknown) => typeof v === 'string' || v === null || v === undefined
  if ((typeof antes === 'string' || typeof depois === 'string') && textual(antes) && textual(depois)) {
    const a = typeof antes === 'string' ? antes : ''
    const d = typeof depois === 'string' ? depois : ''
    // Curto o bastante para caber na linha: mostrar o valor diz mais que
    // mostrar o tamanho dele.
    if (a.length <= 40 && d.length <= 40) {
      return `${a || '—'} → ${d || '—'}`
    }
    return `${nf(a.length)} → ${nf(d.length)} caracteres`
  }

  return 'Editado neste rascunho'
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
