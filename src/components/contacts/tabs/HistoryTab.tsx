import { useEffect, useState } from 'react'
import { Loader2, Bot, User, Tag, MessageSquare, GitCommitHorizontal, Megaphone, CheckCircle2, Zap } from 'lucide-react'
import { contactsApi } from '@/services/api'
import type { ContactHistoryEvent } from '@/types'

const EVENT_ICON: Record<ContactHistoryEvent['type'], React.ReactNode> = {
  ai_update:               <Bot className="w-3.5 h-3.5 text-status-pending" />,
  stage_change:            <GitCommitHorizontal className="w-3.5 h-3.5 text-brand-400" />,
  manual_edit:             <User className="w-3.5 h-3.5 text-surface-400" />,
  tag_added:               <Tag className="w-3.5 h-3.5 text-status-active" />,
  tag_removed:             <Tag className="w-3.5 h-3.5 text-red-400" />,
  campaign_added:          <MessageSquare className="w-3.5 h-3.5 text-violet-400" />,
  conversation_opened:     <MessageSquare className="w-3.5 h-3.5 text-blue-400" />,
  conversation_resolved:   <MessageSquare className="w-3.5 h-3.5 text-surface-400" />,
  note_added:              <User className="w-3.5 h-3.5 text-surface-400" />,
  ad_attribution_created:  <Megaphone className="w-3.5 h-3.5" style={{ color: '#1877f2' }} />,
  ai_analysis_completed:   <Bot className="w-3.5 h-3.5 text-brand-400" />,
  conversion_confirmed:    <CheckCircle2 className="w-3.5 h-3.5 text-status-active" />,
  capi_event_sent:         <Zap className="w-3.5 h-3.5 text-status-pending" />,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface HistoryTabProps {
  contactId: string
}

export function HistoryTab({ contactId }: HistoryTabProps) {
  const [events, setEvents] = useState<ContactHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    contactsApi.getHistory(contactId)
      .then((r) => setEvents(r.data.data))
      .finally(() => setLoading(false))
  }, [contactId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
        <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center">
          <GitCommitHorizontal className="w-5 h-5 text-surface-600" />
        </div>
        <p className="text-sm text-surface-400">Nenhum histórico registrado ainda.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="relative pl-5 flex flex-col gap-0">
        {/* Vertical line */}
        <div className="absolute left-2 top-3 bottom-3 w-px bg-surface-800" />

        {events.map((event, idx) => (
          <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Dot */}
            <div className="absolute -left-0.5 top-0.5 w-5 h-5 rounded-full bg-surface-900 border border-surface-700 flex items-center justify-center flex-shrink-0 z-10">
              {EVENT_ICON[event.type]}
            </div>

            {/* Content */}
            <div className="ml-7 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-surface-200">{event.summary}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-surface-500">{event.actorName}</span>
                <span className="text-surface-700">·</span>
                <span className="text-[11px] text-surface-600">{formatDate(event.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
