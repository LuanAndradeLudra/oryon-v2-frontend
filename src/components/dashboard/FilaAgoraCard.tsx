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

function actorChip(kind: Conversation['lastMessageSenderKind']): string | null {
  if (kind === 'ai') return 'IA'
  if (kind === 'campaign' || kind === 'rule') return 'auto'
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
      <div className="flex items-center gap-2 min-h-10 px-3.5 border-b border-surface-700">
        <p className="text-[13px] font-semibold text-surface-100">Fila agora</p>
        <span className="flex items-center gap-1 text-[11px] text-surface-400">
          <span className="w-1.5 h-1.5 rounded-full bg-online" aria-hidden />
          ao vivo
        </span>
        <span className="ml-auto text-[11.5px] text-surface-400 tabular-nums">{total}</span>
      </div>

      {loading ? (
        <div className="h-[132px] animate-pulse bg-[var(--sf2)]" aria-hidden />
      ) : rows.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-xs text-surface-500">Ninguém esperando na fila.</p>
      ) : (
        <div>
          {rows.map((c) => {
            const min = waitMinutes(c.lastMessageAt)
            const chip = actorChip(c.lastMessageSenderKind)
            return (
              <Link
                key={c.id}
                to={`/conversations?id=${c.id}`}
                className="flex items-center gap-2.5 h-11 px-3.5 border-b border-surface-700 hover:bg-[var(--rowhover)] transition-colors"
              >
                <span className="w-[26px] h-[26px] rounded-full bg-avatar-surface text-avatar-initials text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                  {getInitials(c.contact.displayName)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-semibold text-surface-100 truncate">{c.contact.displayName}</span>
                  <span className="block text-[11px] text-surface-400 truncate">{c.lastMessagePreview}</span>
                </span>
                <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span
                    className={cn(
                      'text-[11.5px] font-bold tabular-nums',
                      min >= DANGER_MIN ? 'text-danger' : min >= WARN_MIN ? 'text-warning' : 'text-surface-400',
                    )}
                  >
                    {formatWait(min)}
                  </span>
                  {chip && (
                    <span className="text-[9.5px] font-bold px-1 rounded-[4px] bg-status-pending-bg text-status-pending leading-[14px]">{chip}</span>
                  )}
                </span>
              </Link>
            )
          })}
          <Link
            to="/conversations"
            className="flex items-center justify-center h-8 text-[11.5px] text-surface-400 hover:text-surface-200 transition-colors"
          >
            Ver todas as {total}
          </Link>
        </div>
      )}
    </div>
  )
}
