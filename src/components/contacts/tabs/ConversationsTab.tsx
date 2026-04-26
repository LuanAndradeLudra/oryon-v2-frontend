import { useEffect, useState } from 'react'
import { Loader2, MessageSquare, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { contactsApi } from '@/services/api'
import { relativeDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { Conversation } from '@/types'

interface ConversationsTabProps {
  contactId: string
}

export function ConversationsTab({ contactId }: ConversationsTabProps) {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    contactsApi.getConversations(contactId)
      .then((r) => setConvs(r.data.data))
      .finally(() => setLoading(false))
  }, [contactId])

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

  if (convs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
        <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-surface-600" />
        </div>
        <p className="text-sm text-surface-400">Nenhuma conversa com este contato.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-surface-800">
      {convs.map((conv) => (
        <button
          key={conv.id}
          onClick={() => handleOpen(conv)}
          className="flex items-start gap-3 px-4 py-3 hover:bg-surface-800/50 transition-colors text-left group"
        >
          <MessageSquare className="w-4 h-4 text-surface-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={conv.status}>
                {conv.status === 'open' ? 'Aberta' : conv.status === 'pending' ? 'Pendente' : conv.status === 'resolved' ? 'Resolvida' : 'Arquivada'}
              </Badge>
              <span className="text-xs text-surface-500">{relativeDate(conv.lastMessageAt)}</span>
              {conv.whatsappNumber?.displayPhoneNumber && (
                <span className="text-xs text-surface-600 truncate">{conv.whatsappNumber.displayPhoneNumber}</span>
              )}
            </div>
            <p className="text-sm text-surface-300 truncate">{conv.lastMessagePreview}</p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </button>
      ))}
    </div>
  )
}
