import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { WhatsAppNumber } from '@/types'
import type { Pipeline } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "Label — displayPhoneNumber", falling back to just the phone number when unlabeled. */
export function formatWaSelectLabel(n: WhatsAppNumber): string {
  if (n.label?.trim()) return `${n.label.trim()} — ${n.displayPhoneNumber}`
  return n.displayPhoneNumber
}

/**
 * Retries an async operation up to `attempts` times with exponential back-off.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 350,
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === attempts - 1) throw err
      await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)))
    }
  }
  throw new Error('unreachable')
}

/** Extrai a mensagem de erro de uma resposta axios (`error.response.data.message`),
 *  caindo para `error.message` e por fim para `fallback`. O `ValidationPipe`
 *  padrão do NestJS (sem `exceptionFactory` customizado) devolve `message`
 *  como array de strings — sem tratar isso, o erro real ficava escondido
 *  atrás do texto genérico do axios ("Request failed with status code 400"). */
export function getApiErrorMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  if (typeof msg === 'string') return msg
  if (Array.isArray(msg) && msg.length > 0) return msg[0]
  if (e instanceof Error) return e.message
  return fallback
}

/** Funil "default" de um tenant — o marcado `isDefault`, senão o primeiro da
 *  lista (ordem já vem por `order` do backend). Centraliza a regra de
 *  fallback repetida em NewContactDrawer/ImportContactsDrawer/DealModal/
 *  PipelineStagesManager para não divergir entre elas. */
export function getDefaultPipeline(pipelines: Pipeline[]): Pipeline | undefined {
  return pipelines.find((p) => p.isDefault) ?? pipelines[0]
}

export function formatMessageTime(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Ontem'
  return format(d, 'dd/MM/yyyy')
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export function formatFullTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

/**
 * Convert a #rrggbb hex colour to an rgba() string.
 * Used for stage/tag colour tinting across the contacts UI.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Compact relative date label for contact lists.
 * Returns "—" for empty, "5m atrás", "3h atrás", "2d atrás", or "DD/MM".
 */
export function relativeDate(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `${min}m atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ── Chat / avatar helpers ──────────────────────────────────────────────────────

export const AVATAR_COLORS = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600',
  'bg-rose-600',  'bg-amber-600',  'bg-cyan-600',
] as const

/** Stable color class for an avatar based on the first character of a name. */
export function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

/**
 * Compact relative time label for chat lists.
 * Returns "agora", "5m", "3h", or "DD/MM".
 */
export function chatRelTime(iso?: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 2) return 'agora'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
