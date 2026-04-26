import { useRef, useState, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
import type { BatchApprovalItem, CopilotAttachment, CopilotMessage, ToolCallRecord } from '@/contexts/CopilotContext'
import { runCopilotTurnBackend, sendApprovalDecision } from '@/services/copilotServiceBackend'
import { useAuth } from '@/contexts/AuthContext'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { loadKB, DEFAULT_KB } from '@/hooks/useKnowledgeBase'
import { loadHub, loadHubAsync } from '@/services/companyContextService'
// Agent Server is always used — no local agent execution

// Parse raw Anthropic SDK error messages into user-friendly Portuguese strings
function parseCopilotError(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err)) || ''
  // Try to extract the inner message from Anthropic's JSON error body
  try {
    const jsonStart = raw.indexOf('{')
    if (jsonStart !== -1) {
      const parsed = JSON.parse(raw.slice(jsonStart)) as { error?: { type?: string; message?: string } }
      const inner = parsed?.error?.message ?? ''
      if (inner) {
        if (inner.toLowerCase().includes('credit balance')) {
          return 'Saldo de créditos insuficiente. Recarregue sua conta Anthropic para continuar usando o copiloto.'
        }
        return inner
      }
    }
  } catch { /* not JSON — fall through */ }
  return raw || 'Erro ao processar sua mensagem.'
}

type TurnStatus = 'idle' | 'streaming' | 'tool_running' | 'error'

interface UseCopilotReturn {
  status: TurnStatus
  activeToolName: string | null
  /** Current agent label (e.g., "Analisando métricas...") — null when idle. */
  activeAgentLabel: string | null
  error: string | null
  sendMessage: (text: string, attachments?: CopilotAttachment[], opts?: { slidePreset?: string }) => Promise<void>
  rerunFromMessage: (userMsg: CopilotMessage, historyBefore: CopilotMessage[]) => Promise<void>
  abort: () => void
  resolveBatch: (batchTcId: string, approvedIds: string[]) => void
}

const AGENT_LABELS: Record<string, string> = {
  crm_read:      'Consultando CRM...',
  crm_write:     'Executando operação...',
  analytics:     'Analisando métricas...',
  artifact:      'Gerando artefato visual...',
  composer:      'Redigindo conteúdo...',
  web:           'Pesquisando na web...',
  agent_builder: 'Configurando agente...',
}

const TOOL_LABELS: Record<string, string> = {
  // Read tools
  list_contacts:           'Buscando contatos...',
  get_contact_details:     'Lendo contato...',
  get_contact_history:     'Lendo histórico...',
  list_conversations:      'Buscando conversas...',
  get_activity_feed:       'Lendo atividade recente...',
  get_recent_messages:     'Lendo mensagens recentes...',
  get_home_stats:          'Carregando métricas...',
  get_contacts_analytics:      'Agregando contatos...',
  get_conversations_analytics: 'Agregando conversas...',
  get_messages_analytics:      'Agregando mensagens...',
  get_pending_leads:       'Verificando leads pendentes...',
  list_campaigns:          'Buscando campanhas...',
  get_campaign_report:     'Analisando campanha...',
  get_campaign_conversations: 'Analisando conversas da campanha...',
  list_templates:          'Buscando templates...',
  list_stages:             'Lendo pipeline...',
  list_tags:               'Buscando etiquetas...',
  list_custom_fields:      'Lendo campos...',
  list_users:              'Buscando usuários...',
  list_automations:        'Lendo automações...',
  query_design_system:     'Consultando design system...',
  // Write tools
  create_contact:          'Criando contato...',
  update_contact:          'Atualizando contato...',
  assign_conversation:     'Atribuindo conversa...',
  set_conversation_status: 'Atualizando conversa...',
  add_tag_to_conversation: 'Adicionando etiqueta...',
  send_message:            'Enviando mensagem...',
  create_tag:              'Criando etiqueta...',
  update_tag:              'Atualizando etiqueta...',
  delete_tag:              'Excluindo etiqueta...',
  create_stage:            'Criando estágio...',
  update_stage:            'Atualizando estágio...',
  delete_stage:            'Excluindo estágio...',
  create_template:         'Criando template...',
  update_template:         'Atualizando template...',
  delete_template:         'Excluindo template...',
  create_campaign:         'Criando campanha...',
  update_campaign:         'Atualizando campanha...',
  delete_campaign:         'Excluindo campanha...',
  send_campaign:           'Disparando campanha...',
  create_custom_field:     'Criando campo...',
  update_custom_field:     'Atualizando campo...',
  delete_custom_field:     'Excluindo campo...',
  create_automation:       'Criando automação...',
  update_automation:       'Atualizando automação...',
  delete_automation:       'Excluindo automação...',
  toggle_automation:       'Alternando automação...',
  // Canned responses
  create_canned_response:  'Criando resposta rápida...',
  update_canned_response:  'Atualizando resposta rápida...',
  delete_canned_response:  'Excluindo resposta rápida...',
  // Conversations extras
  remove_tag_from_conversation: 'Removendo etiqueta...',
  transfer_conversation:   'Transferindo conversa...',
  // Dashboard & context
  get_dashboard_snapshot:  'Carregando dashboard...',
  get_company_brain:       'Lendo Company Brain...',
  get_unread_count:        'Verificando não lidas...',
  // Web tools
  web_search:              'Pesquisando na web...',
  web_fetch:               'Acessando página...',
  browser_navigate:        'Abrindo página no navegador...',
  browser_click:           'Interagindo com a página...',
  browser_extract:         'Extraindo dados da página...',
  // Media tools
  upload_media:            'Fazendo upload de mídia...',
  upload_user_attachment:  'Enviando arquivo anexado...',
  export_artifact_to_pdf:  'Convertendo artefato para PDF...',
  // Agent builder tools
  get_agent_config:        'Lendo configuração do agente...',
  create_agent_config:     'Criando agente...',
  update_agent_config:     'Atualizando agente...',
  add_agent_tool:          'Adicionando ferramenta...',
  update_agent_tool:       'Atualizando ferramenta...',
  delete_agent_tool:       'Removendo ferramenta...',
}

export function useCopilot(
  messages: CopilotMessage[],
  setMessages: Dispatch<SetStateAction<CopilotMessage[]>>,
  tools?: Array<{ name: string; description?: string; input_schema: Record<string, unknown> }>,
  sessionId?: string,
): UseCopilotReturn {
  const { user } = useAuth()
  const { stages, fieldDefs } = useCRMConfig()
  const location = useLocation()

  const [status, setStatus] = useState<TurnStatus>('idle')
  const [activeToolName, setActiveToolName] = useState<string | null>(null)
  const [activeAgentLabel, setActiveAgentLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const toolTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentAssistantIdRef = useRef<string | null>(null)
  // Maps batchId → turnId so resolveBatch knows where to POST
  const batchTurnIdMapRef = useRef<Map<string, string>>(new Map())
  // Token buffer — accumulates tokens and flushes every 150ms instead of re-rendering per token
  const tokenBufferRef = useRef<string>('')
  const tokenFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Phase 9 UX: id of the plan step that is currently "running", so onToolCall
  // can tag new ToolCallRecords with the step they belong to.
  const currentStepIdRef = useRef<string | null>(null)
  // KB cache — avoid re-parsing localStorage on every send
  const kbCacheRef = useRef<{ tenantId: string; kb: ReturnType<typeof loadKB>; hub: ReturnType<typeof loadHub>; ts: number } | null>(null)

  // Tracks which batches have a POST /approve in flight so a second click
  // (or a race between two rapid clicks) becomes a no-op. This matches the
  // `'submitting'` intermediate state on the ToolCallRecord — the Set is
  // cheaper to read than scanning messages for a status, and survives the
  // async boundary without stale-closure bugs.
  const submittingBatchesRef = useRef<Set<string>>(new Set())

  // Called from the batch card when the user clicks "Confirmar" or "Cancelar".
  // Sends the decision (with optional edited inputs) to the Agent Server via POST /approve.
  const resolveBatch = useCallback((batchTcId: string, approvedIds: string[], editedInputs?: Record<string, Record<string, unknown>>) => {
    // Double-submit guard. If the user double-clicked before the first POST
    // returned, just drop the second call — the first one is already
    // flipping the UI.
    if (submittingBatchesRef.current.has(batchTcId)) return

    const turnId = batchTurnIdMapRef.current.get(batchTcId)
    if (!turnId) return

    submittingBatchesRef.current.add(batchTcId)

    // Intermediate state: card stays rendered but the button is disabled +
    // shows a spinner. Prevents further clicks and gives the operator
    // feedback that we're talking to the server.
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        toolCalls: m.toolCalls?.map((tc) =>
          tc.id === batchTcId ? { ...tc, approvalStatus: 'submitting' as const } : tc,
        ),
      })),
    )

    sendApprovalDecision(turnId, batchTcId, approvedIds, editedInputs)
      .then(() => {
        batchTurnIdMapRef.current.delete(batchTcId)
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            toolCalls: m.toolCalls?.map((tc) =>
              tc.id === batchTcId
                ? { ...tc, approvalStatus: approvedIds.length > 0 ? 'approved' as const : 'denied' as const }
                : tc,
            ),
          })),
        )
      })
      .catch((err) => {
        // Backend rejected the approval (expired turn, validation error,
        // network blip). Surface the reason to the operator instead of the
        // old silent `.catch(() => {})` — and roll the card back to
        // 'pending' so they can retry after fixing whatever was wrong.
        setError(parseCopilotError(err))
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            toolCalls: m.toolCalls?.map((tc) =>
              tc.id === batchTcId ? { ...tc, approvalStatus: 'pending' as const } : tc,
            ),
          })),
        )
      })
      .finally(() => {
        submittingBatchesRef.current.delete(batchTcId)
      })
  }, [setMessages])

  // SSE approval handler: creates the __approval_batch__ tool call in the message
  // so the BatchApprovalCard renders in the chat.
  const handleApprovalRequest = useCallback(
    (batchId: string, turnId: string, items: Array<{ id: string; name: string; input: unknown }>, expiresAt?: number) => {
      const assistantId = currentAssistantIdRef.current
      if (!assistantId) return

      // Store turnId mapping for later POST /approve
      batchTurnIdMapRef.current.set(batchId, turnId)

      // Create the __approval_batch__ tool call record
      const batchTc: ToolCallRecord = {
        id: batchId,
        name: '__approval_batch__',
        input: null,
        status: 'running',
        approvalStatus: 'pending',
        batchItems: items.map((item) => ({ id: item.id, name: item.name, input: item.input })),
        approvalExpiresAt: expiresAt,
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, toolCalls: [...(m.toolCalls ?? []), batchTc] } : m
        )
      )
    },
    [setMessages],
  )

  // Setup nudge — deterministic short-circuit from the orchestrator when
  // the user asked to create a WhatsApp-dependent resource and no line is
  // connected. We attach it to the streaming assistant message so the UI
  // renders a CTA card BELOW the prose text. No tool chip, no plan card.
  const handleSetupRequired = useCallback(
    (reason: string, message: string, cta: { href: string; label: string }) => {
      const assistantId = currentAssistantIdRef.current
      if (!assistantId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, setupRequired: { reason, message, cta } } : m
        )
      )
    },
    [setMessages],
  )

  // Helper: update the statusLabel on the streaming message directly.
  // This is the RELIABLE way to show agent/tool progress — it modifies the message
  // object itself, which React tracks via setMessages, bypassing memo issues.
  const updateStatusLabel = useCallback((assistantId: string, label: string | null) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.isStreaming ? { ...m, statusLabel: label ?? undefined } : m
      )
    )
  }, [setMessages])

  // Shared factory — creates onToolCall/onToolResult callbacks for a given assistant message ID
  const makeToolCallbacks = useCallback((assistantId: string) => {
    const onToolCall = (name: string, input: unknown) => {
      setStatus('tool_running')
      const label = TOOL_LABELS[name] ?? 'Buscando informações...'
      setActiveToolName(label)
      updateStatusLabel(assistantId, label)
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m
          const newTc: ToolCallRecord = {
            id: crypto.randomUUID(),
            name, input,
            status: 'running',
            // Phase 9 UX: tag the call with the step that is running right
            // now; PlanCard renders it inline and CopilotMessage hides it
            // from the top-level chip list.
            stepId: currentStepIdRef.current ?? undefined,
          }
          return { ...m, toolCalls: [...(m.toolCalls ?? []), newTc] }
        })
      )
    }
    const onToolResult = (name: string, input: unknown, result: unknown) => {
      setStatus('streaming')
      const doneLabel = TOOL_LABELS[name]
      if (doneLabel) {
        const completedLabel = `✓ ${doneLabel.replace('...', '')}`
        setActiveToolName(completedLabel)
        updateStatusLabel(assistantId, completedLabel)
        if (toolTimeoutRef.current) clearTimeout(toolTimeoutRef.current)
        toolTimeoutRef.current = setTimeout(() => {
          setActiveToolName(null)
          updateStatusLabel(assistantId, null)
          toolTimeoutRef.current = null
        }, 800)
      } else {
        setActiveToolName(null)
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m
          // Update only the FIRST running chip for this tool name — not all of them.
          // This prevents race conditions when multiple tools with the same name
          // (e.g., two web_search calls) run in parallel.
          let matched = false
          const toolCalls = (m.toolCalls ?? []).map((tc) => {
            if (matched || tc.name !== name || tc.status !== 'running') return tc
            matched = true
            return { ...tc, input, result, status: 'done' as const }
          })
          return { ...m, toolCalls }
        })
      )
    }
    return { onToolCall, onToolResult }
  }, [setMessages, updateStatusLabel]) // setStatus, setActiveToolName are stable useState setters

  // Phase 9: attach/update a TaskPlan on the assistant message as plan_* events arrive.
  const makePlanCallbacks = useCallback((assistantId: string) => {
    const onPlanCreated: Parameters<typeof runCopilotTurnBackend>[3]['onPlanCreated'] = (plan) => {
      // New plan — reset the running-step ref so no stale step id leaks from
      // a previous turn.
      currentStepIdRef.current = null
      updateStatusLabel(assistantId, 'Planejando execução...')
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, plan } : m)),
      )
    }
    const onPlanStepUpdate: Parameters<typeof runCopilotTurnBackend>[3]['onPlanStepUpdate'] = (update) => {
      // Phase 9 UX: track the running step so subsequent tool calls get tagged
      // with its id. DO NOT clear on 'done' — the last plan step is marked
      // done as soon as the first token arrives (backend optimization), but
      // the agent may keep firing tool_call / tool_result events afterwards
      // via its multi-round loop. Those should still be attributed to the
      // same step, not leak into an "orphan" list below the card.
      if (update.status === 'running') currentStepIdRef.current = update.stepId
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId || !m.plan) return m
          const steps = m.plan.steps.map((s) =>
            s.id === update.stepId
              ? { ...s, status: update.status, result: update.result ?? s.result, error: update.error ?? s.error }
              : s,
          )
          return { ...m, plan: { ...m.plan, steps } }
        }),
      )
    }
    return { onPlanCreated, onPlanStepUpdate }
  }, [setMessages, updateStatusLabel])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    if (toolTimeoutRef.current) { clearTimeout(toolTimeoutRef.current); toolTimeoutRef.current = null }
    if (tokenFlushTimerRef.current) { clearTimeout(tokenFlushTimerRef.current); tokenFlushTimerRef.current = null }
    tokenBufferRef.current = ''
    setStatus('idle')
    setActiveToolName(null)
    setActiveAgentLabel(null)
  }, [])

  const sendMessage = useCallback(
    async (text: string, attachments?: CopilotAttachment[], opts?: { slidePreset?: string }) => {
      if (!user || status !== 'idle') return

      setError(null)
      abortRef.current = new AbortController()

      const userMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        attachments: attachments?.length ? attachments : undefined,
        timestamp: new Date(),
      }

      const assistantId = crypto.randomUUID()
      currentAssistantIdRef.current = assistantId
      const assistantMsg: CopilotMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        toolCalls: [],
        isStreaming: true,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStatus('streaming')

      // Read KB and Hub — cached in memory for 30s
      const now = Date.now()
      const cached = kbCacheRef.current
      let kb: ReturnType<typeof loadKB>
      let hub: ReturnType<typeof loadHub>
      if (cached && cached.tenantId === user.tenantId && now - cached.ts < 30_000) {
        kb = cached.kb
        hub = cached.hub
      } else {
        kb = loadKB(user.tenantId)
        hub = await loadHubAsync(user.tenantId)
        kbCacheRef.current = { tenantId: user.tenantId, kb, hub, ts: now }
      }

      const historySnapshot = messages

      // KB PDF documents as attachments
      const kbPdfAtts: CopilotAttachment[] = kb.documents
        .filter((d) => d.kind === 'pdf' && d.content)
        .map((d) => ({
          id: `kb_${d.id}`,
          name: d.name,
          kind: 'pdf' as const,
          mediaType: 'application/pdf' as const,
          data: d.content,
          previewUrl: '',
        }))
      const mergedAttachments = [...kbPdfAtts, ...(attachments ?? [])]

      const { onToolCall, onToolResult } = makeToolCallbacks(assistantId)
      const { onPlanCreated, onPlanStepUpdate } = makePlanCallbacks(assistantId)

      try {
        const pageContext = { currentPage: '/' + location.pathname.split('/')[1] }
        const gen = runCopilotTurnBackend(
          text, historySnapshot, pageContext,
          { onToolCall, onToolResult,
            onAgentStart: (agentId, _intent) => {
              const label = AGENT_LABELS[agentId] ?? 'Processando...'
              setActiveAgentLabel(label)
              updateStatusLabel(assistantId, label)
            },
            onApprovalRequest: handleApprovalRequest,
            onSetupRequired: handleSetupRequired,
            onPlanCreated, onPlanStepUpdate,
          },
          abortRef.current.signal, mergedAttachments,
          undefined, sessionId,
        )

        // Buffered token flushing — reduces re-renders from ~50/sec to ~7/sec
        const flushTokens = () => {
          const buf = tokenBufferRef.current
          if (!buf) return
          tokenBufferRef.current = ''
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + buf } : m
            )
          )
        }

        for await (const token of gen) {
          tokenBufferRef.current += token
          if (!tokenFlushTimerRef.current) {
            tokenFlushTimerRef.current = setTimeout(() => {
              tokenFlushTimerRef.current = null
              flushTokens()
            }, 150)
          }
        }

        // Final flush — ensure no tokens are lost
        if (tokenFlushTimerRef.current) { clearTimeout(tokenFlushTimerRef.current); tokenFlushTimerRef.current = null }
        flushTokens()

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        )
        setStatus('idle')
        setActiveToolName(null)
        setActiveAgentLabel(null)
      } catch (err: unknown) {
        const errName = (err as { name?: string })?.name ?? ''
        const errMsg  = (err as { message?: string })?.message ?? ''
        const isAbort = errName === 'AbortError' || errName === 'APIUserAbortError' || errMsg.toLowerCase().includes('abort')
        if (isAbort) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          )
          setStatus('idle')
          return
        }

        // Rate-limit error thrown before streaming: remove the empty assistant
        // placeholder and surface the error cleanly without a broken bubble.
        const isRateLimit =
          (err as { status?: number })?.status === 429 ||
          errMsg.toLowerCase().includes('muitas mensagens')
        if (isRateLimit) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId))
          setError(errMsg || 'Muitas mensagens em pouco tempo. Aguarde antes de enviar novamente.')
          setStatus('error')
          setActiveToolName(null)
          setActiveAgentLabel(null)
          return
        }

        const msg = parseCopilotError(err)
        setError(msg)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || '(erro na resposta)', isStreaming: false }
              : m
          )
        )
        setStatus('error')
        setActiveToolName(null)
        setActiveAgentLabel(null)
      }
    },
    [user, status, messages, stages, fieldDefs, location.pathname, setMessages, tools, handleApprovalRequest, makeToolCallbacks, sessionId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const rerunFromMessage = useCallback(
    async (userMsg: CopilotMessage, historyBefore: CopilotMessage[]) => {
      if (!user || status !== 'idle') return

      setError(null)
      abortRef.current = new AbortController()

      const assistantId = crypto.randomUUID()
      currentAssistantIdRef.current = assistantId
      const assistantMsg: CopilotMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        toolCalls: [],
        isStreaming: true,
        timestamp: new Date(),
      }

      setMessages([...historyBefore, userMsg, assistantMsg])
      setStatus('streaming')

      const kb  = user ? loadKB(user.tenantId)  : DEFAULT_KB
      const hub = user ? loadHub(user.tenantId) : null

      const kbPdfAtts: CopilotAttachment[] = kb.documents
        .filter((d) => d.kind === 'pdf' && d.content)
        .map((d) => ({
          id: `kb_${d.id}`,
          name: d.name,
          kind: 'pdf' as const,
          mediaType: 'application/pdf' as const,
          data: d.content,
          previewUrl: '',
        }))
      const mergedAttachments = [...kbPdfAtts, ...(userMsg.attachments ?? [])]

      const { onToolCall, onToolResult } = makeToolCallbacks(assistantId)
      const { onPlanCreated, onPlanStepUpdate } = makePlanCallbacks(assistantId)

      try {
        const pageContext = { currentPage: '/' + location.pathname.split('/')[1] }
        const gen = runCopilotTurnBackend(
          userMsg.content, historyBefore, pageContext,
          { onToolCall, onToolResult,
            onAgentStart: (agentId, _intent) => {
              const label = AGENT_LABELS[agentId] ?? 'Processando...'
              setActiveAgentLabel(label)
              updateStatusLabel(assistantId, label)
            },
            onApprovalRequest: handleApprovalRequest,
            onSetupRequired: handleSetupRequired,
            onPlanCreated, onPlanStepUpdate,
          },
          abortRef.current.signal, mergedAttachments,
          undefined, sessionId,
        )

        const flushTokens2 = () => {
          const buf = tokenBufferRef.current
          if (!buf) return
          tokenBufferRef.current = ''
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: m.content + buf } : m)
          )
        }

        for await (const token of gen) {
          tokenBufferRef.current += token
          if (!tokenFlushTimerRef.current) {
            tokenFlushTimerRef.current = setTimeout(() => {
              tokenFlushTimerRef.current = null
              flushTokens2()
            }, 150)
          }
        }

        if (tokenFlushTimerRef.current) { clearTimeout(tokenFlushTimerRef.current); tokenFlushTimerRef.current = null }
        flushTokens2()

        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m)
        )
        setStatus('idle')
        setActiveToolName(null)
        setActiveAgentLabel(null)
      } catch (err: unknown) {
        const errName = (err as { name?: string })?.name ?? ''
        const errMsg  = (err as { message?: string })?.message ?? ''
        const isAbort = errName === 'AbortError' || errName === 'APIUserAbortError' || errMsg.toLowerCase().includes('abort')
        if (isAbort) {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m)
          )
          setStatus('idle')
          return
        }
        const isRateLimit =
          (err as { status?: number })?.status === 429 ||
          errMsg.toLowerCase().includes('muitas mensagens')
        if (isRateLimit) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId))
          setError(errMsg || 'Muitas mensagens em pouco tempo. Aguarde antes de enviar novamente.')
          setStatus('error')
          setActiveToolName(null)
          setActiveAgentLabel(null)
          return
        }
        const msg = parseCopilotError(err)
        setError(msg)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || '(erro na resposta)', isStreaming: false }
              : m
          )
        )
        setStatus('error')
        setActiveToolName(null)
        setActiveAgentLabel(null)
      }
    },
    [user, status, stages, fieldDefs, location.pathname, setMessages, tools, handleApprovalRequest, makeToolCallbacks, sessionId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Cleanup timers and abort on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (toolTimeoutRef.current) { clearTimeout(toolTimeoutRef.current); toolTimeoutRef.current = null }
      if (tokenFlushTimerRef.current) { clearTimeout(tokenFlushTimerRef.current); tokenFlushTimerRef.current = null }
      abortRef.current?.abort()
    }
  }, [])

  return { status, activeToolName, activeAgentLabel, error, sendMessage, rerunFromMessage, abort, resolveBatch }
}
