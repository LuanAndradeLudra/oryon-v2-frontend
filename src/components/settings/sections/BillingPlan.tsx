import { SectionHeader } from '../SectionHeader'
import { BillingSettings } from './BillingSettings'

export function BillingPlan() {
  return (
    <div>
      <SectionHeader
        title="Plano & Faturamento"
        description="Gerencie sua assinatura, créditos de IA e histórico de pagamentos."
      />
      <BillingSettings />
    </div>
  )
}
