import { Navigate, useSearchParams } from 'react-router-dom'
import { Send, FileText, Target, CalendarDays, KanbanSquare, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatePresence } from 'framer-motion'

import { useAuth } from '@/contexts/AuthContext'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { TipCard } from '@/components/ui/TipCard'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TemplatesTab } from '@/components/campaigns/TemplatesTab'
import { AttributionTab } from '@/components/campaigns/AttributionTab'
import { ListView } from '@/components/campaigns/views/ListView'
import { AgendaView } from '@/components/campaigns/views/AgendaView'
import { BoardView } from '@/components/campaigns/views/BoardView'

type Tab = 'campaigns' | 'templates' | 'attribution'
type ViewMode = 'list' | 'agenda' | 'board'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'campaigns',  label: 'Disparos',   icon: Send     },
  { id: 'templates',  label: 'Templates',  icon: FileText },
  { id: 'attribution', label: 'Atribuição', icon: Target  },
]

// Seletor de vista da aba Disparos. Até a D1 (SCRUM-1018) o `?view=` existia
// na rota mas não tinha porta de entrada nenhuma na interface — Agenda e Board
// eram inalcançáveis sem digitar a query na barra de endereço.
//
// EXCEÇÃO AUTORIZADA AO CONGELAMENTO deste arquivo (ONDA-1-MAPA §2), decidida
// pelo Maestro em coord/D1-decisoes.md, decisão 9: um seletor só, no arquivo
// que hospeda as três vistas, escrito por quem consegue verificar a troca de
// verdade. As alternativas eram três cópias em dois donos (dívida na certa) ou
// um PR de integração do Andaime, cujo papel proíbe código de produto.
const VIEW_OPTIONS: { value: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'agenda', label: 'Agenda', icon: CalendarDays  },
  { value: 'board',  label: 'Board',  icon: KanbanSquare  },
  { value: 'list',   label: 'Lista',  icon: List          },
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
  // ?view= só se aplica dentro da aba Disparos (W0.1/SCRUM-994: rota
  // alcançável — sem seletor visível ainda; o toggle Deck/Lista/Agenda/Board
  // chega com D1/D1b).
  const rawView = searchParams.get('view')
  const activeView: ViewMode = rawView === 'agenda' || rawView === 'board' ? rawView : 'list'
  // A vista acompanha a aba na URL: trocar de vista não pode apagar o `?tab=`
  // de quem chegou por link direto.
  const setActiveView = (view: ViewMode) => {
    const next: Record<string, string> = {}
    if (activeTab !== 'campaigns') next.tab = activeTab
    if (view !== 'list') next.view = view
    setSearchParams(next, { replace: true })
  }
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

        {/* Seletor de vista — só na aba Disparos, que é a única com `?view=` */}
        {activeTab === 'campaigns' && (
          <div className="px-6 pt-4 flex-shrink-0">
            <SegmentedControl
              label="Vista dos disparos"
              options={VIEW_OPTIONS}
              value={activeView}
              onChange={setActiveView}
            />
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'campaigns' && activeView === 'list'   && <ListView />}
          {activeTab === 'campaigns' && activeView === 'agenda' && <AgendaView />}
          {activeTab === 'campaigns' && activeView === 'board'  && <BoardView />}
          {activeTab === 'templates'   && <TemplatesTab />}
          {activeTab === 'attribution' && <AttributionTab />}
        </div>
    </main>
  )
}
