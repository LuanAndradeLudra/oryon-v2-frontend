import { DeliveryFunnel } from './DeliveryFunnel'
import { ReplyKpis } from './ReplyKpis'
import { FailuresCard } from './FailuresCard'
import { ReadHeatmap } from './ReadHeatmap'
import { RepliesCard } from './RepliesCard'
import type { ReportViewModel } from './reportModel'

interface ResultTabProps {
  model: ReportViewModel
  onVerContatos: () => void
  onVerRespostas: () => void
}

/** A grade 1.3fr / 1fr do mockup, em duas faixas. */
export function ResultTab({ model, onVerContatos, onVerRespostas }: ResultTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <DeliveryFunnel steps={model.funnel} avgTimeToReadMinutes={model.avgTimeToReadMinutes} />
        <div className="flex flex-col gap-3">
          <ReplyKpis kpis={model.kpis} />
          <FailuresCard
            failures={model.failures}
            total={model.failuresTotal}
            hasRecipientData={model.hasRecipientData}
            onVerContatos={onVerContatos}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <ReadHeatmap heatmap={model.heatmap} hasRecipientData={model.hasRecipientData} />
        <RepliesCard
          replies={model.replies}
          total={model.repliesTotal}
          detractorCount={model.detractorCount}
          hasRecipientData={model.hasRecipientData}
          onVerTodas={onVerRespostas}
        />
      </div>
    </div>
  )
}
