import { useState, type RefObject } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ContactProfileHeader } from './ContactProfileHeader'
import { ContactPipelinesSection } from './ContactPipelinesSection'
import { ContactTimeline } from './ContactTimeline'
import { TimelineComposer } from './TimelineComposer'
import { NextActionPanel } from './NextActionPanel'
import { RelationshipHealthPanel } from './RelationshipHealthPanel'
import { PROFILE_MOCKS_ENABLED } from './mockData'
import { AIContextCard } from '@/components/contacts/tabs/AIContextCard'
import { ContactInfoCard } from '@/components/contacts/tabs/ContactInfoCard'
import { QualificationCard } from '@/components/contacts/tabs/QualificationCard'
import { StageCard } from '@/components/contacts/tabs/StageCard'
import { CustomFieldsCard } from '@/components/contacts/tabs/CustomFieldsCard'
import { TagsCard } from '@/components/contacts/tabs/TagsCard'
import { AttributionCard } from '@/components/contacts/tabs/AttributionCard'
import { EngagementCard } from '@/components/contacts/tabs/EngagementCard'
import { isFeatureVisible } from '@/config/featureFlags'
import { useAuth } from '@/contexts/AuthContext'
import type { Contact, Tag } from '@/types'
import type { ContactStats } from '@/hooks/useContactProfile'
import type { ContactNote, ContactTask } from '@/types/contactProfile'

type MobileSegment = 'summary' | 'activity' | 'about'

interface ProfileMobileViewProps {
  contact: Contact
  stats: ContactStats | null
  notes: ContactNote[]
  tasks: ContactTask[]
  composerRef: RefObject<HTMLTextAreaElement | null>
  onBack: () => void
  onOpenChat: () => void
  onSendTemplate: () => void
  onAddNote: (body: string) => void
  onFocusComposer: () => void
  onAddTask?: () => void
  onToggleTask: (id: string) => void
  onDelete: () => Promise<void> | void
  onSave: (patch: Partial<Contact>) => Promise<void>
  onAddTag: (tag: Tag) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
  onRefresh: () => void
  onStageChanged: (next: string) => void
}

/**
 * Variante mobile do perfil: header compacto + segmento único
 * Resumo | Atividade | Sobre (sem colunas). A BottomTabBar do shell
 * permanece com "Contatos" ativo (matchPrefix em /contacts/:id).
 */
export function ProfileMobileView({
  contact, stats, notes, tasks, composerRef,
  onBack, onOpenChat, onSendTemplate, onAddNote, onFocusComposer,
  onAddTask, onToggleTask, onDelete, onSave, onAddTag, onRemoveTag, onRefresh, onStageChanged,
}: ProfileMobileViewProps) {
  const [segment, setSegment] = useState<MobileSegment>('summary')
  const { user } = useAuth()
  const showAiContext = isFeatureVisible('aiContextCard', user?.email)

  return (
    <div className="flex flex-col gap-3 pb-8">
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur border-b border-surface-800">
        <ContactProfileHeader
          contact={contact}
          compact
          onBack={onBack}
          onOpenChat={onOpenChat}
          onSendTemplate={onSendTemplate}
          onAddNote={() => { setSegment('activity'); onFocusComposer() }}
          onAddTask={onAddTask}
          onDelete={onDelete}
        />
        <div className="px-3 pb-2.5">
          <SegmentedControl
            label="Seções do perfil"
            size="sm"
            className="w-full [&>button]:flex-1"
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'summary', label: 'Resumo' },
              { value: 'activity', label: 'Atividade' },
              { value: 'about', label: 'Sobre' },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-3">
        {segment === 'summary' && (
          <>
            {/* F11 (SCRUM-885): visão consolidada por funil também no mobile. */}
            <ContactPipelinesSection contactId={contact.id} contactName={contact.displayName} />
            <NextActionPanel
              tasks={tasks}
              aiSuggestion={contact.aiNextBestAction}
              onAddTask={onAddTask}
              onToggleTask={onToggleTask}
            />
            {showAiContext && <AIContextCard contact={contact} onRefresh={onRefresh} />}
            <RelationshipHealthPanel contact={contact} stats={stats} />
            {/* BestTimePanel removido — ver ContactProfilePage.tsx (achado do
                Lince, gap no PR #81): fabricava "Melhor horário" por hash do
                contactId sem fonte de dado real. */}
          </>
        )}

        {segment === 'activity' && (
          <section className="rounded-2xl border border-surface-800 bg-surface-900 p-3 flex flex-col gap-3">
            {PROFILE_MOCKS_ENABLED && <TimelineComposer onSubmit={onAddNote} textareaRef={composerRef} />}
            <ContactTimeline contactId={contact.id} notes={notes} />
          </section>
        )}

        {segment === 'about' && (
          <>
            <ContactInfoCard contact={contact} onSave={onSave} />
            <QualificationCard contact={contact} onSave={onSave} hideStage />
            <StageCard contact={contact} onStageChanged={onStageChanged} />
            <CustomFieldsCard contact={contact} onSave={onSave} />
            <TagsCard contact={contact} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />
            <AttributionCard contact={contact} />
            <EngagementCard contactId={contact.id} />
          </>
        )}
      </div>
    </div>
  )
}
