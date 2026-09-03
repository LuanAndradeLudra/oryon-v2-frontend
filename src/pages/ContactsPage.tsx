import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Upload, Settings2, AlertTriangle } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { isFeatureVisible } from '@/config/featureFlags'
import { ContactsStatsBar } from '@/components/contacts/ContactsStatsBar'
import { ContactsFiltersBar } from '@/components/contacts/ContactsFiltersBar'
import { ContactsTable } from '@/components/contacts/ContactsTable'
import { ContactsMobileList } from '@/components/contacts/ContactsMobileList'
import { ContactDetailPanel } from '@/components/contacts/ContactDetailPanel'
import type { TabId } from '@/components/contacts/ContactDetailTabs'
import { CRMConfigDrawer } from '@/components/contacts/CRMConfigDrawer'
import { NewContactDrawer } from '@/components/contacts/NewContactDrawer'
import { ImportContactsDrawer } from '@/components/contacts/ImportContactsDrawer'
import { BulkActionBar } from '@/components/contacts/BulkActionBar'
import { CampaignWizard } from '@/components/campaigns/CampaignWizard'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { ToastContainer } from '@/components/ui/Toast'
import { useContacts } from '@/hooks/useContacts'
import { useToast } from '@/hooks/useToast'
import { useTableSelection } from '@/hooks/useTableSelection'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { Fab } from '@/components/common/Fab'
import { tagsApi, pipelinesApi } from '@/services/api'
import { isAdminTier } from '@/lib/roleHelpers'
import { cn, getApiErrorMessage } from '@/lib/utils'
import type { Contact, ContactFilters, ContactStage, Tag, Pipeline } from '@/types'

/**
 * Faceta "Situação comercial" (D-10) — filtro opt-in derivado do
 * `dealsSummary` de cada contato, aplicado no BACKEND (SCRUM-293 —
 * `useContacts`/`?commercial=`) porque a lista é paginada no servidor.
 */
type CommercialSituation = 'all' | 'no_deal' | 'open_deal' | 'customer'

const COMMERCIAL_OPTIONS: { key: CommercialSituation; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'no_deal', label: 'Sem negócio' },
  { key: 'open_deal', label: 'Com negócio aberto' },
  { key: 'customer', label: 'Cliente' },
]

/**
 * D2 (SCRUM-935): o board de negócios saiu daqui — cada funil agora é sua
 * própria tela, `/pipelines/:id` (Board + Relatórios). Esta página voltou a
 * ser só a tabela/lista de Contatos; `?pipeline=<id>` (deep link antigo,
 * salvo em favoritos/atalhos) redireciona pra lá em vez de quebrar.
 */
export function ContactsPage() {
  const isMobile = useIsMobile()
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [initialPanelTab, setInitialPanelTab] = useState<TabId | undefined>(undefined)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Auto-open contact from URL param (e.g. /contacts?contact=c1)
  useEffect(() => {
    const contactParam = searchParams.get('contact')
    if (contactParam) {
      setSelectedContactId(contactParam)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // D2 (SCRUM-935): `/contacts?pipeline=<id>` (link salvo/atalho de antes do
  // board virar página própria) redireciona pra `/pipelines/<id>` — mantém o
  // deep link funcionando em vez de deixá-lo cair na lista de contatos sem
  // explicação. Outros params (ex. `?deal=<id>`, consumido globalmente pelo
  // DealPanelContext) seguem junto, exceto `pipeline` em si.
  const pipelineRedirectId = searchParams.get('pipeline')
  useEffect(() => {
    if (!pipelineRedirectId) return
    const rest = new URLSearchParams(searchParams)
    rest.delete('pipeline')
    const qs = rest.toString()
    navigate(`/pipelines/${pipelineRedirectId}${qs ? `?${qs}` : ''}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineRedirectId])

  const [showNewContact, setShowNewContact] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showCRMConfig, setShowCRMConfig] = useState(false)
  const [commercial, setCommercial] = useState<CommercialSituation>('all')

  // Funis do tenant — só para os pickers dos drawers (Novo contato/Importar,
  // "selecionar em qual funil esse contato vai"). Gate SCRUM-498: sem o
  // flag, nem o fetch acontece (o backend nem tem o módulo).
  const multiPipeline = useMultiPipeline()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const { toast } = useToast()

  const fetchPipelines = useCallback(() => {
    if (!multiPipeline) return Promise.resolve()
    return pipelinesApi
      .list()
      .then((res) => setPipelines(res.data ?? []))
      .catch(() => toast('Não foi possível carregar os pipelines.', 'error'))
  }, [toast, multiPipeline])

  useEffect(() => {
    if (!multiPipeline) return
    fetchPipelines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiPipeline])

  const { user } = useAuth()
  const currentUser = user
    ? { firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl }
    : undefined
  // Backend's POST /contacts/bulk/delete is @Roles(ADMIN, BUSINESS_ADMIN).
  // Mirror here so non-admins don't see the "Excluir" affordance in the
  // bulk action bar or the per-row context menu. SUPER_ADMIN passes
  // implicitly via the RolesGuard so the helper already covers it.
  const canBulkDelete = isAdminTier(user?.role)

  const {
    contacts, loading, loadingMore, hasMore, loadMore, error, total, filters, setFilters,
    updateContact, createContact, bulkUpdateStage, bulkRemove,
    bulkAddTag, bulkRemoveTag, removeContact, refetch,
  } = useContacts(
    { sortBy: 'lastContactedAt', sortDir: 'desc' },
    { commercial: multiPipeline && commercial !== 'all' ? commercial : undefined },
  )

  // Tags are fetched once when the page mounts so the BulkActionBar can
  // show the picker without a round-trip on first selection.
  const [tags, setTags] = useState<Tag[]>([])
  useEffect(() => {
    let alive = true
    tagsApi.list()
      .then((r) => { if (alive) setTags(r.data) })
      .catch(() => { if (alive) setTags([]) })
    return () => { alive = false }
  }, [])
  const { vocab } = useTenantVocab()
  const { toasts, dismiss } = useToast()

  // F9 (SCRUM-875): "Adicionar ao funil" pelo menu da linha da tabela —
  // fluxo compartilhado (criação / DealModal em venda / modal de conflito).
  const addToPipeline = useAddToPipeline({ onCreated: () => { void refetch() } })

  const handleOpenDealContact = (contactId: string) => {
    setSelectedContactId(contactId)
    setInitialPanelTab('deals')
  }

  // ── Bulk selection state ───────────────────────────────────────────────
  const {
    selectedIds,
    selectedItems: selectedContacts,
    toggle: toggleSelect,
    selectAll,
    clear: clearSelection,
  } = useTableSelection(contacts, useCallback((c: typeof contacts[number]) => c.id, []))
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Esc clears selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSelection])

  const handleFiltersChange = (f: ContactFilters) => setFilters(f)

  useRegisterTopBarActions(
    <div className="flex items-center gap-2 flex-wrap">
      {/* Count badge — total de contatos, já refletindo a faceta "Situação
          comercial" ativa (SCRUM-293: `total` vem do backend já filtrado). */}
      <span className="text-xs text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full border border-surface-700 font-medium">
        {total.toLocaleString('pt-BR')}
      </span>

      <button
        onClick={() => setShowCRMConfig(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Configurar
      </button>
      <button
        onClick={() => setShowImport(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        Importar
      </button>
      <button
        onClick={() => setShowNewContact(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-colors shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" />
        Novo {vocab.contact}
      </button>
    </div>,
    [total, vocab.contact],
  )

  const handleOpenPanel = (contact: Contact) => {
    setInitialPanelTab(undefined)
    setSelectedContactId(contact.id)
  }

  const handleMoveStage = async (contact: Contact, stage: ContactStage) => {
    await updateContact(contact.id, { stage })
  }

  const handleBulkMoveStage = useCallback(async (stage: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const res = await bulkUpdateStage(ids, stage)
      toast(`${res.updated} contato(s) movido(s).`, 'success')
      clearSelection()
    } catch {
      toast('Falha ao mover contatos.', 'error')
    }
  }, [selectedIds, bulkUpdateStage, toast, clearSelection])

  const handleBulkAddTag = useCallback(async (tag: Tag) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const res = await bulkAddTag(ids, tag)
      toast(`Tag "${tag.name}" adicionada a ${res.added} contato(s).`, 'success')
    } catch {
      toast('Falha ao adicionar tag.', 'error')
    }
  }, [selectedIds, bulkAddTag, toast])

  const handleBulkRemoveTag = useCallback(async (tagId: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const res = await bulkRemoveTag(ids, tagId)
      toast(`Tag removida de ${res.removed} contato(s).`, 'success')
    } catch {
      toast('Falha ao remover tag.', 'error')
    }
  }, [selectedIds, bulkRemoveTag, toast])

  // Campaign seed flow: capture the id snapshot *at click time* so the
  // wizard remains bound to that list even if the selection changes in the
  // background (or gets cleared when the wizard closes).
  const [campaignSeedIds, setCampaignSeedIds] = useState<string[] | null>(null)

  const handleCreateCampaignFromSelection = useCallback(() => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setCampaignSeedIds(ids)
  }, [selectedIds])

  // Delete flow: "request" opens the confirmation modal, "confirm" executes.
  // Both the bulk bar button and the context menu entry fan into requestBulkDelete.
  const requestBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return
    setConfirmBulkDelete(true)
  }, [selectedIds])

  const confirmBulkDeleteAction = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) { setConfirmBulkDelete(false); return }
    setBulkDeleting(true)
    try {
      const res = await bulkRemove(ids)
      toast(`${res.deleted} contato(s) excluído(s).`, 'success')
      clearSelection()
      setConfirmBulkDelete(false)
    } catch {
      toast('Falha ao excluir contatos.', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, bulkRemove, toast, clearSelection])

  const handleContactUpdate = (updated: Contact) => {
    updateContact(updated.id, updated)
  }

  // Ainda redirecionando `?pipeline=` — não pisca a tabela de contatos por
  // baixo enquanto a navegação acontece.
  if (pipelineRedirectId) return null

  return (
    <>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-surface-950">
        {isMobile && <MobilePageHeader title="Contatos" />}

        <ContactsStatsBar
          contacts={contacts}
          total={total}
        />

        {/* Busca + filtros: 2 mais usados inline (Fonte, Etiquetas) e o resto
            dentro do botão "Filtros". */}
        <ContactsFiltersBar filters={filters} onFiltersChange={handleFiltersChange} />

        {/* Faceta "Situação comercial" (D-10) */}
        {multiPipeline && (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-b border-surface-800/60">
          {COMMERCIAL_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setCommercial(opt.key)}
              className={cn(
                'text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors border',
                commercial === opt.key
                  ? 'commercial-filter-chip-active bg-brand-500/15 text-brand-300 border-brand-500/40'
                  : 'bg-surface-900 text-surface-400 border-surface-800 hover:text-surface-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        )}

        <div className="flex-1 overflow-hidden min-w-0 flex flex-col mx-4 mb-4 mt-1 bg-surface-900 border border-surface-800 rounded-xl">
          <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm">{error}</p>
              <button
                onClick={refetch}
                className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
              >
                Tentar novamente
              </button>
            </div>
          ) : isMobile ? (
            // Mobile: lista vertical pura — tabela larga fica inutilizável em viewport estreita.
            <ContactsMobileList
              contacts={contacts}
              loading={loading}
              onOpenPanel={handleOpenPanel}
              onOpenDeals={handleOpenDealContact ? (c) => handleOpenDealContact(c.id) : undefined}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          ) : (
            <ContactsTable
              contacts={contacts}
              loading={loading}
              onOpenPanel={handleOpenPanel}
              onMoveStage={handleMoveStage}
              onOpenDeals={handleOpenDealContact ? (c) => handleOpenDealContact(c.id) : undefined}
              onAddToPipeline={(c, p) => addToPipeline.requestAdd({ contactId: c.id, contactName: c.displayName || c.waId, pipeline: p })}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onBulkDelete={canBulkDelete ? requestBulkDelete : undefined}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
          </div>
        </div>
      </div>

      {/* Mobile FAB: novo contato — desktop usa o "+ Novo" do header */}
      <Fab
        icon={<Plus className="w-6 h-6" />}
        label="Novo contato"
        onClick={() => setShowNewContact(true)}
      />

      {/* Bulk selection floating bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionBar
            key="bulk-bar"
            count={selectedIds.size}
            selectedContacts={selectedContacts}
            tags={tags}
            onMoveStage={handleBulkMoveStage}
            onAddTag={handleBulkAddTag}
            onRemoveTag={handleBulkRemoveTag}
            onCreateCampaign={handleCreateCampaignFromSelection}
            onDelete={canBulkDelete ? requestBulkDelete : undefined}
            onClear={clearSelection}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Bulk delete confirmation — shared between bar and context menu.
          Uses the raw Modal so we can preview the contacts being deleted. */}
      <Modal
        open={confirmBulkDelete}
        onClose={() => { if (!bulkDeleting) setConfirmBulkDelete(false) }}
        title={`Excluir ${selectedIds.size} contato${selectedIds.size === 1 ? '' : 's'}`}
        className="max-w-md"
      >
        <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30">
          <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-surface-300 leading-relaxed">
            {selectedIds.size === 1
              ? 'Esta ação não pode ser desfeita pela interface.'
              : 'Esta ação não pode ser desfeita pela interface. Revise os contatos abaixo antes de confirmar.'}
          </p>
        </div>

        {selectedContacts.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-2">
              Contatos ({selectedContacts.length})
            </p>
            <div className="max-h-64 overflow-y-auto pr-1 space-y-1 rounded-lg border border-surface-800 bg-surface-950/50 p-1.5">
              {selectedContacts.slice(0, 50).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-800/60 transition-colors"
                >
                  <Avatar name={c.displayName} imageUrl={c.profilePicUrl} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-surface-100 truncate">{c.displayName}</p>
                    {c.waId && (
                      <p className="text-[10px] text-surface-500 font-mono truncate">{c.waId}</p>
                    )}
                  </div>
                  {c.stage && (
                    <span className="text-[10px] text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {c.stage}
                    </span>
                  )}
                </div>
              ))}
              {selectedContacts.length > 50 && (
                <p className="text-[11px] text-surface-500 text-center py-1">
                  +{selectedContacts.length - 50} outros contatos
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => { if (!bulkDeleting) setConfirmBulkDelete(false) }}
            disabled={bulkDeleting}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-all disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={confirmBulkDeleteAction}
            disabled={bulkDeleting || selectedIds.size === 0}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all bg-danger text-white hover:bg-red-600',
              (bulkDeleting || selectedIds.size === 0) && 'opacity-60 cursor-not-allowed',
            )}
          >
            {bulkDeleting ? 'Excluindo...' : `Excluir ${selectedIds.size} contato${selectedIds.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </Modal>

      {/* Import Contacts Drawer */}
      <ImportContactsDrawer
        open={showImport}
        onClose={() => setShowImport(false)}
        onCreate={createContact}
        onDone={() => { setShowImport(false); refetch() }}
        pipelines={pipelines}
      />

      {/* New Contact Drawer */}
      <NewContactDrawer
        open={showNewContact}
        onClose={() => setShowNewContact(false)}
        onCreate={createContact}
        onCreated={(contact) => {
          setSelectedContactId(contact.id)
          refetch()
        }}
        pipelines={pipelines}
      />

      {/* CRM Config Drawer */}
      <CRMConfigDrawer
        open={showCRMConfig}
        onClose={() => setShowCRMConfig(false)}
      />

      {/* F9 (SCRUM-875): diálogos do "Adicionar ao funil" (conflito / motivo / negócio) */}
      {addToPipeline.dialogs}

      {/* Campaign wizard seeded from a bulk selection. The seed is captured
          at click time; closing the wizard resets it. On success we refetch
          so any contact-state side-effects (e.g. future audience counters)
          stay accurate, and the bulk selection is cleared. */}
      <CampaignWizard
        open={campaignSeedIds !== null}
        initialContactIds={campaignSeedIds ?? undefined}
        initialName={
          campaignSeedIds && campaignSeedIds.length > 0
            ? `Campanha para ${campaignSeedIds.length} contato${campaignSeedIds.length === 1 ? '' : 's'}`
            : undefined
        }
        onClose={() => setCampaignSeedIds(null)}
        onCreated={() => {
          setCampaignSeedIds(null)
          clearSelection()
          toast('Campanha criada com os contatos selecionados.', 'success')
          refetch()
        }}
      />

      {/* Detail Panel — Fixed right drawer */}
      <AnimatePresence>
        {selectedContactId && (
          <>
            <motion.div
              key="contact-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 z-[39]"
              onClick={() => setSelectedContactId(null)}
            />
            <motion.div
              key="contact-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[48rem] z-40 bg-surface-950 border-l overlay-frame flex flex-col"
            >
              <ContactDetailPanel
                contactId={selectedContactId}
                initialTab={initialPanelTab}
                onClose={() => setSelectedContactId(null)}
                onContactUpdate={handleContactUpdate}
                onContactDeleted={(id) => { removeContact(id); setSelectedContactId(null) }}
                onExpand={
                  isFeatureVisible('contactProfilePage', user?.email)
                    // O drawer fica aberto durante a navegação: a troca de rota
                    // faz o crossfade da tela inteira (AnimatedRoutes dá chave
                    // própria a /contacts/:id) — fechar antes causaria um
                    // slide-out concorrente com o fade. O contato vai no state
                    // para a página nascer sem skeleton.
                    ? (contact) => navigate(`/contacts/${contact.id}`, { state: { contact } })
                    : undefined
                }
              />
            </motion.div>
          </>
        )}
    </AnimatePresence>
    </>
  )
}
