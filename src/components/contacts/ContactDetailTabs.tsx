import { Tabs, type TabOption } from '@/components/ui/Tabs'
import { useTenantVocab } from '@/contexts/TenantVocabContext'

type TabId = 'overview' | 'deals' | 'history' | 'conversations' | 'campaigns'

interface ContactDetailTabsProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
  /** README 3.2: "Negócios 4" — omitido enquanto a contagem real ainda não
   *  carregou (nunca um número inventado). */
  dealsCount?: number
  conversationsCount?: number
  /** DRAWER-13 (spec/1c-contatos.GAPS.md): "Perfil completo" saiu do header
   *  e virou este link na faixa de abas — mesmo gate de feature flag do
   *  caller, que só passa a prop quando a página completa existe. */
  onExpand?: () => void
  /** Painel acoplado: recuo de 16px (o "Abrir ficha" vai pro cabeçalho). */
  compact?: boolean
}

export function ContactDetailTabs({ activeTab, onChange, dealsCount, conversationsCount, onExpand, compact = false }: ContactDetailTabsProps) {
  const { vocab } = useTenantVocab()
  // O rótulo de "Negócios" vem do vocabulário do tenant (vertical-agnostic).
  const tabs: TabOption<TabId>[] = [
    { id: 'overview',      label: 'Visão Geral' },
    { id: 'deals',         label: vocab.deals, count: dealsCount },
    { id: 'history',       label: 'Histórico' },
    { id: 'conversations', label: 'Conversas', count: conversationsCount },
    { id: 'campaigns',     label: 'Disparos' },
  ]

  return (
    <div className={compact ? 'flex items-center gap-3 px-4 pt-2.5' : 'flex items-center gap-3 px-[18px] pt-3.5'}>
      <Tabs
        tabs={tabs}
        value={activeTab}
        onChange={onChange}
        label="Seções do contato"
        // SCRUM-1253 (PO, 07/10): no painel estreito as abas não cabem — a borda
        // direita esmaece ("tem mais, role") em vez de cortar no meio da palavra.
        className={compact
          ? 'flex-1 min-w-0 !gap-[14px] [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)]'
          : 'flex-shrink-0'}
      />
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="ml-auto pb-[9px] text-xs font-semibold text-accent-dark hover:underline whitespace-nowrap"
        >
          Abrir ficha completa ↗
        </button>
      )}
    </div>
  )
}

export type { TabId }
