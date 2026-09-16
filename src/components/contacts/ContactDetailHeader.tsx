import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MoreHorizontal, Trash2, MessageSquare } from 'lucide-react'
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
}

export function ContactDetailHeader({ contact, onClose, onDelete }: ContactDetailHeaderProps) {
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

  return (
    <div className="flex items-center gap-3 px-[18px] pt-3.5 pb-0 flex-shrink-0">
      <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-bold tracking-[-0.01em] text-surface-50 truncate">{contact.displayName}</h2>
          {contact.stage && <StageBadge stage={contact.stage} stages={stages} />}
        </div>

        <p className="text-xs text-surface-400">{formatPhoneBR(contact.waId)}</p>

        <div className="flex items-center gap-2 mt-3">
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
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {canDelete && onDelete ? (
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
                  className="w-7 h-7 rounded-sm border border-[var(--bd2)] flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
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
              description={`Esta ação é irreversível. O contato "${contact.displayName || contact.waId}" e todo o seu histórico serão excluídos permanentemente.`}
              confirmLabel="Excluir contato"
              danger
            />
          </>
        ) : null}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="p-1.5 rounded-sm text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <SendTemplateDrawer
        contact={contact}
        open={templateDrawerOpen}
        onClose={() => setTemplateDrawerOpen(false)}
      />
      {addToPipeline.dialogs}
    </div>
  )
}
