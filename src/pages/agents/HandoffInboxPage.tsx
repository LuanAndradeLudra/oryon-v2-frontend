import { Inbox } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

// Skeleton (W0.1/SCRUM-994) — a caixa de transferências real chega no A6
// (Tecelã), depois de BE.6 (handoff_events).
export function HandoffInboxPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Transferências" subtitle="Conversas aguardando um humano" />
      <div className="flex-1 overflow-y-auto p-6">
        <EmptyState
          icon={Inbox}
          title="Caixa de transferências em construção"
          hint="A fila de handoffs entre a IA e o time chega em uma próxima leva."
        />
      </div>
    </div>
  )
}
