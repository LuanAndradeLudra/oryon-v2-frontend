// Conectores (Configurações → Integrações). Casca visual da reestilização
// (SCRUM-1110, README §3.10) sobre a API real do épico SCRUM-1071: o catálogo
// vem de GET /connectors, a credencial é instalada 1x por workspace e cada
// agente liga/desliga o conector na própria aba Skills.
// D12 (release 2026-09-29): a seção fica escondida pela flag
// `connectorsSelfService` até os itens de segurança da T6.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, LayoutGrid, List as ListIcon, MessageSquarePlus, ChevronDown, Check, Lock, Plug } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { ConnectorCard } from '@/components/connectors/ConnectorCard'
import { ConnectorTile } from '@/components/connectors/ConnectorTile'
import { ConnectorDetailModal } from '@/components/connectors/ConnectorDetailModal'
import { ConnectorInstallModal } from '@/components/connectors/ConnectorInstallModal'
import { ConnectorRequestModal } from '@/components/connectors/ConnectorRequestModal'
import { toConnectorView, type Connector } from '@/components/connectors/connectorView'
import { useEstadoNaUrl, lerUmDe } from '@/hooks/useEstadoNaUrl'
import { usePlanGate } from '@/hooks/usePlanGate'
import { PLANS } from '@/config/plans'
import { getConnectorDetail, listConnectors } from '@/services/connectorsApi'
import type { ConnectorDetail, ConnectorSummary } from '@/types/connectors'

type StatusFilter = 'all' | 'installed' | 'comingSoon'
type ViewMode = 'grid' | 'list'
const lerStatus = lerUmDe(['all', 'installed', 'comingSoon'] as const, 'all')
const lerVisao = lerUmDe(['grid', 'list'] as const, 'grid')

export function ConnectorsSettings() {
  const { allowed: planAllowed, upgrade } = usePlanGate('integrations')
  const [rows, setRows] = useState<ConnectorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Estado de tela na URL (regra 14): busca, categoria, status, visão e o conector aberto.
  const [search, setSearch] = useEstadoNaUrl<string>('busca', { padrao: '' })
  const [category, setCategory] = useEstadoNaUrl<string>('categoria', { padrao: '' })
  const [status, setStatus] = useEstadoNaUrl<StatusFilter>('status', { padrao: 'all', ler: lerStatus })
  const [view, setView] = useEstadoNaUrl<ViewMode>('visao', { padrao: 'grid', ler: lerVisao })
  const [openId, setOpenId] = useEstadoNaUrl<string>('conector', { padrao: '', historico: 'push' })

  const [categoryOpen, setCategoryOpen] = useState(false)
  const [detail, setDetail] = useState<ConnectorDetail | null>(null)
  const [installing, setInstalling] = useState<ConnectorSummary | null>(null)
  const [requesting, setRequesting] = useState<{ name?: string } | null>(null)

  const reload = useCallback(() => {
    if (!planAllowed) { setLoading(false); return }
    setLoading(true)
    setLoadError(null)
    listConnectors()
      .then(setRows)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [planAllowed])

  useEffect(reload, [reload])

  const views = useMemo(() => rows.map((r) => toConnectorView(r)), [rows])
  const openSummary = rows.find((r) => r.id === openId) ?? null

  // Detalhe (capacidades, descrição longa) só quando um conector é aberto.
  useEffect(() => {
    setDetail(null)
    if (!openId) return
    let vivo = true
    getConnectorDetail(openId).then((d) => { if (vivo) setDetail(d) }).catch(() => { /* fica o resumo */ })
    return () => { vivo = false }
  }, [openId])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of views) counts.set(c.category, (counts.get(c.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [views])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return views.filter((c) => {
      if (category && c.category !== category) return false
      if (status === 'installed' && c.status !== 'installed') return false
      if (status === 'comingSoon' && c.status !== 'comingSoon') return false
      if (q && !`${c.name} ${c.vendor} ${c.description}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [views, search, category, status])

  const installedCount = views.filter((c) => c.status === 'installed').length
  const comingSoonCount = views.filter((c) => c.status === 'comingSoon').length

  function handleConnect(connector: Connector) {
    const summary = rows.find((r) => r.id === connector.id)
    setOpenId('')
    if (!summary) return
    if (connector.status === 'comingSoon') { setRequesting({ name: connector.name }); return }
    setInstalling(summary)
  }

  return (
    <div>
      <SectionHeader
        title="Conectores"
        description="Conecte sistemas externos aos agentes de IA. Instale uma vez aqui; depois ative por agente na aba Skills de cada um."
        action={planAllowed ? (
          <Button size="sm" variant="neutral" className="h-8 px-3 text-[12.5px]" leftIcon={<MessageSquarePlus className="w-3.5 h-3.5" />} onClick={() => setRequesting({})}>
            Solicitar integração
          </Button>
        ) : undefined}
      />

      {!planAllowed ? (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-surface-700 bg-surface-800 text-sm">
          <Lock className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
          <p className="text-surface-400">
            Disponível a partir do plano <strong className="text-surface-200">{upgrade ? PLANS[upgrade].name : 'Business'}</strong>.
            Fale com seu gerente de conta para fazer upgrade.
          </p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }, (_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : loadError ? (
        <ErrorState hint={loadError} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="Nenhum conector disponível ainda"
          hint="Assim que a Oryon liberar uma integração para o seu plano, ela aparece aqui."
          action={{ label: 'Solicitar uma integração', onClick: () => setRequesting({}) }}
        />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pb-3 mb-3.5 border-b border-surface-700">
            <div className="relative w-[340px] max-w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, fornecedor ou o que faz…"
                aria-label="Buscar conector"
                className="w-full h-8 bg-surface-800 border border-[var(--bd2)] rounded-sm pl-8 pr-2 text-[12.5px] text-surface-200 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 transition-colors"
              />
            </div>

            <Dropdown
              open={categoryOpen}
              onClose={() => setCategoryOpen(false)}
              anchor={
                <button
                  type="button"
                  onClick={() => setCategoryOpen((o) => !o)}
                  className="h-8 inline-flex items-center gap-1.5 rounded-sm border border-[var(--bd2)] bg-surface-800 px-2.5 text-[12.5px] font-semibold text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
                >
                  Categoria<span className="font-medium text-surface-500"> · {category || 'Todas'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-surface-500" />
                </button>
              }
              className="min-w-[220px] p-1"
            >
              <DropdownItem onClick={() => { setCategory(''); setCategoryOpen(false) }} active={!category} icon={!category ? Check : undefined}>
                Todas
              </DropdownItem>
              {categories.map(([c, n]) => (
                <DropdownItem
                  key={c}
                  onClick={() => { setCategory(c); setCategoryOpen(false) }}
                  active={category === c}
                  icon={category === c ? Check : undefined}
                >
                  <span className="flex-1">{c}</span>
                  <span className="text-surface-500 ml-3">{n}</span>
                </DropdownItem>
              ))}
            </Dropdown>

            <SegmentedControl
              size="32"
              label="Filtro de status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Todos', count: views.length },
                { value: 'installed', label: 'Instalados', count: installedCount },
                { value: 'comingSoon', label: 'Em breve', count: comingSoonCount },
              ]}
            />

            <span className="text-xs text-surface-400 ml-auto">
              {views.length} no catálogo · {installedCount} instalado{installedCount === 1 ? '' : 's'}
            </span>

            <div className="inline-flex border border-surface-700 rounded-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-label="Ver em grade"
                aria-pressed={view === 'grid'}
                className={`w-8 h-8 flex items-center justify-center transition-colors ${view === 'grid' ? 'bg-[var(--sf2)] text-surface-100' : 'text-surface-400 hover:text-surface-100'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                aria-label="Ver em lista"
                aria-pressed={view === 'list'}
                className={`w-8 h-8 flex items-center justify-center border-l border-surface-700 transition-colors ${view === 'list' ? 'bg-[var(--sf2)] text-surface-100' : 'text-surface-400 hover:text-surface-100'}`}
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nenhum conector encontrado"
              hint={(() => {
                const active = [
                  search && `busca "${search}"`,
                  category && `categoria "${category}"`,
                  status !== 'all' && (status === 'installed' ? 'só instalados' : 'só em breve'),
                ].filter(Boolean)
                return active.length > 0 ? `Sem resultado com ${active.join(' + ')}.` : 'Ajuste a busca ou a categoria.'
              })()}
              action={{ label: 'Limpar filtros', onClick: () => { setSearch(''); setCategory(''); setStatus('all') } }}
            />
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {filtered.map((c) => (
                <ConnectorCard key={c.id} connector={c} onOpen={() => setOpenId(c.id)} />
              ))}
            </div>
          ) : (
            <div className="border border-surface-700 rounded-lg divide-y divide-surface-700 overflow-hidden">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setOpenId(c.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[var(--rowhover)] transition-colors"
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
        </>
      )}

      {openSummary && (
        <ConnectorDetailModal
          connector={toConnectorView(openSummary, detail)}
          onClose={() => setOpenId('')}
          onConnect={() => handleConnect(toConnectorView(openSummary, detail))}
        />
      )}

      {installing && (
        <ConnectorInstallModal
          connector={installing}
          onClose={() => setInstalling(null)}
          onSaved={() => { setInstalling(null); reload() }}
        />
      )}

      {requesting && <ConnectorRequestModal defaultName={requesting.name} onClose={() => setRequesting(null)} />}
    </div>
  )
}
