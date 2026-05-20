import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Send, FileText, X, Target } from 'lucide-react'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

import { useAuth } from '@/contexts/AuthContext'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { CampaignsTab } from '@/components/campaigns/CampaignsTab'
import { TemplatesTab } from '@/components/campaigns/TemplatesTab'
import { AttributionTab } from '@/components/campaigns/AttributionTab'

type Tab = 'campaigns' | 'templates' | 'attribution'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'campaigns',  label: 'Disparos',   icon: Send     },
  { id: 'templates',  label: 'Templates',  icon: FileText },
  { id: 'attribution', label: 'Atribuição', icon: Target  },
]

export function CampaignsPage() {
  const { user } = useAuth()
  const { isFeatureVisible } = useFeatureVisibility()
  const { checklist, markDone } = useSetupChecklist(user?.id)
  const [activeTab, setActiveTab] = useState<Tab>('campaigns')
  const campaignsEnabled = isFeatureVisible('campaigns')

  useRegisterTopBarActions(
    <div className="flex items-center bg-surface-800 border border-surface-700 rounded-lg p-0.5">
      {TABS.map((tab) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              activeTab === tab.id
                ? 'bg-surface-700 text-surface-100 shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        )
      })}
    </div>,
    [activeTab],
  )

  if (!campaignsEnabled) {
    return <Navigate to="/home" replace />
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Setup card */}
        <AnimatePresence>
          {!checklist.campaigns && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4 bg-brand-950/50 border border-brand-500/20 rounded-2xl px-5 py-4 mx-6 mt-4"
            >
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Send className="w-4 h-4 text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100">Configure sua primeira campanha</p>
                <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">
                  Crie templates de mensagem aprovados pelo WhatsApp e dispare campanhas em massa para seus contatos segmentados.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => { setActiveTab('templates'); markDone('campaigns') }}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                  >
                    Criar template →
                  </button>
                </div>
              </div>
              <button
                onClick={() => markDone('campaigns')}
                className="flex-shrink-0 text-surface-500 hover:text-surface-300 transition-colors mt-0.5"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'campaigns'   && <CampaignsTab />}
          {activeTab === 'templates'   && <TemplatesTab />}
          {activeTab === 'attribution' && <AttributionTab />}
        </div>
    </main>
  )
}
