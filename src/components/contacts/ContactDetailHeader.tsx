import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MoreHorizontal, Trash2, MessageSquare, ExternalLink, ArrowLeft } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { StageBadge } from './StageBadge'
import { SendTemplateDrawer } from './SendTemplateDrawer'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { isAdminTier } from '@/lib/roleHelpers'
import { defaultSalesPipeline } from '@/lib/pipelineKinds'
import { contactsApi } from '@/services/api'
import { formatPhoneBR } from '@/lib/utils'
import type { Contact } from '@/types'

interface ContactDetailHeaderProps {
  contact: Contact
  onClose: () => void
  onDelete?: () => void
  /** Painel acoplado de 400px (Leads, direção A): cabeçalho compacto em duas
   *  linhas — identidade (avatar 40, nome 15/700, telefone · e-mail, chips) e
   *  a barra de ações. */
  compact?: boolean
  /** "Abrir ficha" — só no modo compacto (no completo é o link das abas). */
  onExpand?: () => void
  /** Sobreposição de tela inteira (abaixo de lg): seta "Voltar" no lugar do X —
   *  regra do PO de voltar. No painel acoplado o X continua. */
  backNav?: boolean
}

export function ContactDetailHeader({ contact, onClose, onDelete, compact = false, onExpand, backNav = false }: ContactDetailHeaderProps) {
  const { stages, pipelines } = useCRMConfig()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lastConvId, setLastConvId] = useState<string | null>(null)
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false)
  const canDelete = isAdminTier(user?.role)
  const addToPipeline = useAddToPipeline()
  const salesPipeline = defaultSalesPipeline(pipelines)

  useEffect(() => {
    contactsApi.getConversations(contact.id).then((r) => {
      const conv = r.data?.data?.[0]
      if (conv) setLastConvId(conv.id)
    }).catch(() => {})
  }, [contact.id])

  const handleOpenChat = () => {
    if (lastConvId) {
      navigate(`/conversations?id=${lastConvId}`)
    } else {
      setTemplateDrawerOpen(true)
    }
  }

  const deleteMenu = (
    canDelete && onDelete ? (
    <>
      <Dropdown
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        align="right"
        className="w-44"
        anchor={
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Mais ações"
            className="w-7 h-7 rounded-sm border border-[var(--bd2)] flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-all"
          >
            <MoreHorizontal className="w-[15px] h-[15px]" />
          </button>
        }
      >
        <div className="px-1 py-1 flex flex-col gap-0.5">
          <DropdownItem onClick={() => { setMenuOpen(false); setConfirmDelete(true) }} danger>
            <Trash2 className="w-3.5 h-3.5" /> Excluir contato
          </DropdownItem>
        </div>
      </Dropdown>
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { onDelete(); setConfirmDelete(false) }}
        title="Excluir contato"
        impact={{ label: `O contato "${contact.displayName || contact.waId}" e todo o seu histórico serão excluídos permanentemente`, tone: 'danger' }}
        description="Esta ação é irreversível."
        confirmLabel="Excluir contato"
        danger
      />
    </>
  ) : null
  )

  const overlays = (
    <>
      <SendTemplateDrawer
        contact={contact}
        open={templateDrawerOpen}
        onClose={() => setTemplateDrawerOpen(false)}
      />
      {addToPipeline.dialogs}
    </>
  )

  if (compact) {
    const sub = [formatPhoneBR(contact.waId), contact.email].filter(Boolean).join(' · ')
    return (
      <div className="flex-shrink-0">
        <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
          <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] leading-5 text-surface-50 truncate">{contact.displayName}</h2>
            {sub && <p className="text-xs text-surface-400 mt-0.5 truncate">{sub}</p>}
            {/* Só a situação aqui. As etiquetas moram numa única seção do painel
                (TagsCard, editável) — o PO viu o mesmo chip repetido em três
                lugares do painel acoplado (23/09). */}
            {contact.stage && (
              <div className="flex flex-wrap items-center gap-1 mt-2">
                <StageBadge stage={contact.stage} stages={stages} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                title="Abrir ficha"
                aria-label="Abrir ficha"
                className="p-1.5 rounded-sm text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            {deleteMenu}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="p-1.5 rounded-sm text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 px-4 pb-3">
          <Button size="sm" variant="primary" className="flex-1" leftIcon={<MessageSquare className="w-3.5 h-3.5" />} onClick={handleOpenChat}>
            Abrir conversa
          </Button>
          <Button size="sm" variant="neutral" className="flex-1" onClick={() => setTemplateDrawerOpen(true)}>
            Template
          </Button>
          {salesPipeline && (
            <Button
              size="sm"
              variant="neutral"
              className="flex-1"
              onClick={() => addToPipeline.requestAdd({ contactId: contact.id, contactName: contact.displayName || contact.waId, pipeline: salesPipeline })}
            >
              Negócio
            </Button>
          )}
        </div>
        {overlays}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-[18px] pt-3.5 pb-0 flex-shrink-0">
      {backNav && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar"
          className="-ml-1.5 p-1.5 rounded-sm text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-all flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}
      <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-base font-bold tracking-[-0.01em] text-surface-50 truncate">{contact.displayName}</h2>
          {contact.stage && <StageBadge stage={contact.stage} stages={stages} />}
        </div>

        {/* R2-1C-DRAWER-01 (RODADA-2.md): "telefone · e-mail · cliente desde
            mês/ano" numa linha só, como no mock (a Fase C tinha cortado e-mail
            e "cliente desde" — o dado existe). */}
        <p className="text-xs text-surface-400 truncate">
          {[
            formatPhoneBR(contact.waId),
            contact.email,
            contact.createdAt ? `cliente desde ${new Date(contact.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')}` : null,
          ].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button size="sm" variant="primary" leftIcon={<MessageSquare className="w-3.5 h-3.5" />} onClick={handleOpenChat}>
          Conversar
        </Button>
        {salesPipeline && (
          <Button
            size="sm"
            variant="neutral"
            onClick={() => addToPipeline.requestAdd({ contactId: contact.id, contactName: contact.displayName || contact.waId, pipeline: salesPipeline })}
          >
            Novo negócio
          </Button>
        )}
        {deleteMenu}
        {!backNav && (
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-sm text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {overlays}
    </div>
  )
}
