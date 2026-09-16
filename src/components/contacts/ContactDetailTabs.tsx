import { Tabs, type TabOption } from '@/components/ui/Tabs'
import { useTenantVocab } from '@/contexts/TenantVocabContext'

type TabId = 'overview' | 'deals' | 'history' | 'conversations' | 'campaigns'

interface ContactDetailTabsProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

export function ContactDetailTabs({ activeTab, onChange }: ContactDetailTabsProps) {
  const { vocab } = useTenantVocab()
  // O rótulo de "Negócios" vem do vocabulário do tenant (vertical-agnostic).
  const tabs: TabOption<TabId>[] = [
    { id: 'overview',      label: 'Visão Geral' },
    { id: 'deals',         label: vocab.deals },
    { id: 'history',       label: 'Histórico' },
    { id: 'conversations', label: 'Conversas' },
    { id: 'campaigns',     label: 'Disparos' },
  ]

  return (
    <Tabs
      tabs={tabs}
      value={activeTab}
      onChange={onChange}
      label="Seções do contato"
      className="px-5 flex-shrink-0"
    />
  )
}

export type { TabId }
