import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { chatWithAgent, startTestSession, endTestSession } from '@/services/agentsApi'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import { AgentIcon } from '@/components/agents/AgentIcons'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: Date
}

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

/** Append enabled handoff rules as structured instructions so Claude follows them precisely */
function buildTestSystemPrompt(agent: AgentConfigWithTools): string {
  const rules = (agent.handoff_rules?.rules ?? []).filter(r => r.enabled)
  if (rules.length === 0) return agent.system_prompt

  const rulesSection = rules.map(r => {
    const keywordList = r.keywords.join(', ')
    const matchDesc =
      r.matchMode === 'exact'        ? 'frase exata'
      : r.matchMode === 'all_keywords' ? 'todas as palavras presentes'
      : 'qualquer uma das palavras-chave'
    const actionDesc =
      r.action === 'human_handoff'     ? `transferir para atendimento humano${r.department ? ` (${r.department})` : ''}`
      : r.action === 'auto_reply'       ? 'responder automaticamente com o template'
      : r.action === 'external_redirect' ? 'redirecionar para URL externa'
      : 'repassar para outro agente'

    return [
      `### Regra: ${r.name}`,
      `- Critério de disparo (${matchDesc}): ${keywordList}`,
      `- Ação: ${actionDesc}`,
      r.template ? `- Resposta obrigatória: "${r.template}"` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return `${agent.system_prompt}

---

## REGRAS DE HANDOFF (PRIORIDADE MÁXIMA)

As regras abaixo têm prioridade sobre qualquer outra instrução. Quando detectar as palavras-chave indicadas na mensagem do cliente, execute a ação correspondente e use EXATAMENTE o texto do template — não improvise, não adicione conteúdo extra.

${rulesSection}

Quando uma regra for ativada, responda SOMENTE com o texto do template configurado.`
}

export function AgentTestModal({
  agent,
  onClose,
  onTested,
}: {
  agent: AgentConfigWithTools
  onClose: () => void
  onTested: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasResponded, setHasResponded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sessionIdRef = useRef<string | null>(null)

  // Build enriched system prompt once per mount (rules don't change during test)
  const testSystemPrompt = buildTestSystemPrompt(agent)

  // Close test session (fire & forget) then call onClose
  const handleClose = () => {
    if (sessionIdRef.current) {
      endTestSession(agent.id, sessionIdRef.current).catch(() => {})
    }
    onClose()
  }

  // Create test session on mount — best-effort (failures don't block UI)
  useEffect(() => {
    startTestSession(agent.id)
      .then(s => { sessionIdRef.current = s.id })
      .catch(() => { /* session persistence unavailable — modal still works */ })
  }, [agent.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const reply = await chatWithAgent(testSystemPrompt, history, {
        sessionId: sessionIdRef.current ?? undefined,
        agentId:   agent.id,
      })
      const agentMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: reply, ts: new Date() }
      setMessages(prev => [...prev, agentMsg])
      if (!hasResponded) {
        setHasResponded(true)
        onTested()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao contatar o agente')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    // z-[60] for the same reason as the shared Modal: this overlay can be
    // opened from within the agent-builder wizard (z-50). Sharing z-50
    // caused wizard children to show through the backdrop.
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 w-full max-w-md h-[640px] bg-surface-950 border border-surface-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800/60 bg-surface-900 flex-shrink-0">
          <AgentIcon iconId={agent.icon} className="w-9 h-9" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-100 truncate">{agent.name}</p>
            <p className="text-[11px] text-surface-500">Modo de teste · WhatsApp simulado</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
              className="flex items-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl"
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-surface-500 hover:text-surface-300 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 px-4 py-3 border-t border-surface-800/60 bg-surface-900/60 flex-shrink-0">
          <textarea
            ref={inputRef}
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
      </motion.div>
    </div>
  )
}
