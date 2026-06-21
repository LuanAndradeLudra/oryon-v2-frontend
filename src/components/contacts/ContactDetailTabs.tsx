import { motion } from 'framer-motion'
import { useTenantVocab } from '@/contexts/TenantVocabContext'

type TabId = 'overview' | 'deals' | 'history' | 'conversations' | 'campaigns'

interface ContactDetailTabsProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

export function ContactDetailTabs({ activeTab, onChange }: ContactDetailTabsProps) {
  const { vocab } = useTenantVocab()
  // O rótulo de "Negócios" vem do vocabulário do tenant (vertical-agnostic).
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview',      label: 'Visão Geral' },
    { id: 'deals',         label: vocab.deals },
    { id: 'history',       label: 'Histórico' },
    { id: 'conversations', label: 'Conversas' },
    { id: 'campaigns',     label: 'Disparos' },
  ]

  return (
    <div className="flex border-b border-surface-800 px-5 flex-shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="relative pb-3 pt-3 mr-5 text-sm font-medium transition-colors"
          style={{ color: activeTab === tab.id ? 'var(--color-brand-400, #818cf8)' : 'var(--color-surface-400, #94a3b8)' }}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="contact-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full"
            />
          )}
        </button>
      ))}
    </div>
  )
}

export type { TabId }
