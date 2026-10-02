// ─── /admin/billing — console de cobrança do operador ─────────────────────────
// SCRUM-1205: criar conta a partir da Proposta e acompanhar ativações.
// SCRUM-1211: catálogo de planos-modelo e carteira.
// Só super_admin (rota envolvida por RequireSuperAdmin; backend @Roles).

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { ProvisionForm } from '@/components/admin/billing/ProvisionForm'
import { PendingActivations } from '@/components/admin/billing/PendingActivations'
import { Portfolio } from '@/components/admin/billing/Portfolio'
import { CatalogManager } from '@/components/admin/billing/CatalogManager'

type BillingTab = 'provision' | 'pending' | 'portfolio' | 'catalog'

const TABS: Array<{ id: BillingTab; label: string; hint: string }> = [
  { id: 'provision', label: 'Nova conta', hint: 'Cria a conta do cliente com as condições da Proposta assinada' },
  { id: 'pending', label: 'Pendentes de ativação', hint: 'Contas cujo administrador ainda não fez o primeiro acesso' },
  { id: 'portfolio', label: 'Carteira', hint: 'Contratos, renovações, inadimplência, troca de plano e conciliação' },
  { id: 'catalog', label: 'Catálogo', hint: 'Planos-modelo e pacotes — valem só para contas novas' },
]

export function AdminBillingPage() {
  const [tab, setTab] = useState<BillingTab>('provision')
  const [reloadKey, setReloadKey] = useState(0)

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <PageHeader title="Cobrança — console do operador" subtitle={TABS.find((t) => t.id === tab)?.hint} />
      <Tabs
        label="Seções do console de cobrança"
        tabs={TABS.map(({ id, label }) => ({ id, label }))}
        value={tab}
        onChange={setTab}
        className="px-6"
      />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {tab === 'provision' && <ProvisionForm onProvisioned={() => setReloadKey((k) => k + 1)} />}
        {tab === 'pending' && <PendingActivations reloadKey={reloadKey} />}
        {tab === 'portfolio' && <Portfolio />}
        {tab === 'catalog' && <CatalogManager />}
      </div>
    </div>
  )
}
