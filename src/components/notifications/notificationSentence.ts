import type { AppNotification } from '@/hooks/useNotifications'

/**
 * Frase estruturada por tipo — SCRUM-1097, direção A do painel (23/09).
 *
 * Diagnóstico do PO: "as notificações estão muito misturadas; só o ícone não
 * diferencia". Nos inboxes de referência (Linear, GitHub, Slack) o que
 * diferencia é a ESTRUTURA da frase — ator · ação · estado · contexto — e
 * uma cor de estado usada com parcimônia, não ícone nem cor de categoria.
 *
 * Tudo aqui vem dos metadados que o backend já anexa (inventário do Farol:
 * contactName, channelName, campaignName, automationName, sent/failed/
 * totalContacts, sourceActor, userNote…). Quando falta metadado, cai no
 * `title`/`description` originais — nunca inventa.
 */
export type Tone = 'danger' | 'warn' | 'ok'

export interface Sentence {
  /** Quem (pessoa/agente) — em peso 600. Ausente quando o sujeito é um objeto. */
  actor?: string
  /** Objeto em destaque (campanha, linha, automação) quando não há ator. */
  object?: string
  /** Verbo/ação em texto normal. */
  action: string
  /** Estado — a única cor da linha; só quando existe de verdade. */
  state?: { text: string; tone: Tone }
  /** Trecho/corpo (mensagem, nota) — texto mudo, 1–2 linhas. */
  excerpt?: string
  /** Onde aconteceu — sempre mudo, com " · ". */
  context?: string
}

type Meta = NonNullable<AppNotification['metadata']> & {
  contactName?: string
  channelName?: string
  campaignName?: string
  automationName?: string
  totalContacts?: number
  sent?: number
  failed?: number
  note?: string
  userNote?: string
  sourceActor?: string
  sourceLabel?: string
  contacts?: Array<{ id?: string; name?: string; phone?: string }>
}

const num = (n: number) => n.toLocaleString('pt-BR')

function ctx(...parts: Array<string | undefined | null | false>): string | undefined {
  const p = parts.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  return p.length ? p.join(' · ') : undefined
}

export function sentenceFor(n: AppNotification): Sentence {
  const m = (n.metadata ?? {}) as Meta
  const contact = m.contactName || (m.contacts && m.contacts[0]?.name) || undefined
  const channel = m.channelName || undefined
  const desc = n.description || undefined
  const actorSrc = m.sourceActor || m.sourceLabel || undefined

  switch (n.type) {
    case 'new_message':
      return { actor: contact ?? n.title, action: contact ? 'enviou uma mensagem' : '', excerpt: contact ? desc : undefined, context: ctx(channel) }
    case 'conversation_assigned':
      return { actor: contact ?? n.title, action: contact ? 'foi atribuído a você' : '', context: ctx(actorSrc && `por ${actorSrc}`, channel) }
    case 'conversation_transferred':
      return { actor: contact ?? n.title, action: contact ? 'foi transferido para você' : '', context: ctx(actorSrc && `por ${actorSrc}`, channel) }
    case 'agent_handoff':
      if (!contact && !m.automationName) return { object: n.title, action: '', state: desc ? { text: desc, tone: 'warn' } : undefined }
      return {
        actor: m.automationName || 'Agente de IA',
        action: 'pediu transferência',
        state: { text: desc || 'Cliente pediu atendimento humano', tone: 'warn' },
        context: ctx(contact, channel),
      }
    case 'agent_ai_response':
      if (!contact && !m.automationName) return { object: n.title, action: '', excerpt: desc }
      return { actor: m.automationName || 'Agente de IA', action: 'respondeu por você', excerpt: desc, context: ctx(contact, channel) }
    case 'conversation_waiting':
      return {
        actor: contact ?? n.title,
        action: contact ? 'está aguardando resposta' : '',
        state: { text: desc || 'Sem resposta', tone: 'warn' },
        context: ctx(channel),
      }
    case 'team_message':
      if (!actorSrc) return { object: n.title, action: '', excerpt: desc, context: ctx(channel && `#${channel.replace(/^#/, '')}`) }
      return { actor: actorSrc, action: 'enviou uma mensagem', excerpt: desc, context: ctx(channel && `#${channel.replace(/^#/, '')}`) }
    case 'mention':
      if (!actorSrc) return { object: n.title, action: '', excerpt: desc, context: ctx(channel && `#${channel.replace(/^#/, '')}`) }
      return { actor: actorSrc, action: 'mencionou você', excerpt: desc, context: ctx(channel && `#${channel.replace(/^#/, '')}`) }
    case 'campaign_complete':
      if (!m.campaignName) return { object: n.title, action: '', excerpt: desc }
      return {
        object: m.campaignName,
        action: 'concluída',
        state: typeof m.sent === 'number' ? { text: `${num(m.sent)} enviadas`, tone: 'ok' } : { text: 'Concluída', tone: 'ok' },
        context: ctx(typeof m.failed === 'number' && m.failed > 0 && `${num(m.failed)} falhas`, !m.campaignName && desc),
      }
    case 'campaign_failed':
      if (!m.campaignName) return { object: n.title, action: '', state: desc ? { text: desc, tone: 'danger' } : undefined }
      return {
        object: m.campaignName,
        action: 'falhou',
        state: { text: typeof m.failed === 'number' ? `${num(m.failed)} não entregues` : (desc || 'Falha no envio'), tone: 'danger' },
        context: ctx(typeof m.failed === 'number' && desc),
      }
    case 'automation_executed':
      if (!m.automationName) return { object: n.title, action: '', excerpt: desc }
      return {
        object: m.automationName,
        action: 'executada',
        context: ctx(typeof m.totalContacts === 'number' && `${num(m.totalContacts)} contato${m.totalContacts === 1 ? '' : 's'}`, contact, desc && !m.automationName ? desc : undefined),
      }
    case 'automation_note':
      if (!m.automationName) return { object: n.title, action: '', excerpt: m.userNote || m.note || desc }
      return { object: m.automationName, action: 'deixou uma nota', excerpt: m.userNote || m.note || desc, context: ctx(contact) }
    case 'whatsapp_integration_error':
      // O tipo cobre mais que "linha caiu" (ex.: template rejeitado numa
      // campanha): sem channelName, o título original é a única verdade.
      if (!channel) return { object: n.title, action: '', state: desc ? { text: desc, tone: 'danger' } : undefined }
      return {
        object: channel,
        action: 'desconectou do WhatsApp',
        state: { text: desc || 'Reconecte para voltar a receber mensagens', tone: 'danger' },
      }
    case 'security_alert':
      return { object: n.title, action: '', state: desc ? { text: desc, tone: 'danger' } : undefined }
    default:
      return { object: n.title, action: '', excerpt: desc }
  }
}

/** Tom da linha: só quando há estado. Urgente (prioridade) força perigo. */
export function toneFor(n: AppNotification, s: Sentence): Tone | undefined {
  if (n.priority === 'urgent') return 'danger'
  return s.state?.tone
}
