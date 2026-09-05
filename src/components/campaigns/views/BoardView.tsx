import { KanbanSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

// Skeleton (W0.1/SCRUM-994) — stub que o W0.4/SCRUM-997 (Alavanca) substitui;
// o conteúdo real (5 colunas por status) chega no D1b (Andaime). Sem props
// nesta onda.
export function BoardView() {
  return (
    <EmptyState
      icon={KanbanSquare}
      title="Board em construção"
      hint="A visão em colunas por status dos disparos chega em uma próxima leva."
      className="m-6"
    />
  )
}
