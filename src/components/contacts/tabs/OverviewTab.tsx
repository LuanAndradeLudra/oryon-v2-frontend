import { AIContextCard } from './AIContextCard'
import { ContactInsightsCard } from './ContactInsightsCard'
import { EngagementCard } from './EngagementCard'
import { DealsSummaryCard } from './DealsSummaryCard'
import { QualificationCard } from './QualificationCard'
import { AttributionCard } from './AttributionCard'
import { isFeatureVisible } from '@/config/featureFlags'
import type { Contact } from '@/types'

interface OverviewTabProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
  onRefresh?: () => void
}

// Fase 1 (plano de UI do drawer, achado do usuário): o `StageCard` full-size
// saiu daqui — misturava "Estágio" (fase do contato, ciclo de vida) com os
// funis de negócio de verdade, mostrados logo acima por `DealsSummaryCard`.
// O componente continua existindo (outros lugares o usam — `ContactDetailPanel`,
// `ContactsStatsBar`, `ProfileMobileView`, `QualificationCard`, `DealSummary`),
// só não mais como card irmão do resumo de negócios nesta aba.
//
// Reauditoria de fidelidade (item 4): Dados/Etiquetas/Campos personalizados
// saíram desta aba — viraram `ContactIdentityPanel`, coluna fixa em
// `ContactDetailPanel` que persiste entre TODAS as abas (o mockup mostra
// esse painel sempre visível, não só na Visão Geral). Esta aba agora é só a
// pilha de leitura derivada/negócio.
export function OverviewTab({ contact, onSave, onRefresh }: OverviewTabProps) {
  // Card "Contexto da IA" gateado por feature flag — escondido enquanto a
  // geração automática está desligada (FF_AUTO_AI_PROFILE_ON_RESOLVE=false
  // no backend). Para reativar, basta flippar `aiContextCard` em
  // frontend/src/config/featureFlags.ts.
  const showAiContext = isFeatureVisible('aiContextCard')
  return (
    <div className="flex flex-col gap-4 p-4">
      {showAiContext && <AIContextCard contact={contact} onRefresh={onRefresh} />}
      <AttributionCard contact={contact} />
      <ContactInsightsCard contact={contact} />
      <EngagementCard contactId={contact.id} />
      <DealsSummaryCard contactId={contact.id} contactName={contact.displayName} />
      <QualificationCard contact={contact} onSave={onSave} />
    </div>
  )
}
