import { Calendar } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export function AgendaView() {
  return (
    <div className="flex-1 flex items-center justify-center p-5">
      <EmptyState
        icon={Calendar}
        title="Em construção"
        hint="A visão de agenda das campanhas está sendo desenhada — por enquanto, use a lista."
      />
    </div>
  )
}
