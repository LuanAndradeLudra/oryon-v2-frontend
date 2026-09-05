import { useState, useRef, useEffect } from 'react'
import { chatWithAgent, startTestSession, endTestSession } from '@/services/agentsApi'
import type { AgentConfigWithTools, HandoffRule } from '@/services/agentsApi'

export interface SimulatorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: Date
}

/** Append enabled handoff rules as structured instructions so Claude follows them precisely */
export function buildTestSystemPrompt(agent: AgentConfigWithTools): string {
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

/**
 * Owns the test-chat session lifecycle (start/send/close) so it can be driven
 * from a modal (AgentTestModal, today) or, later, from a persistent workspace
 * page (A2) that keeps the simulator visible alongside other panels.
 *
 * `systemPrompt` is optional so a caller with an unpublished draft (A2) can
 * override the prompt sent to the backend; when omitted, behavior is
 * unchanged from before the extraction — it falls back to
 * `buildTestSystemPrompt(agent)`. `handoffRules` is the same idea for a
 * draft's not-yet-published rules — passed through to `POST
 * /agents/builder/chat` only when present; omitted, it's zero behavior
 * change (and a no-op today if the endpoint doesn't read the field yet).
 */
export function useAgentSimulator(
  agent: AgentConfigWithTools,
  opts?: { systemPrompt?: string; handoffRules?: HandoffRule[]; onFirstReply?: () => void },
) {
  const [messages, setMessages] = useState<SimulatorMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasResponded, setHasResponded] = useState(false)
  const sessionIdRef = useRef<string | null>(null)

  const effectiveSystemPrompt = opts?.systemPrompt ?? buildTestSystemPrompt(agent)

  // Create test session on mount — best-effort (failures don't block UI)
  useEffect(() => {
    startTestSession(agent.id)
      .then(s => { sessionIdRef.current = s.id })
      .catch(() => { /* session persistence unavailable — modal still works */ })
  }, [agent.id])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: SimulatorMessage = { id: `u-${Date.now()}`, role: 'user', content: text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const reply = await chatWithAgent(effectiveSystemPrompt, history, {
        sessionId: sessionIdRef.current ?? undefined,
        agentId:   agent.id,
        handoffRules: opts?.handoffRules,
      })
      const agentMsg: SimulatorMessage = { id: `a-${Date.now()}`, role: 'assistant', content: reply, ts: new Date() }
      setMessages(prev => [...prev, agentMsg])
      if (!hasResponded) {
        setHasResponded(true)
        opts?.onFirstReply?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao contatar o agente')
    } finally {
      setLoading(false)
    }
  }

  const dismissError = () => setError(null)

  // Fire & forget — the caller decides what to do with its own onClose (e.g.
  // navigating away or unmounting the modal) after calling this.
  const closeSession = () => {
    if (sessionIdRef.current) {
      endTestSession(agent.id, sessionIdRef.current).catch(() => {})
    }
  }

  return { messages, input, setInput, loading, error, dismissError, send, closeSession }
}
