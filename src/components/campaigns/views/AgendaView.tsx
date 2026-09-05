import { CalendarDays } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

// Skeleton (W0.1/SCRUM-994) — stub que o W0.4/SCRUM-997 (Alavanca) substitui;
// o conteúdo real (mini-calendário + fluxo vertical) chega no D1 (Andaime).
// Sem props nesta onda.
export function AgendaView() {
  return (
    <EmptyState
      icon={CalendarDays}
      title="Agenda em construção"
      hint="A visão de agenda dos disparos chega em uma próxima leva."
      className="m-6"
    />
  )
}
