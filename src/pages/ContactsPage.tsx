import { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { LayoutList, LayoutGrid, Plus, Upload, Settings2, AlertTriangle } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { ContactsStatsBar } from '@/components/contacts/ContactsStatsBar'
import { ContactsFiltersBar } from '@/components/contacts/ContactsFiltersBar'
import { ContactsTable } from '@/components/contacts/ContactsTable'
import { ContactsKanban } from '@/components/contacts/ContactsKanban'
import { ContactsMobileList } from '@/components/contacts/ContactsMobileList'
import { ContactDetailPanel } from '@/components/contacts/ContactDetailPanel'
import { CRMConfigDrawer } from '@/components/contacts/CRMConfigDrawer'
import { NewContactDrawer } from '@/components/contacts/NewContactDrawer'
import { ImportContactsDrawer } from '@/components/contacts/ImportContactsDrawer'
import { BulkActionBar } from '@/components/contacts/BulkActionBar'
import { CampaignWizard } from '@/components/campaigns/CampaignWizard'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { ToastContainer } from '@/components/ui/Toast'
import { useContacts } from '@/hooks/useContacts'
import { useToast } from '@/hooks/useToast'
import { useTableSelection } from '@/hooks/useTableSelection'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { tagsApi } from '@/services/api'
import { cn } from '@/lib/utils'
import type { Contact, ContactFilters, ContactStage, Tag } from '@/types'

type ViewMode = 'table' | 'kanban'

export function ContactsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const isMobile = useIsMobile()
  // In mobile, the table view is unusable (horizontal overflow + tiny rows).
  // Force kanban regardless of user preference so they always get a usable
  // layout. Desktop preference is preserved across viewport changes.
  const effectiveViewMode: ViewMode = isMobile ? 'kanban' : viewMode
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Auto-open contact from URL param (e.g. /contacts?contact=c1)
  useEffect(() => {
    const contactParam = searchParams.get('contact')
    if (contactParam) {
      setSelectedContactId(contactParam)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const [showNewContact, setShowNewContact] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showCRMConfig, setShowCRMConfig] = useState(false)
  const { user } = useAuth()
  const currentUser = user
    ? { firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl }
    : undefined

  const {
    contacts, loading, total, filters, setFilters,
    updateContact, createContact,
    bulkUpdateStage, bulkRemove, bulkAddTag, bulkRemoveTag,
    removeContact, refetch,
  } = useContacts({
    sortBy: 'lastContactedAt',
    sortDir: 'desc',
  })

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
  const { toasts, toast, dismiss } = useToast()

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
    <div className="flex items-center gap-2">
      {/* Count badge */}
      <span className="text-xs text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full border border-surface-700 font-medium">
        {total.toLocaleString('pt-BR')}
      </span>
      {/* View toggle — desktop only; mobile is always kanban */}
      <div className="hidden md:flex items-center bg-surface-800 border border-surface-700 rounded-lg p-0.5">
        <button
          onClick={() => setViewMode('table')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            viewMode === 'table'
              ? 'bg-surface-700 text-surface-100 shadow-sm'
              : 'text-surface-400 hover:text-surface-200'
          )}
        >
          <LayoutList className="w-3.5 h-3.5" />
          Tabela
        </button>
        <button
          onClick={() => setViewMode('kanban')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            viewMode === 'kanban'
              ? 'bg-surface-700 text-surface-100 shadow-sm'
              : 'text-surface-400 hover:text-surface-200'
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Kanban
        </button>
      </div>
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
    [viewMode, total, vocab.contact],
  )

  const handleOpenPanel = (contact: Contact) => setSelectedContactId(contact.id)

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

  const handleBulkDragMoveStage = useCallback(async (ids: string[], stage: ContactStage) => {
    if (ids.length === 0) return
    try {
      const res = await bulkUpdateStage(ids, stage)
      toast(`${res.updated} contato(s) movido(s).`, 'success')
      clearSelection()
    } catch {
      toast('Falha ao mover contatos.', 'error')
    }
  }, [bulkUpdateStage, toast, clearSelection])

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

  return (
    <>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-black">
        {isMobile && <MobilePageHeader title="Contatos" />}

        <ContactsStatsBar contacts={contacts} total={total} />

        <ContactsFiltersBar filters={filters} onFiltersChange={handleFiltersChange} />

        <div className="flex-1 overflow-hidden">
          {isMobile ? (
            // Mobile: lista vertical pura — kanban horizontal e table viraram
            // inutilizaveis em viewport estreita. Tap no card abre detail.
            <ContactsMobileList
              contacts={contacts}
              loading={loading}
              onOpenPanel={handleOpenPanel}
            />
          ) : effectiveViewMode === 'table' ? (
            <ContactsTable
              contacts={contacts}
              loading={loading}
              onOpenPanel={handleOpenPanel}
              onMoveStage={handleMoveStage}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onBulkDelete={requestBulkDelete}
            />
          ) : (
            <ContactsKanban
              contacts={contacts}
              onOpenPanel={handleOpenPanel}
              onMoveStage={handleMoveStage}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onBulkMoveStage={handleBulkDragMoveStage}
              onBulkDelete={requestBulkDelete}
              onNewContact={() => setShowNewContact(true)}
              onImport={() => setShowImport(true)}
              onConfigCRM={() => setShowCRMConfig(true)}
            />
          )}
        </div>
      </div>

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
            onDelete={requestBulkDelete}
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
        onDone={() => { setShowImport(false) }}
      />

      {/* New Contact Drawer */}
      <NewContactDrawer
        open={showNewContact}
        onClose={() => setShowNewContact(false)}
        onCreate={createContact}
        onCreated={(contact) => setSelectedContactId(contact.id)}
      />

      {/* CRM Config Drawer */}
      <CRMConfigDrawer open={showCRMConfig} onClose={() => setShowCRMConfig(false)} />

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
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[700px] z-40 bg-surface-900 border-l border-surface-800 flex flex-col shadow-2xl"
            >
              <ContactDetailPanel
                contactId={selectedContactId}
                onClose={() => setSelectedContactId(null)}
                onContactUpdate={handleContactUpdate}
                onContactDeleted={(id) => { removeContact(id); setSelectedContactId(null) }}
              />
            </motion.div>
          </>
        )}
    </AnimatePresence>
    </>
  )
}
