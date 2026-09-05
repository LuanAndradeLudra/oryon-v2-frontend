import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

// Skeleton (W0.1/SCRUM-994) — o relatório real (funil SVG, heatmap, falhas,
// respostas) chega no D3 (Auditor), depois de BE.1.
export function CampaignReportPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Relatório do disparo" subtitle="Resultado da campanha" />
      <div className="flex-1 overflow-y-auto p-6">
        <EmptyState
          icon={BarChart3}
          title="Relatório em construção"
          hint="O funil, o heatmap de leitura e a lista de falhas chegam em uma próxima leva."
        />
      </div>
    </div>
  )
}
