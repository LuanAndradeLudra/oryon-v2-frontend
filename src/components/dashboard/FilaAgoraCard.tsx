import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { conversationsApi } from '@/services/api'
import { cn, getInitials } from '@/lib/utils'
import type { Conversation } from '@/types'

// R2-DASH-01 (Rodada 2, tela 1b): "Fila agora" — conversas em `pending` (a
// mesma definição de fila de /home/stats.queueCount), mais antigas primeiro.
// Dado 100% real (Conversation.contact / lastMessagePreview / lastMessageAt /
// lastMessageSenderKind). Os cortes de cor do tempo de espera (5 e 15 min) são
// visuais fixos — não existe SLA configurável no produto; o "15 min" é o mesmo
// limiar que o próprio mock cita ("sem resposta > 15 min").
const WARN_MIN = 5
const DANGER_MIN = 15
const MAX_ROWS = 3

function waitMinutes(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}

function formatWait(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return h < 24 ? `${h} h` : `${Math.floor(h / 24)} d`
}

// Chip de ator (canvas 1b): IA/auto em âmbar; atendente humano = primeiro nome em verde.
function actorChip(c: Conversation): { text: string; tone: 'amber' | 'ok' } | null {
  const kind = c.lastMessageSenderKind
  if (kind === 'ai') return { text: 'IA', tone: 'amber' }
  if (kind === 'campaign' || kind === 'rule') return { text: 'auto', tone: 'amber' }
  if (kind === 'operator' && c.assignedUser?.firstName) return { text: c.assignedUser.firstName, tone: 'ok' }
  return null
}

export function FilaAgoraCard() {
  const [rows, setRows] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    conversationsApi.list({ status: 'pending' }, 1, MAX_ROWS)
      .then(({ data }) => {
        if (cancelled) return
        const sorted = [...data.data].sort(
          (a, b) => new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime(),
        )
        setRows(sorted)
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 h-10 px-3.5 border-b border-surface-700">
        <p className="text-[13px] font-semibold text-surface-100">Fila agora</p>
        <span className="inline-flex items-center gap-[5px] text-[11px] text-surface-400">
          <span className="w-1.5 h-1.5 rounded-full bg-online" aria-hidden />
          ao vivo
        </span>
        <span className="ml-auto text-xs text-surface-400 tabular-nums">{total}</span>
      </div>

      {loading ? (
        <div className="h-[132px] animate-pulse bg-[var(--sf2)]" aria-hidden />
      ) : rows.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-xs text-surface-500">Ninguém esperando na fila.</p>
      ) : (
        <div>
          {rows.map((c) => {
            const min = waitMinutes(c.lastMessageAt)
            const chip = actorChip(c)
            return (
              <Link
                key={c.id}
                to={`/conversations?id=${c.id}`}
                className="flex items-center gap-2.5 h-11 px-3.5 border-b border-surface-700 hover:bg-[var(--rowhover)] transition-colors"
              >
                <span className="w-[26px] h-[26px] rounded-full bg-avatar-surface text-avatar-initials text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {getInitials(c.contact.displayName)}
                </span>
                <span className="flex-1 min-w-0 leading-[1.25]">
                  <span className="block text-[12.5px] font-semibold text-surface-100 truncate">{c.contact.displayName}</span>
                  <span className="block text-[11px] text-surface-400 truncate">{c.lastMessagePreview}</span>
                </span>
                <span className="flex flex-col items-end gap-[3px] flex-shrink-0">
                  <span
                    className={cn(
                      'text-[11px] font-semibold tabular-nums',
                      min >= DANGER_MIN ? 'text-danger' : min >= WARN_MIN ? 'text-status-pending' : 'text-surface-400',
                    )}
                  >
                    {formatWait(min)}
                  </span>
                  {chip && (
                    <span className={cn(
                      'inline-flex items-center h-4 px-[5px] rounded-[5px] text-[10px] font-bold',
                      chip.tone === 'amber' ? 'bg-status-pending-bg text-status-pending' : 'bg-status-active-bg text-status-active',
                    )}>{chip.text}</span>
                  )}
                </span>
              </Link>
            )
          })}
          <Link
            to="/conversations"
            className="flex items-center justify-center h-8 text-xs font-semibold text-surface-400 hover:text-surface-200 transition-colors"
          >
            Ver todas as {total}
          </Link>
        </div>
      )}
    </div>
  )
}
