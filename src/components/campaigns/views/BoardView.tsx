import { Kanban } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export function BoardView() {
  return (
    <div className="flex-1 flex items-center justify-center p-5">
      <EmptyState
        icon={Kanban}
        title="Em construção"
        hint="A visão de board por status das campanhas está sendo desenhada — por enquanto, use a lista."
      />
    </div>
  )
}
