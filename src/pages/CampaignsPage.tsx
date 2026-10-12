import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

import { useAuth } from '@/contexts/AuthContext'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { TipCard } from '@/components/ui/TipCard'
import { Tabs, type TabOption } from '@/components/ui/Tabs'
import { CampaignsTab } from '@/components/campaigns/CampaignsTab'
import { TemplatesTab } from '@/components/campaigns/TemplatesTab'
import { AttributionTab } from '@/components/campaigns/AttributionTab'
import { NavegarSePresente } from '@/components/navegacao/NavegarSePresente'
import { templatesApi } from '@/services/api'

type Tab = 'campaigns' | 'templates' | 'attribution'

export function CampaignsPage() {
  const { user } = useAuth()
  const { isFeatureVisible } = useFeatureVisibility()
  const { checklist, markDone } = useSetupChecklist(user?.id)
  // SCRUM-1106 (tela 2c) — "Disparos (14) · Templates (9)": contagem real
  // reportada pelas próprias abas (evita duplicar o fetch aqui). Atribuição
  // não tem lista própria no mock — sem contador.
  const [campaignsCount, setCampaignsCount] = useState<number | null>(null)
  const [templatesCount, setTemplatesCount] = useState<number | null>(null)
  // O card "Configure sua primeira campanha" depende das duas contagens, mas
  // só a aba aberta é montada: a de Templates nunca reportava na aba Disparos
  // e o card aparecia para quem já tinha template. Busca a contagem aqui
  // (uma vez) — a aba Templates, quando aberta, continua atualizando.
  useEffect(() => {
    let vivo = true
    templatesApi.list()
      .then((r) => { if (vivo) setTemplatesCount((atual) => atual ?? r.data.filter((t) => t.status !== 'DELETED').length) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])
  // Tab na URL (?tab=) — deep-linkável e sobrevive a reload; os tabs vivem
  // IN-PAGE (padrão underline do app), não no TopBar global, onde eram
  // invisíveis para quem escaneia a página.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: Tab = rawTab === 'templates' || rawTab === 'attribution' ? rawTab : 'campaigns'
  // Trocar de aba limpa o que é da aba anterior (filtros, relatório aberto),
  // mas mantém o caminho de volta — antes `{}`/`{ tab }` apagava tudo.
  const setActiveTab = (tab: Tab) =>
    setSearchParams((prev) => {
      const p = new URLSearchParams()
      for (const k of ['voltarPara', 'voltarRotulo']) { const v = prev.get(k); if (v) p.set(k, v) }
      if (tab !== 'campaigns') p.set('tab', tab)
      return p
    }, { replace: true })
  const campaignsEnabled = isFeatureVisible('campaigns')

  if (!campaignsEnabled) {
    return <NavegarSePresente to="/home" replace />
  }

  // CAMP-TABS-01..06 (spec 2c): tablist artesanal (teal, 12px, ícones,
  // contagem entre parênteses) trocado pelo primitivo Tabs — já implementa
  // sublinhado inset 2px currentColor, 13px/500 --tx2/--tx, contador 11px
  // --tx3 sem parênteses, sem ícone.
  const tabOptions: TabOption<Tab>[] = [
    { id: 'campaigns', label: 'Disparos', count: campaignsCount ?? undefined },
    { id: 'templates', label: 'Templates', count: templatesCount ?? undefined },
    { id: 'attribution', label: 'Atribuição' },
  ]

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Tabs
          tabs={tabOptions}
          value={activeTab}
          onChange={setActiveTab}
          label="Seções de campanhas"
          className="px-4 pt-3"
        />
        {/* Setup card */}
        <AnimatePresence>
          {/* SCRUM-1253 (PO, 07/10): o card de primeira campanha some quando já há campanha ou template.
              Só decide com as DUAS contagens carregadas (null = carregando) — antes
              piscava no primeiro render e aparecia para quem tinha templates. */}
          {!checklist.campaigns && campaignsCount === 0 && templatesCount === 0 && (
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
                  className="text-xs text-accent-dark hover:opacity-80 font-medium transition-colors"
                >
                  Criar template →
                </button>
              </div>
            </TipCard>
          )}
        </AnimatePresence>

        {/* Tab content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'campaigns'   && <CampaignsTab onCountChange={setCampaignsCount} />}
          {activeTab === 'templates'   && <TemplatesTab onCountChange={setTemplatesCount} />}
          {activeTab === 'attribution' && <AttributionTab />}
        </div>
    </main>
  )
}
