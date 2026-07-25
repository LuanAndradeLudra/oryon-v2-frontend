import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { CopilotMark } from '@/lib/icons'
import { motion, AnimatePresence } from 'framer-motion'

import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { TipCard } from '@/components/ui/TipCard'
import type { CopilotAttachment } from '@/contexts/CopilotContext'
import { GlassChatInput } from './GlassChatInput'

// ─── Welcome area ─────────────────────────────────────────────────────────────

export interface WelcomeAreaProps {
  onSend: (text: string, attachments?: CopilotAttachment[]) => void
  atLimit: boolean
  onNew: () => void
  onOpenKnowledge: () => void
  userId?: string
}

export function WelcomeArea({ onSend, atLimit, onNew, onOpenKnowledge, userId }: WelcomeAreaProps) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const { checklist, markDone } = useSetupChecklist(userId)

  const handleSend = () => {
    const text = input.trim()
    if ((!text && attachments.length === 0) || atLimit) return
    const snapshot = attachments
    setInput('')
    setAttachments([])
    setAttachError(null)
    onSend(text, snapshot)
  }

  const handleAttachmentsChange = (newAtts: CopilotAttachment[]) => {
    setAttachError(null)
    setAttachments(newAtts)
  }

  return (
    <div className="relative flex flex-col h-full px-10 overflow-hidden">
      {/* ── Title block — fills top, anchors to center ── */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          className="relative z-10 w-full max-w-4xl text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <motion.div
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-2xl shadow-brand-900/50 mb-7"
            style={{ width: '53px', height: '53px' }}
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.45, type: 'spring', stiffness: 280 }}
          >
            <CopilotMark style={{ width: '26px', height: '26px' }} className="text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-5xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-surface-50 to-surface-300/70 pb-2 leading-tight">
              Como posso ajudar o seu<br />negócio hoje?
            </h1>
            <motion.div
              className="h-px bg-gradient-to-r from-transparent via-surface-600/40 to-transparent mt-3"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.9 }}
            />
          </motion.div>

          <motion.p
            className="text-base text-surface-400 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            Analise leads, gerencie campanhas ou tome ações direto no CRM
          </motion.p>
        </motion.div>
      </div>

      {/* ── Setup nudge banner ── */}
      <AnimatePresence>
        {!checklist.copilot && (
          <TipCard
            icon={<BookOpen className="w-4 h-4 text-brand-400" />}
            title="Configure sua base de conhecimento"
            description="Adicione instruções, dados da empresa e documentos para que o Copilot responda com muito mais precisão."
            className="relative z-10 w-full max-w-2xl mx-auto mb-4"
          >
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => { onOpenKnowledge(); markDone('copilot') }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-surface-950 text-xs font-semibold rounded-lg transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                Abrir base de conhecimento
              </button>
              <button
                onClick={() => markDone('copilot')}
                className="text-xs text-surface-500 hover:text-surface-300 transition-colors px-2 py-1.5"
              >
                Já configurei
              </button>
            </div>
          </TipCard>
        )}
      </AnimatePresence>

      {/* ── Input + chips — pinned to bottom ── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto pb-12 flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }}
        >
          {atLimit ? (
            <div className="text-center py-6 text-sm text-warning/80">
              Limite de 30 conversas atingido.{' '}
              <button onClick={onNew} className="underline hover:text-warning transition-colors">
                Exclua conversas antigas
              </button>{' '}
              para iniciar novas.
            </div>
          ) : (
            <GlassChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onAbort={() => {}}
              isBusy={false}
              placeholder="Pergunte sobre seus dados ou peça uma ação..."
              autoFocus
              attachments={attachments}
              onAttachmentsChange={handleAttachmentsChange}
              attachError={attachError}
            />
          )}
        </motion.div>

        {/* Sugestões de partida — o copilot em branco é intimidador; 4 ações
            reais mostram o ALCANCE da ferramenta (análise, CRM, campanha).
            Clicou → envia direto. */}
        {!atLimit && (
          <motion.div
            className="flex flex-wrap items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            {[
              'Analise meus leads desta semana',
              'Quais contatos estão esfriando?',
              'Resuma as conversas de hoje',
              'Monte uma campanha para leads frios',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSend(prompt)}
                className="px-3 py-1.5 rounded-full border border-surface-700/70 bg-surface-900/60 text-xs text-surface-400 hover:text-surface-100 hover:border-brand-500/40 hover:bg-surface-800 transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
