import { AIContextCard } from './AIContextCard'
import { ContactInsightsCard } from './ContactInsightsCard'
import { EngagementCard } from './EngagementCard'
import { DealsSummaryCard } from './DealsSummaryCard'
import { QualificationCard } from './QualificationCard'
import { ContactInfoCard } from './ContactInfoCard'
import { CustomFieldsCard } from './CustomFieldsCard'
import { AttributionCard } from './AttributionCard'
import { TagsCard } from './TagsCard'
import { isFeatureVisible } from '@/config/featureFlags'
import type { Contact, Tag } from '@/types'

interface OverviewTabProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
  onAddTag: (tag: Tag) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
  onRefresh?: () => void
}

// Fase 1 (plano de UI do drawer, achado do usuário): o `StageCard` full-size
// saiu daqui — misturava "Estágio" (fase do contato, ciclo de vida) com os
// funis de negócio de verdade, mostrados logo acima por `DealsSummaryCard`.
// O componente continua existindo (outros lugares o usam — `ContactDetailPanel`,
// `ContactsStatsBar`, `ProfileMobileView`, `QualificationCard`, `DealSummary`),
// só não mais como card irmão do resumo de negócios nesta aba.
export function OverviewTab({ contact, onSave, onAddTag, onRemoveTag, onRefresh }: OverviewTabProps) {
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
      <TagsCard contact={contact} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />
      <QualificationCard contact={contact} onSave={onSave} />
      <ContactInfoCard contact={contact} onSave={onSave} />
      <CustomFieldsCard contact={contact} onSave={onSave} />
    </div>
  )
}
