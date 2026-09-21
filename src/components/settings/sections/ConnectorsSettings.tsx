// UI estática de exemplo (SCRUM-1110, Leva 12 do épico SCRUM-1097) — tela
// NOVA, zero UI legada (README seção 3.10). Catálogo, schemas de credencial
// e resultado de "Testar conexão" vêm de
// `@/components/connectors/connectorsMock`, sem serviço real por trás ainda.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutGrid, List as ListIcon, MessageSquarePlus, ChevronDown, Check } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConnectorCard } from '@/components/connectors/ConnectorCard'
import { ConnectorTile } from '@/components/connectors/ConnectorTile'
import { ConnectorDetailModal } from '@/components/connectors/ConnectorDetailModal'
import { ConnectorCredentialModal } from '@/components/connectors/ConnectorCredentialModal'
import { useToast } from '@/hooks/useToast'
import { CONNECTORS, CONNECTOR_CATEGORIES, type Connector, type ConnectorCategory } from '@/components/connectors/connectorsMock'

type StatusFilter = 'all' | 'installed' | 'comingSoon'
type ViewMode = 'grid' | 'list'

export function ConnectorsSettings() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ConnectorCategory | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [view, setView] = useState<ViewMode>('grid')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [openConnector, setOpenConnector] = useState<Connector | null>(null)
  const [credentialConnector, setCredentialConnector] = useState<Connector | null>(null)

  const categoryCounts = useMemo(() => {
    const counts = new Map<ConnectorCategory, number>()
    for (const c of CONNECTOR_CATEGORIES) counts.set(c, 0)
    for (const c of CONNECTORS) counts.set(c.category, (counts.get(c.category) ?? 0) + 1)
    return counts
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return CONNECTORS.filter((c) => {
      if (category && c.category !== category) return false
      if (status === 'installed' && c.status !== 'installed') return false
      if (status === 'comingSoon' && c.status !== 'comingSoon') return false
      if (q && !`${c.name} ${c.vendor} ${c.description}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [search, category, status])

  const installedCount = CONNECTORS.filter((c) => c.status === 'installed').length
  const comingSoonCount = CONNECTORS.filter((c) => c.status === 'comingSoon').length

  function handleConnect(connector: Connector) {
    if (connector.status === 'comingSoon') {
      toast(`Pedido registrado para ${connector.name} — avisamos quando estiver disponível.`, 'success')
      setOpenConnector(null)
      return
    }
    if (connector.status === 'business') {
      navigate('/settings/billing')
      return
    }
    setOpenConnector(null)
    setCredentialConnector(connector)
  }

  return (
    <div>
      <SectionHeader
        title="Conectores"
        description="Conecte sistemas externos aos agentes de IA. Instale uma vez aqui; depois ative por agente na aba Skills de cada um."
        action={
          <Button size="sm" variant="neutral" leftIcon={<MessageSquarePlus className="w-3.5 h-3.5" />}>
            Solicitar integração
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 pb-4 mb-4 border-b border-surface-700">
        <div className="relative w-[340px] max-w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome, fornecedor ou o que faz…"
            aria-label="Buscar conector"
            className="w-full h-8 bg-surface-800 border border-surface-700 rounded-sm pl-8 pr-2 text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>

        <Dropdown
          open={categoryOpen}
          onClose={() => setCategoryOpen(false)}
          anchor={
            <button
              type="button"
              onClick={() => setCategoryOpen((o) => !o)}
              className="h-8 inline-flex items-center gap-1.5 rounded-sm border border-surface-700 bg-surface-800 px-2.5 text-sm text-surface-300 hover:bg-surface-700 transition-colors"
            >
              {category ?? 'Categoria'}
              <ChevronDown className="w-3.5 h-3.5 text-surface-500" />
            </button>
          }
          className="min-w-[220px] p-1"
        >
          <DropdownItem onClick={() => { setCategory(null); setCategoryOpen(false) }} active={category === null} icon={category === null ? Check : undefined}>
            Todas
          </DropdownItem>
          {CONNECTOR_CATEGORIES.map((c) => (
            <DropdownItem
              key={c}
              onClick={() => { setCategory(c); setCategoryOpen(false) }}
              active={category === c}
              icon={category === c ? Check : undefined}
            >
              <span className="flex-1">{c}</span>
              <span className="text-surface-500 ml-3">{categoryCounts.get(c) ?? 0}</span>
            </DropdownItem>
          ))}
        </Dropdown>

        <SegmentedControl
          label="Filtro de status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todos', count: CONNECTORS.length },
            { value: 'installed', label: 'Instalados', count: installedCount },
            { value: 'comingSoon', label: 'Em breve', count: comingSoonCount },
          ]}
        />

        <span className="text-2xs text-surface-500 ml-auto">
          {CONNECTORS.length} no catálogo · {installedCount} instalado{installedCount === 1 ? '' : 's'}
        </span>

        <div className="flex items-center gap-1 border border-surface-700 rounded-sm p-0.5">
          <button
            type="button"
            onClick={() => setView('grid')}
            aria-label="Ver em grade"
            aria-pressed={view === 'grid'}
            className={`w-8 h-8 rounded-xs flex items-center justify-center transition-colors ${view === 'grid' ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            aria-label="Ver em lista"
            aria-pressed={view === 'list'}
            className={`w-8 h-8 rounded-xs flex items-center justify-center transition-colors ${view === 'list' ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300'}`}
          >
            <ListIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="Nenhum conector encontrado" hint="Ajuste a busca ou a categoria." />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filtered.map((c) => (
            <ConnectorCard key={c.id} connector={c} onOpen={() => setOpenConnector(c)} />
          ))}
        </div>
      ) : (
        <div className="border border-surface-700 rounded-lg divide-y divide-surface-700 overflow-hidden">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenConnector(c)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-900/40 transition-colors"
            >
              <ConnectorTile connector={c} size={32} radius={8} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-100 truncate">{c.name}</p>
                <p className="text-2xs text-surface-500 truncate">{c.category} · por {c.vendor}</p>
              </div>
              <p className="hidden md:block text-xs text-surface-500 flex-1 truncate">{c.description}</p>
            </button>
          ))}
        </div>
      )}

      {openConnector && (
        <ConnectorDetailModal
          connector={openConnector}
          onClose={() => setOpenConnector(null)}
          onConnect={() => handleConnect(openConnector)}
        />
      )}

      {credentialConnector && (
        <ConnectorCredentialModal
          connector={credentialConnector}
          onClose={() => setCredentialConnector(null)}
          onSaved={() => {
            toast(`${credentialConnector.name} conectado.`, 'success')
            setCredentialConnector(null)
          }}
        />
      )}
    </div>
  )
}
