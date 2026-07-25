import { Navigate, useSearchParams } from 'react-router-dom'
import { Send, FileText, X, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

import { useAuth } from '@/contexts/AuthContext'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { TipCard } from '@/components/ui/TipCard'
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
  // Tab na URL (?tab=) — deep-linkável e sobrevive a reload; os tabs vivem
  // IN-PAGE (padrão underline do app), não no TopBar global, onde eram
  // invisíveis para quem escaneia a página.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: Tab = rawTab === 'templates' || rawTab === 'attribution' ? rawTab : 'campaigns'
  const setActiveTab = (tab: Tab) =>
    setSearchParams(tab === 'campaigns' ? {} : { tab }, { replace: true })
  const campaignsEnabled = isFeatureVisible('campaigns')

  if (!campaignsEnabled) {
    return <Navigate to="/home" replace />
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tabs in-page — mesmo padrão underline do detalhe de Agentes */}
        <div
          role="tablist"
          aria-label="Seções de campanhas"
          className="flex items-center gap-1 px-6 border-b border-surface-800/60 flex-shrink-0 overflow-x-auto"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                  activeTab === tab.id
                    ? 'text-surface-50 border-brand-500'
                    : 'text-surface-500 border-transparent hover:text-surface-300',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
        {/* Setup card */}
        <AnimatePresence>
          {!checklist.campaigns && (
            <TipCard
              icon={<Send className="w-4 h-4 text-brand-400" />}
              title="Configure sua primeira campanha"
              description="Crie templates de mensagem aprovados pelo WhatsApp e dispare campanhas em massa para seus contatos segmentados."
              onDismiss={() => markDone('campaigns')}
              className="mx-6 mt-4"
            >
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => { setActiveTab('templates'); markDone('campaigns') }}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  Criar template →
                </button>
              </div>
            </TipCard>
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
