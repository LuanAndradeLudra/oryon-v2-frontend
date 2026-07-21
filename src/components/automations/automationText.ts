import type {
  Automation,
  AutomationTrigger,
  AutomationCondition,
  AutomationConditionField,
  AutomationConditionOperator,
  AutomationAction,
  AutomationType,
} from '@/types'

// Um código de cor por tipo — a pista de "bate o olho e sabe o que é". Não
// recria a poluição antiga (TypeBadge + grupo + chip); é só o ícone líder do
// nome, tingido por categoria. O ícone vem do TYPE_CONFIG (usa currentColor).
// Compartilhado entre a tabela desktop (AutomationsPage) e o card mobile
// (AutomationsMobileList) — mesma pista visual nas duas superfícies.
export const TYPE_ACCENT: Record<AutomationType, string> = {
  boas_vindas:     '#4ADE80', // verde — acolhimento
  follow_up:       '#60A5FA', // azul — retomada
  fora_horario:    '#A78BFA', // violeta — fora do expediente
  triagem_keyword: '#FBBF24', // âmbar — triagem/alerta
  estagio_crm:     '#22D3EE', // ciano — pipeline
  inatividade:     '#FB7185', // rosa — esfriando
  custom:          '#2DD4BF', // teal — personalizado
}

// ─────────────────────────────────────────────────────────────────────────────
// Tradução automação → linguagem natural (PT-BR).
//
// Centralizado aqui porque o mesmo texto aparece em três superfícies do módulo
// redesenhado — a célula "Fluxo" da tabela, o card Quando/Se/Então do painel de
// detalhe e a lista de atenção. Antes esses rótulos viviam duplicados entre
// AutomationsPage (ACTION_LABELS) e AutomationWizard (CONDITION_FIELDS,
// OPERATORS_FOR_FIELD, ACTION_OPTIONS). Uma fonte só evita a deriva.
// ─────────────────────────────────────────────────────────────────────────────

const MAX = 40
function truncate(s: string, max = MAX): string {
  const t = s.trim()
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

// ── Gatilho (a cláusula QUANDO) ──────────────────────────────────────────────

/** Rótulo curto do gatilho — usado no chip da coluna Fluxo. */
export function triggerChipLabel(a: Automation): string {
  const t = a.trigger
  switch (t.type) {
    case 'boas_vindas':     return 'Novo contato'
    case 'follow_up':       return `Sem resposta ${t.afterHours}h`
    case 'fora_horario':    return 'Fora do horário'
    case 'triagem_keyword': return 'Palavra-chave'
    case 'estagio_crm':     return 'Estágio CRM'
    case 'inatividade':     return `Inatividade ${t.afterDays}d`
    case 'custom':          return t.eventLabel || 'Evento'
    default:                return 'Gatilho'
  }
}

/** Frase completa do gatilho — usada no card de fluxo do detalhe. */
export function triggerSentence(a: Automation): string {
  const t: AutomationTrigger = a.trigger
  switch (t.type) {
    case 'boas_vindas':
      return 'Um contato novo envia a primeira mensagem'
    case 'follow_up':
      return `O cliente fica ${t.afterHours}h sem responder`
    case 'fora_horario':
      return 'Uma mensagem chega fora do horário comercial'
    case 'triagem_keyword': {
      const kws = t.keywords ?? []
      const list = kws.slice(0, 3).map((k) => `"${k}"`).join(', ')
      const extra = kws.length > 3 ? ` +${kws.length - 3}` : ''
      const mode = t.matchMode === 'all' ? 'todas as palavras' : 'qualquer palavra'
      return kws.length
        ? `A mensagem contém ${mode}: ${list}${extra}`
        : 'A mensagem contém uma palavra-chave'
    }
    case 'estagio_crm':
      return 'O contato muda de estágio no pipeline'
    case 'inatividade':
      return `O contato fica ${t.afterDays} dias sem nenhuma atividade`
    case 'custom':
      return t.eventLabel || 'Um evento personalizado acontece'
    default:
      return 'O gatilho dispara'
  }
}

// ── Condições (as cláusulas SE) ──────────────────────────────────────────────

const FIELD_LABEL: Record<AutomationConditionField, string> = {
  stage:       'Estágio',
  tag:         'Tag',
  source:      'Origem',
  department:  'Departamento',
  assigned_to: 'Atribuído a',
  intent:      'Intenção',
  lead_score:  'Lead score',
  none:        '',
}

const OPERATOR_LABEL: Record<AutomationConditionOperator, string> = {
  equals:       'é',
  not_equals:   'não é',
  contains:     'contém',
  not_contains: 'não contém',
  greater_than: 'maior que',
  less_than:    'menor que',
  is_set:       'está definido',
  is_not_set:   'não está definido',
}

const NO_VALUE_OPS: AutomationConditionOperator[] = ['is_set', 'is_not_set']

/** Frase de uma condição — ex.: "Estágio é Novo". */
export function conditionSentence(c: AutomationCondition): string {
  const field = FIELD_LABEL[c.field] ?? c.field
  const op = OPERATOR_LABEL[c.operator] ?? c.operator
  if (NO_VALUE_OPS.includes(c.operator)) return `${field} ${op}`.trim()
  return `${field} ${op} ${c.value}`.trim()
}

/** Junta as condições no conector E/OU da automação. */
export function conditionsSummary(a: Automation): string {
  const conds = a.conditions ?? []
  if (conds.length === 0) return ''
  const joiner = a.conditionsLogic === 'or' ? ' ou ' : ' e '
  return conds.map(conditionSentence).join(joiner)
}

// ── Ações (as cláusulas ENTÃO) ───────────────────────────────────────────────

/** Rótulo curto por STRING de tipo — serve tanto p/ a ação do draft quanto
 *  p/ a ação executada no histórico (actionsExecuted[].type é só string). */
export function actionTypeLabel(type: string): string {
  switch (type) {
    case 'send_message':         return 'Enviar template'
    case 'send_text':            return 'Enviar texto'
    case 'assign_agent':         return 'Atribuir agente'
    case 'assign_dept':          return 'Transferir setor'
    case 'add_tag':              return 'Adicionar tag'
    case 'remove_tag':           return 'Remover tag'
    case 'change_stage':         return 'Mover estágio'
    case 'set_lead_score':       return 'Definir score'
    case 'resolve_conversation': return 'Resolver conversa'
    case 'send_note':            return 'Nota interna'
    case 'send_webhook':         return 'Webhook'
    default:                     return type || 'Ação'
  }
}

/** Rótulo curto da ação — usado nos chips. */
export function actionLabel(action: AutomationAction): string {
  return actionTypeLabel(action.type)
}

/** Frase completa da ação, com o alvo concreto quando existe. */
export function actionSentence(action: AutomationAction): string {
  switch (action.type) {
    case 'send_message':
      return action.templateName ? `Enviar template "${action.templateName}"` : 'Enviar template'
    case 'send_text':
      return action.body ? `Enviar texto "${truncate(action.body)}"` : 'Enviar texto'
    case 'assign_agent':
      return action.userName ? `Atribuir a ${action.userName}` : 'Atribuir agente'
    case 'assign_dept':
      return action.departmentName ? `Transferir para ${action.departmentName}` : 'Transferir setor'
    case 'add_tag':
      return action.tagName ? `Adicionar tag ${action.tagName}` : 'Adicionar tag'
    case 'remove_tag':
      return action.tagName ? `Remover tag ${action.tagName}` : 'Remover tag'
    case 'change_stage':
      return action.stageLabel ? `Mover para ${action.stageLabel}` : 'Mover estágio'
    case 'set_lead_score':
      return `Definir lead score em ${action.score}`
    case 'resolve_conversation':
      return 'Resolver a conversa'
    case 'send_note':
      return 'Registrar nota interna'
    case 'send_webhook':
      return action.url ? `Chamar webhook (${action.method})` : 'Chamar webhook'
    default:
      return 'Executar ação'
  }
}

// ── Coexistência com a IA (a cláusula IA) ────────────────────────────────────

const MESSAGING_ACTIONS = new Set(['send_message', 'send_text'])

/** Explica em uma frase o que acontece com o agente de IA quando dispara. */
export function agentBehaviorSentence(a: Automation): string {
  switch (a.agentBehavior) {
    case 'always_silence':
      return 'A IA fica em silêncio quando esta automação dispara'
    case 'never_silence':
      return 'A IA continua respondendo em paralelo a esta automação'
    case 'auto':
    default: {
      const sends = (a.actions ?? []).some((ac) => MESSAGING_ACTIONS.has(ac.type))
      return sends
        ? 'A IA fica em silêncio durante o disparo — modo automático'
        : 'A IA continua respondendo — esta automação não envia mensagem'
    }
  }
}

/** Só destaca o comportamento quando difere do padrão (para o glifo da tabela). */
export function agentBehaviorDeviates(a: Automation): boolean {
  return a.agentBehavior === 'always_silence' || a.agentBehavior === 'never_silence'
}

// ── Frase-resumo viva (cabeçalho do builder / linha única) ────────────────────

/** "Quando X, se Y, então Z (+N ações). Frase da IA." */
export function flowSummary(a: Automation): string {
  const when = `Quando ${lowerFirst(triggerSentence(a))}`
  const ifc = conditionsSummary(a)
  const se = ifc ? `, se ${lowerFirst(ifc)}` : ''
  const acts = a.actions ?? []
  let then = ', mas nenhuma ação configurada'
  if (acts.length > 0) {
    const first = lowerFirst(actionSentence(acts[0]))
    const rest = acts.length > 1 ? ` (+${acts.length - 1} ${acts.length - 1 === 1 ? 'ação' : 'ações'})` : ''
    then = `, então ${first}${rest}`
  }
  return `${when}${se}${then}.`
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

// ── Motor de atenção (derivado, sem chamada extra de rede) ────────────────────

export type AttentionKind =
  | 'needs_line'        // sem linha WhatsApp — não dispara
  | 'no_actions'        // ativa mas sem ações configuradas
  | 'never_ran'         // ativa há dias sem nenhuma execução
  | 'stale_draft'       // rascunho esquecido

export interface AttentionFlag {
  kind: AttentionKind
  /** Título curto para a lista de atenção. */
  title: string
  /** Explicação de uma linha. */
  hint: string
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Deriva os problemas de uma automação a partir só do objeto que a lista já
 * carrega (+ needsWabaAssignment). Nada aqui exige backend novo — a detecção
 * de falhas recentes (que precisa dos runs) é feita on-selection no painel de
 * detalhe, não aqui, para não disparar N chamadas ao montar a página.
 *
 * `now` é injetável para manter a função pura/testável.
 */
export function deriveAttention(a: Automation, now: number = Date.now()): AttentionFlag[] {
  const flags: AttentionFlag[] = []

  if (a.needsWabaAssignment) {
    flags.push({
      kind: 'needs_line',
      title: a.name,
      hint: 'Sem linha de WhatsApp atribuída — não dispara.',
    })
  }

  if (a.status === 'active' && (a.actions?.length ?? 0) === 0) {
    flags.push({
      kind: 'no_actions',
      title: a.name,
      hint: 'Ativa, mas sem nenhuma ação configurada.',
    })
  }

  if (a.status === 'active' && a.executionCount === 0) {
    const created = a.createdAt ? new Date(a.createdAt).getTime() : now
    const days = Math.floor((now - created) / DAY)
    if (days >= 7) {
      flags.push({
        kind: 'never_ran',
        title: a.name,
        hint: `Ativa há ${days} dias sem nenhuma execução.`,
      })
    }
  }

  if (a.status === 'draft') {
    const touched = a.updatedAt ? new Date(a.updatedAt).getTime() : now
    const days = Math.floor((now - touched) / DAY)
    if (days >= 14) {
      flags.push({
        kind: 'stale_draft',
        title: a.name,
        hint: `Rascunho parado há ${days} dias.`,
      })
    }
  }

  return flags
}

/** Conta total de itens de atenção numa lista de automações. */
export function attentionCount(list: Automation[], now: number = Date.now()): number {
  return list.reduce((sum, a) => sum + deriveAttention(a, now).length, 0)
}
