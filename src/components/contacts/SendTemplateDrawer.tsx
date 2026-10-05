import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { TemplateSendModal } from '@/components/templates/TemplateSendModal'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import type { WhatsAppTemplate, Contact } from '@/types'

interface SendTemplateDrawerProps {
  contact: Contact
  open: boolean
  onClose: () => void
}

export function SendTemplateDrawer({ contact, open, onClose }: SendTemplateDrawerProps) {
  const navigate = useNavigate()
  const [pendingTemplate, setPendingTemplate] = useState<WhatsAppTemplate | null>(null)

  useEffect(() => {
    if (!open) return
    // O drawer fica montado: o template pendente da abertura anterior precisa
    // ser zerado ao abrir. A lista de templates é do TemplatePicker, que monta
    // (e recarrega) a cada abertura porque o conteúdo só existe com `open`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingTemplate(null)
  }, [open])

  if (!open) return null

  // Portal em document.body (como ui/Drawer): o `fixed` não pode depender de
  // nenhum ancestral sem transform — o painel acoplado do contato anima.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--color-scrim-soft)] z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] z-50 bg-surface-900 border-l overlay-frame flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700 flex-shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-surface-100">Iniciar conversa</h3>
                <p className="text-[11px] text-surface-500">Enviar template para {contact.displayName}</p>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <TemplatePicker onSelect={setPendingTemplate} />
            </div>
          </motion.div>
        </>
      )}

      {/* Escolher o template abre a revisão (variáveis + prévia) e o envio
          acontece ali, num único diálogo — que também avisa que uma mensagem
          real vai para o contato (QW-07). */}
      <TemplateSendModal
        template={pendingTemplate}
        contactId={contact.id}
        recipientName={contact.displayName || undefined}
        onClose={() => setPendingTemplate(null)}
        onSent={(res) => {
          // O chat abre já com o template renderizado.
          setPendingTemplate(null)
          onClose()
          navigate(`/conversations?id=${res.conversationId}`)
        }}
      />
    </AnimatePresence>,
    document.body,
  )
}
