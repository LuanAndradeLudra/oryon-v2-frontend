import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, MessageSquare, CheckCircle2 } from 'lucide-react'
import { templatesApi, contactsApi } from '@/services/api'
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
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSent(false)
    setConvId(null)
    templatesApi.list('APPROVED')
      .then((r) => setTemplates(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [open])

  const handleSend = async (tpl: WhatsAppTemplate) => {
    setSending(true)
    try {
      const res = await contactsApi.sendTemplate(contact.id, tpl.name, tpl.language)
      setConvId(res.data.conversationId)
      setSent(true)
    } catch {
      // error
    } finally {
      setSending(false)
    }
  }

  const handleGoToChat = () => {
    if (convId) navigate(`/conversations?id=${convId}`)
    onClose()
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800 flex-shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-surface-100">Iniciar conversa</h3>
                <p className="text-[11px] text-surface-500">Enviar template para {contact.displayName}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-surface-200">Template enviado com sucesso</p>
                  <p className="text-xs text-surface-500">A conversa foi criada e está aguardando resposta do contato.</p>
                  <button
                    onClick={handleGoToChat}
                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 text-surface-950 hover:bg-brand-500 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ir para a conversa
                  </button>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                  <MessageSquare className="w-8 h-8 text-surface-600" />
                  <p className="text-sm text-surface-400">Nenhum template aprovado disponível.</p>
                  <p className="text-xs text-surface-600">Crie templates em Disparos e aguarde aprovação da Meta.</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-surface-800">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSend(tpl)}
                      disabled={sending}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-surface-800/50 transition-colors text-left group disabled:opacity-60"
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
                        {sending ? (
                          <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 text-brand-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
