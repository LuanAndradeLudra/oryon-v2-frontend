import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { ConversationItem } from '@/components/conversations/ConversationList/ConversationItem'
import { useConversations } from '@/hooks/useConversations'
import { cn } from '@/lib/utils'
import type { Conversation, ConversationFilters } from '@/types'

type Tab = 'pending' | 'mine'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'mine', label: 'Atribuídas a mim' },
]

const TAB_FILTERS: Record<Tab, ConversationFilters> = {
  // Pendentes: conversas marcadas como pending — precisam de retomada/follow-up
  pending: { status: 'pending' },
  // Atribuídas a mim: abertas que tem que responder
  mine: { assignedTo: 'me', status: 'open' },
}

const EMPTY_STATES: Record<Tab, { title: string; hint: string }> = {
  pending: {
    title: 'Nenhuma pendência',
    hint: 'Conversas marcadas como pendentes aparecem aqui.',
  },
  mine: {
    title: 'Nenhuma conversa atribuída',
    hint: 'Conversas atribuídas a você aparecem aqui.',
  },
}

export function TasksPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pending')
  const filters = useMemo(() => TAB_FILTERS[tab], [tab])
  const { conversations, loading } = useConversations(filters)

  const handleSelect = (conv: Conversation) => {
    navigate(`/conversations?id=${conv.id}`)
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <MobilePageHeader title="Tarefas" />

      {/* Tabs */}
      <div className="flex-shrink-0 flex gap-2 px-3 py-2 border-b border-surface-800/60 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border',
              tab === t.key
                ? 'bg-brand-600/20 text-brand-300 border-brand-600/40'
                : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200',
            )}
          >
            {t.label}
            {!loading && tab === t.key && conversations.length > 0 && (
              <span className="ml-1.5 text-[10px] text-surface-400">{conversations.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
            <span className="text-xs text-surface-500">Carregando...</span>
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={false}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ tab }: { tab: Tab }) {
  const empty = EMPTY_STATES[tab]
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-status-active-bg border border-status-active-border flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 text-status-active" />
      </div>
      <p className="text-sm font-medium text-surface-200">{empty.title}</p>
      <p className="text-xs text-surface-500 max-w-xs leading-relaxed">{empty.hint}</p>
    </div>
  )
}
