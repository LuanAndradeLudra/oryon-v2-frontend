import { useParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

// Skeleton (W0.1/SCRUM-994) — o composer real (telefone com dados reais +
// blocos + barra fixa) chega no D2 (Alavanca), depois do W0.4.
export function CampaignComposerPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="flex flex-col h-full">
      <PageHeader title={id ? 'Editar disparo' : 'Novo disparo'} subtitle="Configure uma campanha de mensagens" />
      <div className="flex-1 overflow-y-auto p-6">
        <EmptyState
          icon={Send}
          title="Composer em construção"
          hint="O fluxo guiado de criação de disparos chega em uma próxima leva. Por enquanto, use a aba Disparos → Templates."
        />
      </div>
    </div>
  )
}
