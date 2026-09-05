import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, AlertCircle, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import { Banner } from '@/components/ui/Banner'
import type { SimulatorMessage } from './useAgentSimulator'

function formatTime(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-surface-400" />
      </div>
      <div className="bg-surface-800 border border-surface-700/60 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-surface-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Self-contained chat panel: test-mode banner pinned at top, messages
 * scrolling in the middle, input pinned at bottom. Consumes the return of
 * `useAgentSimulator` as props (same pattern as the studio steps consuming
 * `data`/`setData`) so a caller (AgentTestModal today; the A2 Workspace page
 * later) can call the hook itself and share its state with sibling UI.
 */
export function SimulatorPanel({
  agent, messages, input, setInput, loading, error, dismissError, send,
}: {
  agent: AgentConfigWithTools
  messages: SimulatorMessage[]
  input: string
  setInput: (v: string) => void
  loading: boolean
  error: string | null
  dismissError: () => void
  send: () => void | Promise<void>
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Test mode banner */}
      <div className="flex items-center gap-2 px-4 py-2 bg-status-pending-bg border-b border-status-pending-border flex-shrink-0">
        <AlertCircle className="w-3.5 h-3.5 text-status-pending flex-shrink-0" />
        <p className="text-[11px] text-status-pending">
          Simulação — system prompt
          {(agent.handoff_rules?.rules ?? []).filter(r => r.enabled).length > 0
            ? ` + ${(agent.handoff_rules?.rules ?? []).filter(r => r.enabled).length} regra(s) de handoff ativas`
            : ' sem regras de handoff configuradas'}
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ background: 'radial-gradient(ellipse at top, hsl(var(--color-surface-900)/0.4) 0%, transparent 70%)' }}>
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/10 ring-1 ring-brand-500/20 flex items-center justify-center">
              <Bot className="w-7 h-7 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-300">Conversa em branco</p>
              <p className="text-xs text-surface-600 mt-1">Envie uma mensagem para iniciar o teste</p>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.15 }}
              className={cn('flex mb-2', msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2')}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-surface-400" />
                </div>
              )}
              <div className={cn(
                'max-w-[78%] rounded-2xl px-3.5 py-2.5',
                msg.role === 'user'
                  ? 'bg-brand-600 rounded-br-sm text-surface-950'
                  : 'bg-surface-800 border border-surface-700/60 rounded-bl-sm text-surface-100',
              )}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className={cn(
                  'text-[10px] mt-1 text-right',
                  msg.role === 'user' ? 'text-brand-200/70' : 'text-surface-600',
                )}>
                  {formatTime(msg.ts)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && <TypingIndicator />}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Banner
              variant="danger"
              action={
                <button onClick={dismissError} className="opacity-80 hover:opacity-100 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              }
            >
              <p className="text-xs">{error}</p>
            </Banner>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-surface-800/60 bg-surface-900/60 flex-shrink-0">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Digite uma mensagem..."
          rows={1}
          disabled={loading}
          className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 resize-none transition disabled:opacity-50 max-h-28 overflow-y-auto"
          style={{ minHeight: '42px' }}
        />
        <button
          onClick={() => void send()}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-surface-950 flex items-center justify-center flex-shrink-0 transition-all"
        >
          {loading
            ? <RefreshCw className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
