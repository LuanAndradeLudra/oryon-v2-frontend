import { AIContextCard } from './AIContextCard'
import { ContactInsightsCard } from './ContactInsightsCard'
import { EngagementCard } from './EngagementCard'
import { QualificationCard } from './QualificationCard'
import { ContactInfoCard } from './ContactInfoCard'
import { CustomFieldsCard } from './CustomFieldsCard'
import { AttributionCard } from './AttributionCard'
import type { Contact } from '@/types'

interface OverviewTabProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
  onRefresh?: () => void
}

export function OverviewTab({ contact, onSave, onRefresh }: OverviewTabProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <AIContextCard contact={contact} onRefresh={onRefresh} />
      <AttributionCard contact={contact} />
      <ContactInsightsCard contact={contact} />
      <EngagementCard contactId={contact.id} />
      <QualificationCard contact={contact} onSave={onSave} />
      <ContactInfoCard contact={contact} onSave={onSave} />
      <CustomFieldsCard contact={contact} onSave={onSave} />
    </div>
  )
}
