import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { contactsApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useToast } from '@/hooks/useToast'
import { ContactDetailHeader } from './ContactDetailHeader'
import { ContactDetailTabs, type TabId } from './ContactDetailTabs'
import { ContactIdentityPanel } from './ContactIdentityPanel'
import { OverviewTab } from './tabs/OverviewTab'
import { HistoryTab } from './tabs/HistoryTab'
import { ConversationsTab } from './tabs/ConversationsTab'
import { CampaignsTab } from './tabs/CampaignsTab'
import { DealsTab } from './tabs/DealsTab'
import type { Contact, Tag } from '@/types'
import { RODAPE_DA_LISTA } from './rodapeDaLista'

interface ContactDetailPanelProps {
  contactId: string
  onClose: () => void
  onContactUpdate?: (contact: Contact) => void
  onContactDeleted?: (contactId: string) => void
  /** Aba com que o painel deve abrir (ex: "deals" ao clicar num chip de negócio na tabela). */
  initialTab?: TabId
  /** Modo controlado: a aba vem de fora (ex.: `?ficha=` na tela de Leads) e
   *  trocar de aba só avisa `onTabChange`. Quem controla decide o reset ao
   *  trocar de contato. Omitido = estado interno (comportamento de antes). */
  tab?: TabId
  onTabChange?: (tab: TabId) => void
  /** Abre a página completa do contato — recebe o contato já carregado para
   *  a página nascer com dados (sem flash de skeleton na transição). */
  onExpand?: (contact: Contact) => void
  /** Painel acoplado de ~400px ao lado da lista (Leads, direção A): cabeçalho
   *  compacto, identidade empilhada no topo e o corpo inteiro rolando junto.
   *  Sem isto, o layout original de 768px (identidade 260px | conteúdo). */
  docked?: boolean
  /** Rodapé fixo do painel acoplado (ex.: "3 de 5.191 · ↑↓ para navegar"). */
  footer?: ReactNode
  /** Contato que a lista já tem em mãos: o painel nasce com ele (sem spinner)
   *  e só atualiza em silêncio quando o GET volta — é o que deixa a troca
   *  ↑↓ entre contatos ser um crossfade e não um piscar de esqueleto. */
  initialContact?: Contact | null
  /** Enquanto true, monta só cabeçalho (barato) — o corpo (abas e cards) entra
   *  no render seguinte. Usado com useDeferredValue na página. */
  deferBody?: boolean
}

export function ContactDetailPanel({ contactId, onClose, onContactUpdate, onContactDeleted, initialTab, tab: tabControlada, onTabChange, onExpand, docked = false, footer, initialContact, deferBody = false }: ContactDetailPanelProps) {
  const seed = initialContact && initialContact.id === contactId ? initialContact : null
  const seedRef = useRef<Contact | null>(seed)
  seedRef.current = seed
  const [contact, setContact] = useState<Contact | null>(seed)
  const [loading, setLoading] = useState(!seed)
  const [abaInterna, setAbaInterna] = useState<TabId>(initialTab ?? 'overview')
  const controlado = tabControlada !== undefined
  const activeTab = controlado ? tabControlada : abaInterna
  const setActiveTab = (t: TabId) => (controlado ? onTabChange?.(t) : setAbaInterna(t))
  const { toast } = useToast()
  // Contagem real da aba "Negócios" (README 3.2: "Negócios 4") — reportada
  // pelo DealsSummaryCard (Visão Geral), que já é o único lugar que busca os
  // funis do contato aqui dentro. NÃO chama useContactPipelines de novo — uma
  // segunda instância duplicaria fetch + listener de socket (`deal:changed`)
  // + listener de evento local (`DEALS_INVALIDATE_EVENT`) só pra este número.
  const [dealsCount, setDealsCount] = useState<number | undefined>(undefined)

  // Reabre na aba pedida sempre que o contato ou a aba solicitada mudarem
  // (ex.: clicar num chip de negócio de OUTRO contato enquanto o painel já está aberto).
  useEffect(() => {
    if (controlado) return
    setAbaInterna(initialTab ?? 'overview')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, initialTab])

  useEffect(() => {
    const seeded = seedRef.current
    // Com semente da lista não há spinner: mostra o que já se sabe e troca
    // pelo dado completo quando chegar. Sem semente (URL direta), spinner.
    setLoading(!seeded)
    setContact(seeded)
    setDealsCount(undefined)
    let cancelled = false
    contactsApi.get(contactId)
      .then((r) => { if (!cancelled) setContact(r.data) })
      .catch(() => { if (!cancelled) toast('Erro ao carregar contato.', 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
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
    if (!controlado) setAbaInterna('overview')
  }, [contactId, controlado])

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

  const tabContent = contact && !deferBody && (
    <>
      {activeTab === 'overview'      && <OverviewTab
        contact={contact}
        onSave={handleSave}
        onRefresh={() => {
          contactsApi.get(contactId).then((r) => { setContact(r.data); onContactUpdate?.(r.data) }).catch(() => {})
        }}
        onDealsCountChange={setDealsCount}
      />}
      {activeTab === 'deals'         && <DealsTab contactId={contactId} contactName={contact.displayName} />}
      {activeTab === 'history'       && <HistoryTab contactId={contactId} />}
      {activeTab === 'conversations' && <ConversationsTab contactId={contactId} />}
      {activeTab === 'campaigns'     && <CampaignsTab />}
    </>
  )

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
            compact={docked}
            onExpand={docked && onExpand ? () => onExpand(contact) : undefined}
            backNav={!docked}
          />
          <ContactDetailTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            dealsCount={dealsCount}
            conversationsCount={contact.conversationCount}
            onExpand={!docked && onExpand ? () => onExpand(contact) : undefined}
            compact={docked}
          />
          {docked ? (
            <>
              <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto">
                <ContactIdentityPanel
                  stacked
                  contact={contact}
                  onSave={handleSave}
                  onAddTag={handleAddTag}
                  onRemoveTag={handleRemoveTag}
                />
                {tabContent}
              </div>
              {footer && (
                // Mesmo rodapé da lista ao lado (28/09): as duas faixas alinham no pé da tela.
                <div className={RODAPE_DA_LISTA}>
                  {footer}
                </div>
              )}
            </>
          ) : (
          /* Reauditoria de fidelidade (item 4): painel de identidade fixo à
              esquerda, persiste em QUALQUER aba (antes só existia dentro da
              Visão Geral e sumia ao trocar de aba). */
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            <ContactIdentityPanel
              contact={contact}
              onSave={handleSave}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
            />
            <div ref={bodyRef} className="flex-1 min-w-0 overflow-y-auto">
              {tabContent}
            </div>
          </div>
          )}
        </>
      )}
    </div>
  )
}
