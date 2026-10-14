// ─── /admin/billing — console de cobrança do operador ─────────────────────────
// SCRUM-1205: criar conta a partir da Proposta e acompanhar ativações.
// SCRUM-1211: catálogo de planos-modelo e carteira.
// Só super_admin (rota envolvida por RequireSuperAdmin; backend @Roles).
//
// Onda C (13/10, PO): título e subtítulo na barra do topo ("Cobrança · Console
// do operador", TopBar resolve /admin/billing pela rota completa) — o bloco de
// cabeçalho saiu para dar altura ao conteúdo. Aba na URL (?aba=), como pede a
// regra de estado de tela; "Nova conta" virou o ProvisionWizard em 4 passos.

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs } from '@/components/ui/Tabs'
import { ProvisionWizard } from '@/components/admin/billing/ProvisionWizard'
import { PendingActivations } from '@/components/admin/billing/PendingActivations'
import { AdminInvoices } from '@/components/admin/billing/AdminInvoices'
import { Portfolio } from '@/components/admin/billing/Portfolio'
import { CatalogManager } from '@/components/admin/billing/CatalogManager'

type BillingTab = 'provision' | 'pending' | 'invoices' | 'portfolio' | 'catalog'

const TABS: Array<{ id: BillingTab; label: string }> = [
  { id: 'provision', label: 'Nova conta' },
  { id: 'pending', label: 'Pendentes de ativação' },
  { id: 'invoices', label: 'Faturas' },
  { id: 'portfolio', label: 'Carteira' },
  { id: 'catalog', label: 'Catálogo' },
]

export function AdminBillingPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.id === params.get('aba'))?.id ?? 'provision'
  const [reloadKey, setReloadKey] = useState(0)
  const mudar = (id: BillingTab) => setParams((p) => {
    const q = new URLSearchParams(p)
    q.set('aba', id)
    if (id !== 'provision') q.delete('passo')
    return q
  })

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-surface-950">
      <Tabs label="Seções do console de cobrança" tabs={TABS} value={tab} onChange={mudar} className="px-6 pt-3" />
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
        {/* Coluna centralizada: formulário e tabelas têm largura própria e
            ficavam presos à esquerda em monitor grande. */}
        <div className="mx-auto w-full max-w-6xl">
          {tab === 'provision' && <ProvisionWizard onProvisioned={() => setReloadKey((k) => k + 1)} />}
          {tab === 'pending' && <PendingActivations reloadKey={reloadKey} />}
          {tab === 'invoices' && <AdminInvoices />}
          {tab === 'portfolio' && <Portfolio />}
          {tab === 'catalog' && <CatalogManager />}
        </div>
      </div>
    </div>
  )
}
