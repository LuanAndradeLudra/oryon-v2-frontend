/**
 * Phase 20: UX helpers centralized in one place so every notification
 * surface (bell list, modal, settings page) uses the same palette + logic.
 *
 * Keeping this separate from TopBar.tsx means we can ship the power-user
 * features without ballooning that file past readability.
 */

import type { AppNotification, NotificationMetaKnown } from '@/hooks/useNotifications'

// ── Category / visual mapping ──────────────────────────────────────────────

export type Category = 'conversations' | 'team' | 'campaigns' | 'automations' | 'security' | 'unknown'

/** Maps the 14 backend notification types to the 5 UI categories. The left
 *  accent strip color comes from here. */
export const TYPE_TO_CATEGORY: Record<string, Category> = {
  new_message: 'conversations',
  conversation_assigned: 'conversations',
  conversation_transferred: 'conversations',
  agent_handoff: 'conversations',
  agent_ai_response: 'conversations',
  conversation_waiting: 'conversations',
  team_message: 'team',
  mention: 'team',
  campaign_complete: 'campaigns',
  campaign_failed: 'campaigns',
  automation_executed: 'automations',
  automation_note: 'automations',
  whatsapp_integration_error: 'security',
  security_alert: 'security',
}

/** Single source of truth for the per-category visual palette. Used by the
 *  left accent strip, icon container, and category chip. */
export const CATEGORY_STYLE: Record<Category, {
  /** Full tailwind class applying the 3px left border in the bell list. */
  stripClass: string
  /** Tailwind bg class for the icon container. */
  iconBg: string
  /** Tailwind text class for the icon itself. */
  iconText: string
  /** Human label — kept short. */
  label: string
  /** Cor base do chip de categoria (var --chip do .color-chip) — mesmo
   *  padrão saturado das tags do pipeline: fundo cheio, texto branco. */
  chip: string
}> = {
  conversations: { stripClass: 'border-l-brand-400',  iconBg: 'bg-brand-600/15',  iconText: 'text-brand-300',  label: 'Conversas',  chip: 'var(--color-brand-600)' },
  team:          { stripClass: 'border-l-success',    iconBg: 'bg-success/15',    iconText: 'text-success',    label: 'Equipe',     chip: 'var(--color-success)' },
  campaigns:     { stripClass: 'border-l-info',       iconBg: 'bg-info/15',       iconText: 'text-info',       label: 'Campanhas',  chip: 'var(--color-info)' },
  automations:   { stripClass: 'border-l-warning',    iconBg: 'bg-warning/15',    iconText: 'text-warning',    label: 'Automações', chip: 'var(--color-warning)' },
  security:      { stripClass: 'border-l-danger',     iconBg: 'bg-danger/15',     iconText: 'text-danger',     label: 'Segurança',  chip: 'var(--color-danger)' },
  unknown:       { stripClass: 'border-l-surface-600', iconBg: 'bg-surface-700/40', iconText: 'text-surface-400', label: '—',        chip: 'var(--color-status-muted)' },
}

export function categoryOf(type: string): Category {
  return TYPE_TO_CATEGORY[type] ?? 'unknown'
}

// ── Priority treatment ─────────────────────────────────────────────────────

export type Priority = 'urgent' | 'normal' | 'low'

export const PRIORITY_STYLE: Record<Priority, {
  containerClass: string
  showPulse: boolean
}> = {
  urgent: { containerClass: 'ring-1 ring-danger/30 bg-danger/[0.03]', showPulse: true },
  normal: { containerClass: '', showPulse: false },
  low:    { containerClass: 'opacity-75', showPulse: false },
}

export function priorityOf(n: AppNotification): Priority {
  return (n.priority as Priority | undefined) ?? 'normal'
}

// ── Avatar generation (deterministic from name) ────────────────────────────

/** Pick a stable background color for an avatar from the name. Uses a simple
 *  hash so "João" always gets the same color, without needing a persisted
 *  palette mapping. */
const AVATAR_COLORS = [
  'bg-brand-600',
  'bg-success',
  'bg-info',
  'bg-warning',
  'bg-danger',
  'bg-purple-500',
  'bg-pink-500',
  'bg-teal-500',
] as const

export function avatarColorFor(name: string): string {
  if (!name) return 'bg-surface-700'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function initialsOf(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Extract the "subject" contact from a notification's metadata so we can
 *  render their avatar. Returns null for notifications that aren't
 *  primarily about a single contact (e.g. security_alert, campaign_*). */
export function contactSubject(n: AppNotification): { name: string; phone?: string } | null {
  const meta = (n.metadata ?? null) as NotificationMetaKnown | null
  if (!meta) return null
  // Grouped notifications: show first contact. If there's only one, they're
  // the subject; if there are many, we still render the first as a visual
  // anchor and the count lives in the description.
  if (Array.isArray(meta.contacts) && meta.contacts.length > 0) {
    const first = meta.contacts[0]
    return { name: first.name ?? first.phone ?? 'Contato', phone: first.phone }
  }
  if (meta.contactName || meta.contactPhone) {
    return { name: meta.contactName ?? meta.contactPhone ?? 'Contato', phone: meta.contactPhone }
  }
  return null
}

// ── Contextual timestamp ───────────────────────────────────────────────────

/**
 * Phase 20: contextual time in a compact format that adapts to distance.
 *   < 30s       → "agora"
 *   < 60min     → "há Xmin"
 *   < 24h today → "hoje HH:mm"
 *   yesterday   → "ontem HH:mm"
 *   < 7 days    → "seg 09:12" (day abbreviation)
 *   else        → "DD/MM"
 *
 * Locale hardcoded to pt-BR (single-language product).
 */
const WEEKDAY_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function formatListTime(iso: string, now = new Date()): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 30) return 'agora'
  if (diff < 60) return `há ${diff}s`
  const min = Math.floor(diff / 60)
  if (min < 60) return `há ${min} min`

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const startOfWeekAgo = startOfToday - 6 * 86_400_000
  const hhmm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (d.getTime() >= startOfToday) return `hoje ${hhmm}`
  if (d.getTime() >= startOfYesterday) return `ontem ${hhmm}`
  if (d.getTime() >= startOfWeekAgo) return `${WEEKDAY_PT[d.getDay()]} ${hhmm}`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ── Inline actions per type ────────────────────────────────────────────────

/** A compact action surfaced on hover in the bell list. Keeps the primary
 *  flow one-click from notice to action. `href` is a SPA route — the
 *  caller uses navigate() to avoid full page reload. */
export interface InlineAction {
  label: string
  href: string
  variant?: 'primary' | 'ghost'
}

export function inlineActionFor(n: AppNotification): InlineAction | null {
  const meta = (n.metadata ?? null) as NotificationMetaKnown | null

  switch (n.type) {
    case 'new_message':
    case 'conversation_assigned':
    case 'conversation_transferred':
    case 'agent_handoff':
    case 'conversation_waiting': {
      const convId = meta?.conversationId
      if (!convId) return null
      return { label: 'Abrir chat', href: `/conversations?id=${convId}`, variant: 'primary' }
    }
    case 'mention': {
      const convId = meta?.channelId
      if (!convId) return null
      return { label: 'Responder', href: `/team-chat?channel=${convId}`, variant: 'primary' }
    }
    case 'team_message': {
      const convId = meta?.channelId
      if (!convId) return null
      return { label: 'Abrir', href: `/team-chat?channel=${convId}` }
    }
    case 'campaign_complete':
    case 'campaign_failed': {
      const cid = meta?.campaignId
      if (!cid) return null
      return { label: 'Ver relatório', href: `/campaigns/${cid}`, variant: 'primary' }
    }
    case 'automation_executed':
    case 'automation_note': {
      const aid = meta?.automationId
      if (!aid) return null
      return { label: 'Ver automação', href: `/automations` }
    }
    case 'whatsapp_integration_error':
      return { label: 'Ver integração', href: '/settings/numbers', variant: 'primary' }
    case 'security_alert':
      return { label: 'Minha conta', href: '/settings/account' }
    default:
      return null
  }
}

// ── Empty state copy by filter ─────────────────────────────────────────────

export function emptyStateFor(
  category: string,
  filter: 'unread' | 'all',
  archived: boolean,
): { title: string; hint?: string } {
  if (archived) {
    return { title: 'Nenhuma notificação arquivada', hint: 'Tudo que você arquivou aparece aqui.' }
  }
  if (category === 'conversations') {
    return { title: 'Sem alertas de conversas', hint: 'Nenhuma mensagem aguardando no momento.' }
  }
  if (category === 'campaigns') {
    return { title: 'Nenhuma campanha pra mostrar', hint: 'Tudo fluindo liso.' }
  }
  if (category === 'automations') {
    return { title: 'Sem automações recentes', hint: 'As suas automações estão quietas.' }
  }
  if (category === 'team') {
    return { title: 'Silêncio no time', hint: 'Nenhuma mensagem ou menção nova.' }
  }
  if (category === 'security') {
    return { title: 'Tudo seguro ✓', hint: 'Nenhum alerta de segurança pendente.' }
  }
  return filter === 'unread'
    ? { title: 'Você está em dia ✨', hint: 'Sem notificações não lidas.' }
    : { title: 'Sem notificações por enquanto', hint: 'Você será avisado quando algo acontecer.' }
}

// ── Motion preferences ─────────────────────────────────────────────────────

/** Respects `prefers-reduced-motion`. SSR-safe (returns false on server). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
