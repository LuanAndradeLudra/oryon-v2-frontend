import { motion } from 'framer-motion'

type TabId = 'overview' | 'history' | 'conversations' | 'campaigns'

// Rótulos canônicos alinhados com a página de perfil (Atividade / Campanhas)
// para o mesmo conteúdo não ter nomes diferentes entre drawer e página.
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',      label: 'Visão Geral' },
  { id: 'history',       label: 'Atividade' },
  { id: 'conversations', label: 'Conversas' },
  { id: 'campaigns',     label: 'Campanhas' },
]

interface ContactDetailTabsProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

export function ContactDetailTabs({ activeTab, onChange }: ContactDetailTabsProps) {
  return (
    <div className="flex px-5 flex-shrink-0">
      {TABS.map((tab) => (
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
