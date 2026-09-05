import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

// Skeleton (W0.1/SCRUM-994) — o Studio real (acordeão de 8 etapas, cartão
// blueprint, prévia ao vivo) chega no A3 (Compasso), depois do W0.3.
export function AgentStudioPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Novo agente" subtitle="Configure um agente de IA do zero" />
      <div className="flex-1 overflow-y-auto p-6">
        <EmptyState
          icon={Sparkles}
          title="Studio em construção"
          hint="O fluxo guiado de criação de agentes chega em uma próxima leva. Por enquanto, use “Novo agente” na lista de Agentes."
        />
      </div>
    </div>
  )
}
