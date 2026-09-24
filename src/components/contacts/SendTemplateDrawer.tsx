import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, MessageSquare } from 'lucide-react'
import { templatesApi } from '@/services/api'
import { TemplateSendModal } from '@/components/templates/TemplateSendModal'
import type { WhatsAppTemplate, Contact } from '@/types'

interface SendTemplateDrawerProps {
  contact: Contact
  open: boolean
  onClose: () => void
}

export function SendTemplateDrawer({ contact, open, onClose }: SendTemplateDrawerProps) {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingTemplate, setPendingTemplate] = useState<WhatsAppTemplate | null>(null)

  useEffect(() => {
    if (!open) return
    // Reset ao abrir + busca dos templates: o drawer fica montado, então o estado
    // da abertura anterior precisa ser zerado aqui (o compilador só passou a
    // analisar este componente depois que o ConfirmModal saiu).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setPendingTemplate(null)
    templatesApi.list('APPROVED')
      .then((r) => setTemplates(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
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
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 text-accent-dark animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                  <MessageSquare className="w-8 h-8 text-surface-600" />
                  <p className="text-sm text-surface-400">Nenhum template aprovado disponível.</p>
                  <p className="text-xs text-surface-600">Crie templates em Disparos e aguarde aprovação da Meta.</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-surface-700">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setPendingTemplate(tpl)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-surface-800/50 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4 text-surface-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-surface-200 truncate">{tpl.name.replace(/_/g, ' ')}</p>
                          <span className="text-[10px] text-surface-600 bg-surface-800 px-1.5 py-0.5 rounded">{tpl.language}</span>
                        </div>
                        <p className="text-xs text-surface-400 line-clamp-2">{tpl.body}</p>
                        {tpl.footer && (
                          <p className="text-[10px] text-surface-600 mt-1 italic">{tpl.footer}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Send className="w-4 h-4 text-accent-dark" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
