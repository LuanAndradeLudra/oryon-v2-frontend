import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Bot, AlertCircle, AlertTriangle, RefreshCw, ShieldCheck, Wrench, BarChart3,
  History, Check, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  chatWithAgent, startTestSession, endTestSession, listTestSessions, getTestSessionMessages,
  type AgentConfigWithTools, type ChatTurnDebug, type GuardSignal, type ToolCall, type TurnSummary,
  type TestSessionSummary,
} from '@/services/agentsApi'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { Banner } from '@/components/ui/Banner'
import { Tooltip } from '@/components/ui/Tooltip'
import { Dropdown } from '@/components/ui/Dropdown'
import { renderHighlighted } from '@/components/conversations/ChatWindow/AnomalyDetailModal'
import { guardCheckGuidance, guardOutcomeDetail, guardTypeLabel, findingReasonLabel } from '@/lib/guardReason'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: Date
  /** Só em mensagens do assistente — o painel de debug reflete sempre o último turno. */
  debug?: ChatTurnDebug
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
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

// ── Painel de debug (lado direito) ──────────────────────────────────────────

const TOOL_KIND_LABEL: Record<ToolCall['kind'], string> = {
  http: 'ferramenta HTTP',
  skill: 'skill (n8n)',
  crm: 'ação de CRM',
  kb: 'base de conhecimento',
  unknown: 'ferramenta',
}

const STATUS_LABEL: Record<TurnSummary['status'], string> = {
  answered: 'Respondida',
  aborted_loop: 'Loop abortado',
  max_turns: 'Limite de turnos',
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'ok' | 'warn' }) {
  return (
    <div className="rounded-xl border border-surface-700 bg-surface-800 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-surface-500">{label}</p>
      <p className={cn(
        'text-sm font-bold mt-0.5',
        tone === 'ok' ? 'text-success' : tone === 'warn' ? 'text-warning' : 'text-surface-50',
      )}>
        {value}
      </p>
    </div>
  )
}

function GuardPanel({ guard }: { guard: GuardSignal | null }) {
  if (!guard) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-success/25 bg-success/10 px-3.5 py-3">
        <ShieldCheck className="w-4 h-4 text-success flex-shrink-0" />
        <p className="text-xs text-surface-200">Nenhum bloqueio do Verification Gateway nesta resposta.</p>
      </div>
    )
  }

  const findings = guard.findings ?? []

  return (
    <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-danger text-surface-950">
          {guard.handoffRequested ? 'Handoff' : 'Corrigido'}
        </span>
        <span className="text-xs font-semibold text-surface-100">{guardTypeLabel(guard.outcome, guard.claimType)}</span>
      </div>

      <p className="text-xs text-surface-400 leading-relaxed">{guardOutcomeDetail(guard.outcome, guard.claimType)}</p>

      {guard.blockedText && (
        <div className="rounded-lg bg-surface-950/40 border border-danger/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-surface-500 font-medium mb-1.5">Texto retido (não chegou ao cliente)</p>
          <p className="text-xs text-surface-300 leading-relaxed whitespace-pre-wrap break-words">
            {renderHighlighted(guard.blockedText, findings)}
          </p>
        </div>
      )}

      {findings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {findings.map((f, i) => (
            <li key={i} className="text-[11px] text-surface-400 leading-snug">
              <span className="font-medium text-warning">"{f.raw}"</span> — {findingReasonLabel(f.type, f.reason)}
              {f.suggested && <> · correto: <span className="text-surface-300 font-medium">{f.suggested}</span></>}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg bg-surface-950/30 border border-danger/15 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-surface-500 font-medium mb-1">O que verificar</p>
        <p className="text-xs text-surface-300 leading-relaxed">{guardCheckGuidance(guard.outcome, guard.claimType)}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <div><span className="text-surface-500">Ferramenta esperada: </span><span className="text-surface-200 font-medium">{guard.requiredSkill ?? '—'}</span></div>
        <div><span className="text-surface-500">Reparo: </span><span className="text-surface-200 font-medium">{guard.repair ? `rung ${guard.repair.rung} · ${guard.repair.llmCalls} chamada(s)` : '—'}</span></div>
      </div>

      {guard.skillFailures.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wide text-surface-500 font-medium">Falhas de ferramenta no turno</p>
          {guard.skillFailures.map((f, i) => (
            <div key={i} className="rounded-lg bg-danger/10 border border-danger/25 px-2.5 py-1.5 text-[11px] text-surface-300">
              <span className="font-medium text-red-300">{f.name}</span>
              {f.statusCode != null && ` · HTTP ${f.statusCode}`}
              {f.message && ` — ${f.message}`}
            </div>
          ))}
        </div>
      )}

      {guard.correlationId && (
        <p className="text-[10px] text-surface-600 font-mono break-all">ref: {guard.correlationId}</p>
      )}
    </div>
  )
}

function ToolsPanel({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (toolCalls.length === 0) {
    return <p className="text-xs text-surface-500 px-1">Nenhuma ferramenta foi chamada nesta resposta.</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {toolCalls.map((t, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-xl border border-surface-700 bg-surface-800 px-3 py-2.5">
          <span className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
            t.success ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
          )}>
            {t.success ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-surface-100 truncate">{t.name}</p>
            <p className="text-[10px] text-surface-500">{TOOL_KIND_LABEL[t.kind]}</p>
          </div>
          <span className={cn(
            'text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
            t.success ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
          )}>
            {t.success ? 'sucesso' : 'falha'}
          </span>
        </div>
      ))}
    </div>
  )
}

function SummaryPanel({ summary }: { summary: TurnSummary | null }) {
  if (!summary) {
    return <p className="text-xs text-surface-500 px-1">Envie uma mensagem para ver o resumo do turno.</p>
  }
  const modelLabel = summary.model.includes('haiku') ? 'Haiku' : summary.model.includes('sonnet') ? 'Sonnet' : summary.model
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <StatCard label="Status" value={STATUS_LABEL[summary.status]} tone={summary.status === 'answered' ? 'ok' : 'warn'} />
      <StatCard label="Modelo" value={modelLabel} />
      <StatCard label="Turnos internos" value={String(summary.turns)} />
      <StatCard label="Ferramentas chamadas" value={String(summary.toolsCalledCount)} />
      <StatCard label="Tokens entrada" value={summary.tokens.input.toLocaleString('pt-BR')} />
      <StatCard label="Tokens saída" value={summary.tokens.output.toLocaleString('pt-BR')} />
      {summary.tokens.cacheRead > 0 && <StatCard label="Cache lido" value={summary.tokens.cacheRead.toLocaleString('pt-BR')} />}
      {summary.tokens.cacheCreation > 0 && <StatCard label="Cache criado" value={summary.tokens.cacheCreation.toLocaleString('pt-BR')} />}
    </div>
  )
}

type TabId = 'verification' | 'tools' | 'summary'

const TABS: Array<{ id: TabId; label: string; icon: typeof ShieldCheck; hint: string }> = [
  {
    id: 'verification',
    label: 'Verificação',
    icon: ShieldCheck,
    hint: 'O que o guard anti-alucinação (Verification Gateway) fez nesta resposta — se bloqueou algo, por quê, e o que ele sabia no momento.',
  },
  {
    id: 'tools',
    label: 'Ferramentas',
    icon: Wrench,
    hint: 'Toda ferramenta acionada nesta resposta — base de conhecimento, tools HTTP, skills — e se funcionou.',
  },
  {
    id: 'summary',
    label: 'Resumo do turno',
    icon: BarChart3,
    hint: 'Modelo usado, turnos internos e tokens que essa resposta consumiu, e o status final (respondida, handoff, etc.).',
  },
]

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
  const [activeTab, setActiveTab] = useState<TabId>('verification')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sessionIdRef = useRef<string | null>(null)

  // ── Histórico de sessões anteriores ────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyList, setHistoryList] = useState<TestSessionSummary[] | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  // Quando setado, o modal está em modo leitura mostrando uma sessão antiga em
  // vez do teste ao vivo — mesma forma de `messages`, então o painel de debug
  // (derivado do último turno do assistente) funciona sem distinção de caminho.
  const [viewingSession, setViewingSession] = useState<{ id: string; createdAt: string; messages: Message[] } | null>(null)
  const [loadingSessionView, setLoadingSessionView] = useState(false)

  // Build enriched system prompt once per mount (rules don't change during test)
  const testSystemPrompt = buildTestSystemPrompt(agent)

  const displayMessages = viewingSession ? viewingSession.messages : messages
  const lastAssistant = [...displayMessages].reverse().find(m => m.role === 'assistant')
  const activeGuard = lastAssistant?.debug?.guard ?? null
  const activeToolCalls = lastAssistant?.debug?.toolCalls ?? []
  const activeSummary = lastAssistant?.debug?.turnSummary ?? null

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
    if (viewingSession) return // sessão antiga fica onde está — não segue o fim da lista
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, viewingSession])

  const send = async () => {
    const text = input.trim()
    if (!text || loading || viewingSession) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const result = await chatWithAgent(testSystemPrompt, history, {
        sessionId: sessionIdRef.current ?? undefined,
        agentId:   agent.id,
      })
      const agentMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: result.message,
        ts: new Date(),
        debug: { toolCalls: result.toolCalls, turnSummary: result.turnSummary, guard: result.guard },
      }
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

  const openHistory = () => {
    setHistoryOpen(v => !v)
    if (historyList === null && !loadingHistory) {
      setLoadingHistory(true)
      listTestSessions(agent.id)
        .then(setHistoryList)
        .catch(() => setHistoryList([]))
        .finally(() => setLoadingHistory(false))
    }
  }

  const openSession = async (session: TestSessionSummary) => {
    setHistoryOpen(false)
    setLoadingSessionView(true)
    try {
      const rows = await getTestSessionMessages(agent.id, session.id)
      setViewingSession({
        id: session.id,
        createdAt: session.created_at,
        messages: rows.map(r => ({ id: r.id, role: r.role, content: r.content, ts: new Date(r.created_at), debug: r.debug ?? undefined })),
      })
    } catch {
      setError('Não foi possível carregar essa sessão.')
    } finally {
      setLoadingSessionView(false)
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

      {/* Modal — painel dividido: chat à esquerda, debug à direita */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 w-full max-w-5xl h-[680px] bg-surface-950 overlay-frame border rounded-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800/60 bg-surface-900 flex-shrink-0">
          <AgentIcon iconId={agent.icon} className="w-9 h-9" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-100 truncate">{agent.name}</p>
            <p className="text-[11px] text-surface-500">Modo de teste · WhatsApp simulado</p>
          </div>
          <Dropdown
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            align="right"
            className="w-72"
            anchor={
              <button
                onClick={openHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-surface-300 bg-surface-800 border border-surface-700 hover:bg-surface-700 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                Sessões anteriores
                <ChevronDown className={cn('w-3 h-3 transition-transform', historyOpen && 'rotate-180')} />
              </button>
            }
          >
            {loadingHistory ? (
              <div className="p-5 flex justify-center">
                <RefreshCw className="w-4 h-4 animate-spin text-surface-400" />
              </div>
            ) : !historyList || historyList.length === 0 ? (
              <p className="text-xs text-surface-500 px-3 py-4 text-center">Nenhuma sessão de teste anterior.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto py-1">
                {historyList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => void openSession(s)}
                    className="w-full text-left px-3 py-2.5 hover:bg-surface-700 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-surface-100">{formatSessionDate(s.created_at)}</p>
                      <p className="text-[10px] text-surface-500">
                        {s.message_count} mensagem(ns) · {(s.input_tokens + s.output_tokens).toLocaleString('pt-BR')} tokens
                      </p>
                    </div>
                    {!s.ended_at && (
                      <span className="text-[9px] font-bold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">aberta</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Dropdown>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banner: modo de teste, ou revisão de sessão antiga */}
        {viewingSession ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 border-b border-brand-500/25 flex-shrink-0">
            <History className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <p className="text-[11px] text-brand-300 flex-1">Revisando sessão de {formatSessionDate(viewingSession.createdAt)} — leitura, não envia mensagens.</p>
            <button
              onClick={() => setViewingSession(null)}
              className="text-[11px] font-semibold text-brand-300 hover:text-brand-200 underline underline-offset-2 flex-shrink-0"
            >
              Voltar ao teste atual
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-status-pending-bg border-b border-status-pending-border flex-shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-status-pending flex-shrink-0" />
            <p className="text-[11px] text-status-pending">
              Simulação — system prompt
              {(agent.handoff_rules?.rules ?? []).filter(r => r.enabled).length > 0
                ? ` + ${(agent.handoff_rules?.rules ?? []).filter(r => r.enabled).length} regra(s) de handoff ativas`
                : ' sem regras de handoff configuradas'}
            </p>
          </div>
        )}

        {/* Body: split */}
        <div className="flex-1 flex min-h-0">
          {/* ── Coluna esquerda: chat ──────────────────────────────────────── */}
          <div className="w-[420px] flex-shrink-0 flex flex-col border-r border-surface-800/60 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ background: 'radial-gradient(ellipse at top, hsl(var(--color-surface-900)/0.4) 0%, transparent 70%)' }}>
              {loadingSessionView && (
                <div className="flex justify-center py-6">
                  <RefreshCw className="w-4 h-4 animate-spin text-surface-400" />
                </div>
              )}

              {!loadingSessionView && displayMessages.length === 0 && !loading && (
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
                {!loadingSessionView && displayMessages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={cn('flex mb-2', msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2')}
                  >
                    {msg.role === 'assistant' && msg.debug?.guard && (
                      <span
                        title="Verification Gateway interveio nesta resposta"
                        className="w-5 h-5 rounded-full bg-warning flex items-center justify-center flex-shrink-0 mb-0.5"
                      >
                        <AlertTriangle className="w-3 h-3 text-surface-950" />
                      </span>
                    )}
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0 mb-0.5">
                        <Bot className="w-3.5 h-3.5 text-surface-400" />
                      </div>
                    )}
                    <div className="max-w-[78%] min-w-0">
                      <div className={cn(
                        'rounded-2xl px-3.5 py-2.5',
                        msg.role === 'user'
                          ? 'bg-brand-600 rounded-br-sm text-surface-950'
                          : msg.debug?.guard
                            ? 'bg-surface-800 border border-danger/40 rounded-bl-sm text-surface-100'
                            : 'bg-surface-800 border border-surface-700/60 rounded-bl-sm text-surface-100',
                      )}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-[10px] mt-1 text-right text-white/70">
                          {formatTime(msg.ts)}
                        </p>
                      </div>
                      {/* Chips das ferramentas chamadas neste turno específico */}
                      {msg.role === 'assistant' && (msg.debug?.toolCalls.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {msg.debug!.toolCalls.map((t, i) => (
                            <span
                              key={i}
                              className={cn(
                                'inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                                t.success ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                              )}
                            >
                              <Wrench className="w-2.5 h-2.5" /> {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && <TypingIndicator />}

              {error && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <Banner
                    variant="danger"
                    action={
                      <button onClick={() => setError(null)} className="opacity-80 hover:opacity-100 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    }
                  >
                    <p className="text-xs">{error}</p>
                  </Banner>
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
                placeholder={viewingSession ? 'Volte ao teste atual para enviar mensagens' : 'Digite uma mensagem...'}
                rows={1}
                disabled={loading || !!viewingSession}
                className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 resize-none transition disabled:opacity-50 max-h-28 overflow-y-auto"
                style={{ minHeight: '42px' }}
              />
              <button
                onClick={() => void send()}
                disabled={!input.trim() || loading || !!viewingSession}
                className="w-10 h-10 rounded-xl bg-surface-100 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed text-surface-950 flex items-center justify-center flex-shrink-0 transition-all"
              >
                {loading
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ── Coluna direita: painel de debug ─────────────────────────────── */}
          <div className="flex-1 flex flex-col min-h-0 bg-surface-900">
            <div className="flex gap-1 px-3 pt-2.5 border-b border-surface-800/60 flex-shrink-0">
              {TABS.map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <Tooltip key={tab.id} content={tab.hint} side="bottom" wide>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-bold transition-colors border border-b-0',
                        active
                          ? 'text-brand-400 bg-surface-950 border-surface-800/60'
                          : 'text-surface-500 border-transparent hover:text-surface-300',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  </Tooltip>
                )
              })}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'verification' && <GuardPanel guard={activeGuard} />}
              {activeTab === 'tools' && <ToolsPanel toolCalls={activeToolCalls} />}
              {activeTab === 'summary' && <SummaryPanel summary={activeSummary} />}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
