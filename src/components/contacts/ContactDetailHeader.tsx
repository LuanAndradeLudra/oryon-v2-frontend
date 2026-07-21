import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Copy, ExternalLink, Trash2, Maximize2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { StageBadge } from './StageBadge'
import { SendTemplateDrawer } from './SendTemplateDrawer'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { contactsApi } from '@/services/api'
import type { Contact } from '@/types'

interface ContactDetailHeaderProps {
  contact: Contact
  onClose: () => void
  onDelete?: () => void
  /** Abre a página completa do contato (/contacts/:id). O gate da feature
   *  flag fica no caller — o header só renderiza o botão quando recebe o prop. */
  onExpand?: () => void
}

export function ContactDetailHeader({ contact, onClose, onDelete, onExpand }: ContactDetailHeaderProps) {
  const { stages } = useCRMConfig()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lastConvId, setLastConvId] = useState<string | null>(null)
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false)
  const handleCopyWa = () => navigator.clipboard.writeText(contact.waId)
  const canDelete = isAdminTier(user?.role)

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
    <div className="flex items-start gap-3 px-5 pt-5 pb-4 flex-shrink-0">
      <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="lg" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <h2 className="text-base font-semibold text-surface-50 truncate">{contact.displayName}</h2>
          {contact.stage && <StageBadge stage={contact.stage} stages={stages} />}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-surface-400">{contact.waId}</span>
          <button onClick={handleCopyWa} className="text-surface-500 hover:text-surface-200 transition-colors">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleOpenChat} title="Abrir conversa" className="text-surface-500 hover:text-emerald-400 transition-colors cursor-pointer">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {contact.company && (
          <p className="text-xs text-surface-500 mt-1 truncate">
            {contact.jobTitle ? `${contact.jobTitle} · ` : ''}{contact.company}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onExpand && (
          <button
            onClick={onExpand}
            title="Abrir o perfil completo do contato"
            aria-label="Abrir o perfil completo do contato"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-surface-200 bg-surface-800 border border-surface-700 hover:bg-surface-700 hover:text-surface-50 transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Perfil completo
          </button>
        )}
        {canDelete && onDelete && (
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              title="Excluir contato"
              className="p-1.5 rounded-lg text-surface-600 hover:text-red-400 hover:bg-surface-800 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
        )}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <SendTemplateDrawer
        contact={contact}
        open={templateDrawerOpen}
        onClose={() => setTemplateDrawerOpen(false)}
      />
    </div>
  )
}
