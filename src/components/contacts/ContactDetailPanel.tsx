import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { contactsApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { ContactDetailHeader } from './ContactDetailHeader'
import { ContactDetailTabs, type TabId } from './ContactDetailTabs'
import { OverviewTab } from './tabs/OverviewTab'
import { HistoryTab } from './tabs/HistoryTab'
import { ConversationsTab } from './tabs/ConversationsTab'
import { CampaignsTab } from './tabs/CampaignsTab'
import { DealsTab } from './tabs/DealsTab'
import type { Contact, Tag } from '@/types'

interface ContactDetailPanelProps {
  contactId: string
  onClose: () => void
  onContactUpdate?: (contact: Contact) => void
  onContactDeleted?: (contactId: string) => void
  /** Aba com que o painel deve abrir (ex: "deals" ao clicar num chip de negócio na tabela). */
  initialTab?: TabId
  /** Abre a página completa do contato — recebe o contato já carregado para
   *  a página nascer com dados (sem flash de skeleton na transição). */
  onExpand?: (contact: Contact) => void
}

export function ContactDetailPanel({ contactId, onClose, onContactUpdate, onContactDeleted, initialTab, onExpand }: ContactDetailPanelProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'overview')
  const { toast, toasts, dismiss } = useToast()

  // Reabre na aba pedida sempre que o contato ou a aba solicitada mudarem
  // (ex.: clicar num chip de negócio de OUTRO contato enquanto o painel já está aberto).
  useEffect(() => {
    setActiveTab(initialTab ?? 'overview')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, initialTab])

  useEffect(() => {
    setLoading(true)
    setContact(null)
    contactsApi.get(contactId)
      .then((r) => setContact(r.data))
      .catch(() => toast('Erro ao carregar contato.', 'error'))
      .finally(() => setLoading(false))
  }, [contactId])

  // Live updates for AI profile generation (triggered when a conversation is
  // resolved). Binds listeners directly to the shared socket instead of relying
  // on useSocket being mounted elsewhere — the CRM tab doesn't mount the
  // conversations page, so it would otherwise never receive these events.
  // Connect is idempotent; we only unbind our own listeners on cleanup so other
  // consumers of the shared socket keep working.
  useEffect(() => {
    const socket = connectSocket()
    const onGenerating = (p: { contactId: string }) => {
      if (p?.contactId !== contactId) return
      toast('Gerando resumo contextual com IA...', 'info')
    }
    const onGenerated = (p: { contactId: string }) => {
      if (p?.contactId !== contactId) return
      contactsApi.get(contactId)
        .then((r) => {
          setContact(r.data)
          onContactUpdate?.(r.data)
          toast('Resumo atualizado.', 'success')
        })
        .catch(() => toast('Resumo gerado, mas falhou ao recarregar os dados.', 'error'))
    }
    const onFailed = (p: { contactId: string; error?: string }) => {
      if (p?.contactId !== contactId) return
      toast('Não foi possível gerar o resumo por IA.', 'error')
    }
    socket.on('contact:ai-generating', onGenerating)
    socket.on('contact:ai-generated', onGenerated)
    socket.on('contact:ai-failed', onFailed)
    return () => {
      socket.off('contact:ai-generating', onGenerating)
      socket.off('contact:ai-generated', onGenerated)
      socket.off('contact:ai-failed', onFailed)
    }
  }, [contactId, onContactUpdate, toast])

  // Ao trocar de contato, o corpo do painel volta ao topo e à aba Overview —
  // sem isso, abrir o contato B herda o scroll/aba de onde A parou.
  const bodyRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
    setActiveTab('overview')
  }, [contactId])

  const handleDelete = async () => {
    try {
      await contactsApi.delete(contactId)
      toast('Contato excluído com sucesso.', 'success')
      onContactDeleted?.(contactId)
      onClose()
    } catch {
      toast('Erro ao excluir contato.', 'error')
    }
  }

  const handleSave = async (patch: Partial<Contact>) => {
    if (!contact) return
    // Optimistic local update
    const updated = { ...contact, ...patch }
    setContact(updated)
    try {
      const res = await contactsApi.update(contactId, patch)
      setContact(res.data)
      onContactUpdate?.(res.data)
      toast('Contato atualizado com sucesso.', 'success')
    } catch {
      setContact(contact) // revert
      toast('Erro ao salvar alterações.', 'error')
      throw new Error('save failed')
    }
  }

  const handleAddTag = async (tag: Tag) => {
    if (!contact) return
    if ((contact.tags ?? []).some((t) => t.id === tag.id)) return
    const prev = contact
    setContact({ ...contact, tags: [...(contact.tags ?? []), tag] })
    try {
      const res = await contactsApi.update(contactId, { addTagIds: [tag.id] })
      setContact(res.data)
      onContactUpdate?.(res.data)
    } catch {
      setContact(prev)
      toast('Erro ao adicionar etiqueta.', 'error')
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!contact) return
    const prev = contact
    setContact({ ...contact, tags: (contact.tags ?? []).filter((t) => t.id !== tagId) })
    try {
      const res = await contactsApi.update(contactId, { removeTagIds: [tagId] })
      setContact(res.data)
      onContactUpdate?.(res.data)
    } catch {
      setContact(prev)
      toast('Erro ao remover etiqueta.', 'error')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {loading || !contact ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : (
        <>
          <ContactDetailHeader
            contact={contact}
            onClose={onClose}
            onDelete={handleDelete}
            onExpand={onExpand ? () => onExpand(contact) : undefined}
          />
          <ContactDetailTabs activeTab={activeTab} onChange={setActiveTab} />
          <div ref={bodyRef} className="flex-1 overflow-y-auto">
            {activeTab === 'overview'      && <OverviewTab
              contact={contact}
              onSave={handleSave}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onRefresh={() => {
                contactsApi.get(contactId).then((r) => { setContact(r.data); onContactUpdate?.(r.data) }).catch(() => {})
              }}
              onStageChanged={(next) => {
                // StageCard / MoveStageModal already PATCH'd the backend.
                // Just sync local state so the badge, timeline, and any
                // header consumer re-render immediately.
                const updated = { ...contact, stage: next }
                setContact(updated)
                onContactUpdate?.(updated)
              }}
            />}
            {activeTab === 'deals'         && <DealsTab contactId={contactId} contactName={contact.displayName} />}
            {activeTab === 'history'       && <HistoryTab contactId={contactId} />}
            {activeTab === 'conversations' && <ConversationsTab contactId={contactId} />}
            {activeTab === 'campaigns'     && <CampaignsTab />}
          </div>
        </>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
