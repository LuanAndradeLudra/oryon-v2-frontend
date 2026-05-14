import { AIContextCard } from './AIContextCard'
import { ContactInsightsCard } from './ContactInsightsCard'
import { EngagementCard } from './EngagementCard'
import { QualificationCard } from './QualificationCard'
import { ContactInfoCard } from './ContactInfoCard'
import { CustomFieldsCard } from './CustomFieldsCard'
import { AttributionCard } from './AttributionCard'
import { TagsCard } from './TagsCard'
import { StageCard } from './StageCard'
import { isFeatureVisible } from '@/config/featureFlags'
import type { Contact, Tag } from '@/types'

interface OverviewTabProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
  onAddTag: (tag: Tag) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
  onRefresh?: () => void
  /** Called after StageCard or MoveStageModal already hit the backend with
   *  the new stage. We DON'T re-PATCH via onSave — that would be a duplicate
   *  request — just refresh local state so the badge updates. */
  onStageChanged?: (next: string) => void
}

export function OverviewTab({ contact, onSave, onAddTag, onRemoveTag, onRefresh, onStageChanged }: OverviewTabProps) {
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
      <TagsCard contact={contact} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />
      <StageCard contact={contact} onStageChanged={onStageChanged} />
      <QualificationCard contact={contact} onSave={onSave} />
      <ContactInfoCard contact={contact} onSave={onSave} />
      <CustomFieldsCard contact={contact} onSave={onSave} />
    </div>
  )
}
