import { useEffect, useState } from 'react'
import { Loader2, MessageSquare, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { contactsApi } from '@/services/api'
import { relativeDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import type { Conversation } from '@/types'

interface ConversationsTabProps {
  contactId: string
  /** Sem conversa ainda → CTA de iniciar via template (fallback do header). */
  onStartConversation?: () => void
}

export function ConversationsTab({ contactId, onStartConversation }: ConversationsTabProps) {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    setError(false)
    contactsApi.getConversations(contactId)
      .then((r) => setConvs(r.data.data))
      .catch(() => setError(true)) // nunca mapear falha para "nenhuma conversa"
      .finally(() => setLoading(false))
  }

  useEffect(load, [contactId])

  const handleOpen = (conv: Conversation) => {
    navigate(`/conversations?id=${conv.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorState compact title="Não foi possível carregar as conversas." onRetry={load} />
      </div>
    )
  }

  if (convs.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma conversa com este contato."
          hint="Inicie um atendimento enviando um template do WhatsApp."
          {...(onStartConversation ? { action: { label: 'Enviar template', onClick: onStartConversation } } : {})}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-surface-700/60">
      {convs.map((conv) => (
        <button
          key={conv.id}
          onClick={() => handleOpen(conv)}
          className="flex items-start gap-3 px-4 py-3 hover:bg-surface-800/50 transition-colors text-left group"
        >
          <MessageSquare className="w-4 h-4 text-surface-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={conv.status}>
                {conv.status === 'open' ? 'Aberta' : conv.status === 'pending' ? 'Pendente' : conv.status === 'resolved' ? 'Resolvida' : 'Arquivada'}
              </Badge>
              <span className="text-xs text-surface-400">{relativeDate(conv.lastMessageAt)}</span>
              {conv.whatsappNumber?.displayPhoneNumber && (
                <span className="text-xs text-surface-500 truncate">{conv.whatsappNumber.displayPhoneNumber}</span>
              )}
            </div>
            <p className="text-sm text-surface-300 truncate">{conv.lastMessagePreview}</p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-surface-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </button>
      ))}
    </div>
  )
}
