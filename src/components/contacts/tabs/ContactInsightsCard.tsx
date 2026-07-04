import { useState, useEffect } from 'react'
import { Activity, MessageSquare, Clock, CalendarDays, Eye, Tag, Repeat2, UserPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { contactsApi } from '@/services/api'
import type { Contact } from '@/types'

function formatAbsolute(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatRelative(iso?: string) {
  if (!iso) return null
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR })
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string | null }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-surface-500 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-surface-500 font-medium">{label}</p>
        <p className="text-sm text-surface-200 truncate">{value}</p>
        {sub && <p className="text-[10px] text-surface-500 truncate">{sub}</p>}
      </div>
    </div>
  )
}

interface Props {
  contact: Contact
}

export function ContactInsightsCard({ contact }: Props) {
  const [lastMessage, setLastMessage] = useState<{ preview: string; status: string; at: string } | null>(null)

  useEffect(() => {
    contactsApi.getConversations(contact.id).then((r) => {
      const conv = r.data?.data?.[0]
      if (conv) {
        setLastMessage({
          preview: conv.lastMessagePreview ?? '',
          status: conv.status,
          at: conv.lastMessageAt,
        })
      }
    }).catch(() => {})
  }, [contact.id])

  const isNew = (contact.conversationCount ?? 0) <= 1
  const daysSinceCreation = Math.floor((Date.now() - new Date(contact.createdAt).getTime()) / 86400000)

  const STATUS_LABELS: Record<string, string> = {
    open: 'Aberta',
    pending: 'Pendente',
    resolved: 'Resolvida',
    abandoned: 'Abandonada',
  }

  return (
    <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-surface-400" /> Visão Rápida
        </h3>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-surface-700 text-surface-400 bg-surface-800">
          {isNew ? (
            <span className="flex items-center gap-1"><UserPlus className="w-3 h-3" /> Novo contato</span>
          ) : (
            <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" /> Recorrente · {contact.conversationCount} conversas</span>
          )}
        </span>
      </div>

      <div className="px-4 py-4 grid grid-cols-2 gap-4">
        {/* Last message */}
        {lastMessage && (
          <div className="col-span-2">
            <Stat
              icon={<MessageSquare className="w-3.5 h-3.5" />}
              label={`Última mensagem · Conversa ${STATUS_LABELS[lastMessage.status] ?? lastMessage.status}`}
              value={lastMessage.preview || '(sem preview)'}
              sub={formatRelative(lastMessage.at)}
            />
          </div>
        )}

        {/* Last contacted */}
        <Stat
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Último contato"
          value={contact.lastContactedAt ? formatRelative(contact.lastContactedAt)! : 'Nunca'}
          sub={formatAbsolute(contact.lastContactedAt)}
        />

        {/* First contacted */}
        <Stat
          icon={<CalendarDays className="w-3.5 h-3.5" />}
          label="Primeiro contato"
          value={contact.firstContactedAt ? formatRelative(contact.firstContactedAt)! : formatRelative(contact.createdAt)!}
          sub={daysSinceCreation === 0 ? 'Hoje' : `Há ${daysSinceCreation} dia${daysSinceCreation > 1 ? 's' : ''}`}
        />

        {/* Last seen */}
        {contact.lastSeenAt && (
          <Stat
            icon={<Eye className="w-3.5 h-3.5" />}
            label="Último visto"
            value={formatRelative(contact.lastSeenAt)!}
            sub={formatAbsolute(contact.lastSeenAt)}
          />
        )}

        {/* Tags */}
        {(contact.tags?.length ?? 0) > 0 && (
          <div className="col-span-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-surface-500" />
              <p className="text-[11px] text-surface-500 font-medium">Tags</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags!.map((tag) => (
                <span
                  key={tag.id}
                  className="color-chip text-[11px] font-medium px-2 py-0.5 rounded-full border"
                  style={{ ['--chip']: tag.color } as React.CSSProperties}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
