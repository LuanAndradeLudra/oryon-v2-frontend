// B2 (SCRUM-928) — aba "Conversas": a de origem em destaque; "abrir ao lado"
// carrega o chat no painel oposto SEM navegar (preserva o rascunho); demais
// conversas do contato, para baixo.
import { useState, useEffect } from 'react'
import { Loader2, MessageSquare, ArrowUpRight, Star } from 'lucide-react'
import { conversationsApi } from '@/services/api'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { Conversation } from '@/types'

interface DealConversationsTabProps {
  contactId: string
  originConversationId?: string | null
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberta', pending: 'Pendente', resolved: 'Resolvida', abandoned: 'Abandonada',
}

function ConversationRow({ conversation, isOrigin, onOpenBeside }: { conversation: Conversation; isOrigin: boolean; onOpenBeside: () => void }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 px-3.5 py-3 rounded-xl border transition-colors',
        isOrigin ? 'border-brand-500/40 bg-brand-500/5' : 'border-surface-800 bg-surface-900',
      )}
      data-testid={isOrigin ? 'deal-origin-conversation' : 'deal-other-conversation'}
    >
      <MessageSquare className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isOrigin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-300">
              <Star className="w-3 h-3" /> origem deste negócio
            </span>
          )}
          <span className="text-[11px] text-surface-500">{STATUS_LABEL[conversation.status] ?? conversation.status}</span>
          {conversation.unreadCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-600 text-surface-950">{conversation.unreadCount}</span>
          )}
        </div>
        <p className="text-sm text-surface-200 truncate mt-0.5">{conversation.lastMessagePreview || '(sem mensagens)'}</p>
        <p className="text-[11px] text-surface-500 mt-0.5">
          {formatRelativeTime(conversation.lastMessageAt)}
          {conversation.assignedUser && <> · {conversation.assignedUser.firstName}</>}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenBeside}
        title="Abrir ao lado"
        data-testid="deal-conversation-open-beside"
        className="flex-shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
      >
        Abrir ao lado <ArrowUpRight className="w-3 h-3" />
      </button>
    </div>
  )
}

export function DealConversationsTab({ contactId, originConversationId }: DealConversationsTabProps) {
  const { openConversationBeside } = useDealPanel()
  const [conversations, setConversations] = useState<Conversation[] | 'loading' | 'error'>('loading')

  // Ajusta durante o render ao trocar de contato (não num efeito) — evita
  // cascata de setState; a busca em si segue no efeito abaixo.
  const [seenContactId, setSeenContactId] = useState(contactId)
  if (contactId !== seenContactId) {
    setSeenContactId(contactId)
    setConversations('loading')
  }

  useEffect(() => {
    let cancelled = false
    conversationsApi.list({ contactId }, 1, 50)
      .then((res) => { if (!cancelled) setConversations(res.data.data ?? []) })
      .catch(() => { if (!cancelled) setConversations('error') })
    return () => { cancelled = true }
  }, [contactId])

  if (conversations === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-surface-500 py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando conversas…
      </div>
    )
  }
  if (conversations === 'error') {
    return <p className="text-sm text-danger text-center py-6 px-5">Não foi possível carregar as conversas.</p>
  }
  if (conversations.length === 0) {
    return <p className="text-sm text-surface-500 text-center py-6 px-5">Nenhuma conversa com este contato.</p>
  }

  const origin = conversations.find((c) => c.id === originConversationId)
  const others = conversations.filter((c) => c.id !== originConversationId)

  return (
    <div className="flex flex-col gap-2.5 px-5 py-5">
      {origin && <ConversationRow conversation={origin} isOrigin onOpenBeside={() => openConversationBeside(origin.id)} />}
      {others.map((c) => (
        <ConversationRow key={c.id} conversation={c} isOrigin={false} onOpenBeside={() => openConversationBeside(c.id)} />
      ))}
    </div>
  )
}
