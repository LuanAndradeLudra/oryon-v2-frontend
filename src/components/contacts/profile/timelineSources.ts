// ── Fontes da timeline unificada do contato ─────────────────────────────────
// Extração pura do merge que o HistoryTab faz inline (3 fontes reais).
// Quando o backend ganhar o endpoint agregado GET /contacts/:id/timeline,
// só esta função muda — a UI (ContactTimeline) fica intacta.
//
// Visual: cada evento carrega um `chip` (cor saturada) renderizado pelo
// padrão .color-chip — fundo cheio + ícone branco, igual aos badges de tags.
// Nada de fundos translúcidos (padrão antigo do HistoryTab do drawer).

import { Bot, User, Tag, GitCommitHorizontal, UserPlus, ShieldCheck } from 'lucide-react'
import { contactsApi } from '@/services/api'
import { fetchContactActivity } from '@/services/userActivityApi'
import { fetchAgentActionsByContact } from '@/services/agentActivityApi'
import {
  visualForActionKey, type RowVisual,
} from '@/components/conversations/ContactPanel/ConversationActivitySection'

export type TimelineSection = 'pipeline' | 'conversas' | 'notas'

export interface TimelineEvent {
  id: string
  section: TimelineSection
  ts: number
  label: string
  actor: string
  Icon: RowVisual['Icon']
  /** Cor do chip do ícone (.color-chip): fundo saturado + ícone branco. */
  chip: string
}

// Paleta dos chips via TOKENS categóricos/semânticos (theme-aware — o tema
// claro escurece os matizes para manter contraste AA, o que hex fixo não faz).
const CHIP = {
  sky: 'var(--color-accent-blue)',
  brand: 'var(--color-brand-500)',
  amber: 'var(--color-accent-amber)',
  emerald: 'var(--color-accent-green)',
  orange: 'var(--color-warning)',
  violet: 'var(--color-accent-violet)',
  red: 'var(--color-danger)',
  cyan: 'var(--color-accent-cyan)',
  neutral: 'var(--color-status-muted)',
} as const

export const NOTE_CHIP = CHIP.cyan

// Humaniza chaves técnicas cruas que às vezes chegam como label (ex.:
// "deal_deleted", "message_sent") — o operador não deve ver snake_case.
// Summaries já humanos (com espaços/acentos) passam intactos.
const LABEL_MAP: Record<string, string> = {
  deal_created: 'Negócio criado',
  deal_updated: 'Negócio atualizado',
  deal_won: 'Negócio ganho',
  deal_lost: 'Negócio perdido',
  deal_deleted: 'Negócio excluído',
  message_sent: 'Mensagem enviada',
  message_received: 'Mensagem recebida',
  conversation_opened: 'Conversa aberta',
  conversation_resolved: 'Conversa resolvida',
  conversation_analysis_triggered: 'Análise de conversa iniciada',
  conversation_analysis_confirmed: 'Análise de conversa confirmada',
  contact_created: 'Contato criado',
  stage_change: 'Estágio alterado',
  opt_in_changed: 'Opt-in alterado',
}

function humanizeLabel(raw: string): string {
  if (!raw) return 'Atividade'
  if (LABEL_MAP[raw]) return LABEL_MAP[raw]
  // Parece chave técnica (snake_case, sem espaços)? Prettifica.
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(raw)) {
    const s = raw.replace(/_/g, ' ')
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  return raw
}

// Pipeline (contact_history_events) — mesmo mapa de ícones do HistoryTab,
// agora com cor de chip saturada em vez de classe translúcida.
const PIPELINE_VIS: Record<string, { Icon: RowVisual['Icon']; chip: string }> = {
  contact_created: { Icon: UserPlus, chip: CHIP.sky },
  stage_change:    { Icon: GitCommitHorizontal, chip: CHIP.brand },
  ai_update:       { Icon: Bot, chip: CHIP.amber },
  opt_in_changed:  { Icon: ShieldCheck, chip: CHIP.emerald },
  tags_updated:    { Icon: Tag, chip: CHIP.orange },
  tag_added:       { Icon: Tag, chip: CHIP.emerald },
  tag_removed:     { Icon: Tag, chip: CHIP.neutral },
  manual_edit:     { Icon: User, chip: CHIP.neutral },
}
const PIPELINE_FALLBACK = { Icon: User, chip: CHIP.neutral }

/**
 * O visualForActionKey (compartilhado com o painel de conversas) devolve
 * classes translúcidas ("bg-emerald-900/40 text-emerald-300"). Aqui a gente
 * extrai o matiz da classe e converte para a cor saturada do chip — sem
 * tocar no componente compartilhado.
 */
function chipFromIconClass(iconClass: string): string {
  if (iconClass.includes('emerald') || iconClass.includes('green')) return CHIP.emerald
  if (iconClass.includes('cyan')) return CHIP.cyan
  if (iconClass.includes('sky') || iconClass.includes('blue')) return CHIP.sky
  if (iconClass.includes('amber') || iconClass.includes('yellow')) return CHIP.amber
  if (iconClass.includes('orange')) return CHIP.orange
  if (iconClass.includes('violet') || iconClass.includes('purple') || iconClass.includes('fuchsia')) return CHIP.violet
  if (iconClass.includes('red') || iconClass.includes('rose')) return CHIP.red
  if (iconClass.includes('brand') || iconClass.includes('teal')) return CHIP.brand
  return CHIP.neutral
}

/**
 * Busca e funde as três fontes reais de histórico do contato — eventos de
 * CRM (pipeline), atividade de operadores e ações do agente IA — em ordem
 * cronológica decrescente. Cada fonte degrada para [] individualmente:
 * uma falha nunca apaga a timeline inteira.
 */
export async function fetchContactTimeline(contactId: string): Promise<TimelineEvent[]> {
  const [pipeline, userActivity, agentActions] = await Promise.all([
    contactsApi.getHistory(contactId).then((r) => r.data.data).catch(() => []),
    fetchContactActivity(contactId).catch(() => []),
    fetchAgentActionsByContact(contactId).catch(() => []),
  ])

  const merged: TimelineEvent[] = []

  for (const e of pipeline) {
    const vis = PIPELINE_VIS[e.type] ?? PIPELINE_FALLBACK
    merged.push({
      id: `p-${e.id}`,
      section: 'pipeline',
      ts: new Date(e.createdAt).getTime(),
      label: humanizeLabel(e.summary),
      actor: e.actorName ?? 'Sistema',
      Icon: vis.Icon,
      chip: vis.chip,
    })
  }

  for (const a of userActivity) {
    const vis = visualForActionKey(a.type, (a.metadata ?? {}) as Record<string, unknown>)
    merged.push({
      id: `u-${a.id}`,
      section: 'conversas',
      ts: new Date(a.timestamp).getTime(),
      label: humanizeLabel(vis.label),
      actor: a.actor ?? 'Sistema',
      Icon: vis.Icon,
      chip: chipFromIconClass(vis.iconClass),
    })
  }

  for (const a of agentActions) {
    merged.push({
      id: `a-${a.id}`,
      section: 'conversas',
      ts: new Date(a.createdAt).getTime(),
      label: a.humanSummary || 'Ação do agente',
      actor: a.agentName ?? 'Agente IA',
      Icon: Bot,
      chip: CHIP.violet,
    })
  }

  merged.sort((x, y) => y.ts - x.ts)
  return merged
}
