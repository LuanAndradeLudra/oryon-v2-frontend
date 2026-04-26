// ─── Agent Builder Approval Previews ────────────────────────────────────────
// Custom preview components for the 27+ tools in src/tools/agentBuilderTools.ts
// Without these, all of them fell into the generic fallback which renders
// every field as a tiny 1-line <input>, making it impossible to review a
// multi-KB system prompt or a handoff rule JSON in the approval card.
//
// Every preview accepts the same shape — { input, onChange } — so it can be
// wired into the existing ApprovalItemPreview dispatcher in CopilotMessage.tsx
// without any refactor of the existing card infrastructure.

import { useEffect, useRef, useState } from 'react'
import { Maximize2, X, AlertTriangle, Sparkles, Search, Replace } from 'lucide-react'
import { createPortal } from 'react-dom'
import { getAgentServerAuth } from '@/services/copilotServiceBackend'

// ─── Shared utility: ExpandableTextarea ────────────────────────────────────
// Auto-grows with content (min 6 rows, max 20 rows inline). A button in the
// corner opens a full-screen modal editor for long prompts — this is the
// piece that was missing for `systemPrompt`, `content`, `body`, etc.

interface ExpandableTextareaProps {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  minRows?: number
  maxRows?: number
  monospace?: boolean
  /** Tools like append_* show a different banner than full update_* */
  helperText?: string
}

export function ExpandableTextarea({
  label, value, onChange, placeholder,
  minRows = 6, maxRows = 20,
  monospace = false,
  helperText,
}: ExpandableTextareaProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize when value changes (inline mode only — modal has fixed size)
  useEffect(() => {
    if (isExpanded) return
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const lineHeight = 16 // ~1rem at text-xs
    const minHeight = minRows * lineHeight + 16 // + padding
    const maxHeight = maxRows * lineHeight + 16
    ta.style.height = `${Math.max(minHeight, Math.min(maxHeight, ta.scrollHeight))}px`
  }, [value, isExpanded, minRows, maxRows])

  const fontClass = monospace
    ? 'font-mono text-[11px] leading-snug'
    : 'text-xs leading-relaxed'

  const charCount = value.length

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-surface-500">{charCount.toLocaleString('pt-BR')} chars</span>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center gap-1 text-[10px] text-surface-400 hover:text-brand-300 transition-colors"
            aria-label="Abrir editor em tela cheia"
          >
            <Maximize2 className="h-3 w-3" />
            Expandir
          </button>
        </div>
      </div>
      {helperText && (
        <p className="text-[10px] text-surface-500 italic">{helperText}</p>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={minRows}
        className={`w-full px-2.5 py-2 rounded-lg border border-surface-700/60 bg-surface-800/60 text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 resize-none overflow-auto ${fontClass}`}
        style={{ minHeight: `${minRows * 16 + 16}px`, maxHeight: `${maxRows * 16 + 16}px` }}
      />
      {isExpanded && createPortal(
        <ExpandedEditorModal
          label={label}
          value={value}
          onChange={onChange}
          onClose={() => setIsExpanded(false)}
          placeholder={placeholder}
          monospace={monospace}
        />,
        document.body,
      )}
    </div>
  )
}

function ExpandedEditorModal({
  label, value, onChange, onClose, placeholder, monospace,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  onClose: () => void
  placeholder?: string
  monospace?: boolean
}) {
  // ESC closes the modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const fontClass = monospace
    ? 'font-mono text-[13px] leading-relaxed'
    : 'text-sm leading-relaxed'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex h-[88vh] w-[min(96vw,1100px)] flex-col overflow-hidden rounded-2xl border border-surface-700/60 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-5 py-3">
          <h3 className="text-sm font-medium text-surface-100">{label}</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-surface-400">
              {value.length.toLocaleString('pt-BR')} caracteres
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-100"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className={`flex-1 resize-none bg-surface-900 px-6 py-4 text-surface-100 placeholder:text-surface-600 focus:outline-none ${fontClass}`}
        />
        <div className="flex items-center justify-between border-t border-surface-800 px-5 py-2.5 text-[11px] text-surface-500">
          <span>Esc para fechar. As alterações já estão salvas no card.</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-500/10 px-3 py-1 text-brand-300 hover:bg-brand-500/20"
          >
            Pronto
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared utility: MatchCountHint (for replace_* tools) ──────────────────
// Async-fetches the current prompt/doc and counts how many times the `find`
// string appears. Helps the operator catch a too-broad find before approving.

export function MatchCountHint({
  find,
  currentText,
  loading,
  replaceAll,
}: {
  find: string
  currentText: string | null
  loading: boolean
  replaceAll: boolean
}) {
  if (loading) {
    return <p className="text-[10px] text-surface-500 italic">Buscando conteúdo atual...</p>
  }
  if (currentText === null) {
    return null // not fetched yet or failed silently
  }
  if (!find) {
    return <p className="text-[10px] text-surface-500 italic">Preencha o campo &quot;Buscar&quot; para ver quantas ocorrências casam.</p>
  }
  // Count occurrences in the current text
  const count = currentText.split(find).length - 1
  if (count === 0) {
    return (
      <p className="text-[10px] flex items-center gap-1 text-red-400">
        <AlertTriangle className="h-3 w-3" />
        <span><strong>0 ocorrências</strong> encontradas — a tool vai falhar. Verifique pontuação/acentos exatos.</span>
      </p>
    )
  }
  if (count === 1) {
    return (
      <p className="text-[10px] flex items-center gap-1 text-emerald-400">
        <Sparkles className="h-3 w-3" />
        <span><strong>1 ocorrência</strong> encontrada — substituição segura.</span>
      </p>
    )
  }
  // Multiple matches
  if (replaceAll) {
    return (
      <p className="text-[10px] flex items-center gap-1 text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        <span><strong>{count} ocorrências</strong> — todas serão substituídas (replaceAll).</span>
      </p>
    )
  }
  return (
    <p className="text-[10px] flex items-center gap-1 text-red-400">
      <AlertTriangle className="h-3 w-3" />
      <span><strong>{count} ocorrências</strong> — a tool vai falhar sem replaceAll. Use find mais específico OU ative replaceAll.</span>
    </p>
  )
}

// ─── DiffContextPreview ─────────────────────────────────────────────────────
// For replace_in_* previews. When find has exactly 1 match (or ≥1 with
// replaceAll), renders a before/after context window showing ~80 chars of
// surrounding text with the matched segment highlighted in red (before) and
// the replacement in green (after). Keeps the visual noise low by truncating
// lines and showing only the first match — multi-match cases just show
// "N matches" above; the context itself is the first occurrence.

const CONTEXT_CHARS = 80

interface DiffContextPreviewProps {
  find: string
  replace: string
  currentText: string | null
}

export function DiffContextPreview({ find, replace, currentText }: DiffContextPreviewProps) {
  if (!currentText || !find) return null
  const idx = currentText.indexOf(find)
  if (idx < 0) return null

  const beforeStart = Math.max(0, idx - CONTEXT_CHARS)
  const afterEnd   = Math.min(currentText.length, idx + find.length + CONTEXT_CHARS)
  const leading    = currentText.slice(beforeStart, idx)
  const trailing   = currentText.slice(idx + find.length, afterEnd)
  const truncBefore = beforeStart > 0
  const truncAfter  = afterEnd < currentText.length

  return (
    <div className="mt-2 space-y-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-surface-500">
        Pré-visualização (primeira ocorrência)
      </div>
      {/* BEFORE — red-highlighted find */}
      <div className="rounded-md border border-red-500/20 bg-red-500/5 px-2.5 py-1.5">
        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-red-400">antes</div>
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-surface-300">
{truncBefore ? '… ' : ''}{leading}<span className="rounded bg-red-500/30 px-0.5 text-red-100 line-through decoration-red-400/70">{find}</span>{trailing}{truncAfter ? ' …' : ''}
        </pre>
      </div>
      {/* AFTER — green-highlighted replace */}
      <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5">
        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">depois</div>
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-surface-300">
{truncBefore ? '… ' : ''}{leading}<span className="rounded bg-emerald-500/30 px-0.5 text-emerald-100">{replace || <span className="italic text-emerald-400/70">(vazio)</span>}</span>{trailing}{truncAfter ? ' …' : ''}
        </pre>
      </div>
    </div>
  )
}

// ─── Shared utility: fetch current agent state ──────────────────────────────

interface AgentStateFetcherResult {
  currentText: string | null
  loading: boolean
}

/**
 * Fetches the current system prompt (or KB doc content) of a target agent.
 * Used by replace_* previews to provide live match count + future diff.
 * Auth is resolved on the fly via getAgentServerAuth() — no prop drilling.
 * No-op when the needed IDs aren't on the input yet.
 */
export function useAgentStateFetch(opts: {
  agentId?: string
  docId?: string
  field: 'system_prompt' | 'kb_doc'
  /** When false, skip the fetch entirely (e.g. for add/append where we
   *  don't need the current state to compute match counts). */
  enabled?: boolean
}): AgentStateFetcherResult {
  const { agentId, docId, field, enabled = true } = opts
  const [result, setResult] = useState<AgentStateFetcherResult>({ currentText: null, loading: false })

  useEffect(() => {
    if (!enabled) return
    if (!agentId) return
    if (field === 'kb_doc' && !docId) return
    let cancelled = false
    setResult({ currentText: null, loading: true })

    getAgentServerAuth()
      .then(({ token, baseUrl }) => {
        const url = field === 'system_prompt'
          ? `${baseUrl}/agents/builder/configs/${agentId}`
          : `${baseUrl}/agents/builder/configs/${agentId}/knowledge/${docId}`
        return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled) return
        if (!data) { setResult({ currentText: null, loading: false }); return }
        const payload = (data as { data?: Record<string, unknown> }).data ?? data
        const text = field === 'system_prompt'
          ? String((payload as Record<string, unknown>).system_prompt ?? '')
          : String((payload as Record<string, unknown>).content ?? '')
        setResult({ currentText: text, loading: false })
      })
      .catch(() => { if (!cancelled) setResult({ currentText: null, loading: false }) })

    return () => { cancelled = true }
  }, [agentId, docId, field, enabled])

  return result
}

// ─── Common props ──────────────────────────────────────────────────────────

interface ApprovalPreviewProps {
  toolName: string
  input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}

// ─── 1. System Prompt preview (append / replace / update) ──────────────────

export function SystemPromptApprovalPreview({
  toolName, input, onChange, auth,
}: ApprovalPreviewProps) {
  const isAppend  = toolName === 'append_to_agent_system_prompt'
  const isReplace = toolName === 'replace_in_agent_system_prompt'
  const isUpdate  = toolName === 'update_agent_system_prompt'

  const agentId = String(input.agentId ?? '')
  const fetched = useAgentStateFetch({
    agentId,
    field: 'system_prompt',
    token: auth?.token ?? null,
    baseUrl: auth?.baseUrl ?? '',
  })

  return (
    <div className="space-y-3">
      {/* Agent reference */}
      <div className="rounded-lg border border-surface-800 bg-surface-900/50 px-3 py-2">
        <div className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Agente alvo</div>
        <div className="font-mono text-xs text-surface-300">{agentId || '—'}</div>
      </div>

      {/* Variant-specific body */}
      {isAppend && (
        <ExpandableTextarea
          label="Seção a adicionar ao final do prompt"
          value={String(input.section ?? '')}
          onChange={(v) => onChange('section', v)}
          placeholder="## 🚫 NOVA SEÇÃO...&#10;&#10;O que você quer acrescentar ao prompt atual."
          minRows={8} maxRows={22}
          helperText="O conteúdo será adicionado ao FINAL do system prompt atual. O resto fica intacto."
        />
      )}

      {isReplace && (
        <div className="space-y-2.5">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-surface-500">
              <Search className="h-3 w-3" /> Buscar (texto EXATO)
            </div>
            <textarea
              value={String(input.find ?? '')}
              onChange={(e) => onChange('find', e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-2 font-mono text-[11px] leading-snug text-surface-200 placeholder:text-surface-600 focus:border-brand-500/50 focus:outline-none resize-none"
              placeholder="Trecho exato a procurar no prompt atual (case-sensitive)"
            />
            <MatchCountHint
              find={String(input.find ?? '')}
              currentText={fetched.currentText}
              loading={fetched.loading}
              replaceAll={input.replaceAll === true || input.replaceAll === 'true'}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-surface-500">
              <Replace className="h-3 w-3" /> Substituir por
            </div>
            <textarea
              value={String(input.replace ?? '')}
              onChange={(e) => onChange('replace', e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-2 font-mono text-[11px] leading-snug text-surface-200 placeholder:text-surface-600 focus:border-brand-500/50 focus:outline-none resize-none"
              placeholder="Texto que substitui o trecho acima"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={input.replaceAll === true || input.replaceAll === 'true'}
              onChange={(e) => onChange('replaceAll', String(e.target.checked))}
              className="h-3.5 w-3.5 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/30"
            />
            <span className="text-xs text-surface-300">Substituir <strong>todas</strong> as ocorrências</span>
          </label>

          <DiffContextPreview
            find={String(input.find ?? '')}
            replace={String(input.replace ?? '')}
            currentText={fetched.currentText}
          />
        </div>
      )}

      {isUpdate && (
        <div className="space-y-2.5">
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <strong>Reescrita TOTAL do system prompt.</strong> O conteúdo anterior será substituído inteiramente.
              Se o objetivo é só adicionar/alterar um trecho, peça para o copiloto usar
              <code className="mx-1 rounded bg-red-500/20 px-1 py-0.5">append_*</code>
              ou
              <code className="mx-1 rounded bg-red-500/20 px-1 py-0.5">replace_in_*</code>.
            </div>
          </div>
          <ExpandableTextarea
            label="Novo system prompt (texto completo)"
            value={String(input.systemPrompt ?? '')}
            onChange={(v) => onChange('systemPrompt', v)}
            minRows={10} maxRows={24}
            placeholder="Texto completo que substitui o prompt atual."
          />
        </div>
      )}
    </div>
  )
}

// ─── 2. Knowledge Doc preview (add / append / replace / update) ────────────

export function KnowledgeDocApprovalPreview({
  toolName, input, onChange, auth,
}: ApprovalPreviewProps) {
  const isAdd     = toolName === 'add_agent_knowledge_doc'
  const isAppend  = toolName === 'append_to_agent_knowledge_doc'
  const isReplace = toolName === 'replace_in_agent_knowledge_doc'
  const isUpdate  = toolName === 'update_agent_knowledge_doc'

  const agentId = String(input.agentId ?? '')
  const docId   = String(input.docId ?? '')
  const fetched = useAgentStateFetch({
    agentId, docId,
    field: 'kb_doc',
    token: auth?.token ?? null,
    baseUrl: auth?.baseUrl ?? '',
  })

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-surface-800 bg-surface-900/50 px-3 py-2">
        <div className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Agente alvo</div>
        <div className="font-mono text-xs text-surface-300">{agentId || '—'}</div>
        {docId && (
          <>
            <div className="mt-1.5 text-[10px] font-medium text-surface-500 uppercase tracking-wider">Documento</div>
            <div className="font-mono text-xs text-surface-300">{docId}</div>
          </>
        )}
      </div>

      {isAdd && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Nome do documento</label>
              <input
                type="text"
                value={String(input.documentName ?? '')}
                onChange={(e) => onChange('documentName', e.target.value)}
                className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
                placeholder="Ex: Política de devolução"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Tipo</label>
              <select
                value={String(input.sourceType ?? 'text')}
                onChange={(e) => onChange('sourceType', e.target.value)}
                className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="text">Texto</option>
                <option value="pdf">PDF</option>
                <option value="url">URL</option>
                <option value="file">Arquivo</option>
              </select>
            </div>
          </div>
          <ExpandableTextarea
            label="Conteúdo do documento"
            value={String(input.content ?? '')}
            onChange={(v) => onChange('content', v)}
            minRows={10} maxRows={24}
            placeholder="Conteúdo que será indexado no RAG do agente."
          />
        </>
      )}

      {isAppend && (
        <ExpandableTextarea
          label="Conteúdo a acrescentar ao documento"
          value={String(input.appendContent ?? '')}
          onChange={(v) => onChange('appendContent', v)}
          minRows={8} maxRows={22}
          helperText="O texto será adicionado ao FINAL do documento. O resto fica intacto. Os chunks do RAG serão re-indexados."
        />
      )}

      {isReplace && (
        <div className="space-y-2.5">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-surface-500">
              <Search className="h-3 w-3" /> Buscar no documento
            </div>
            <textarea
              value={String(input.find ?? '')}
              onChange={(e) => onChange('find', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-2 font-mono text-[11px] leading-snug text-surface-200 placeholder:text-surface-600 focus:border-brand-500/50 focus:outline-none resize-none"
            />
            <MatchCountHint
              find={String(input.find ?? '')}
              currentText={fetched.currentText}
              loading={fetched.loading}
              replaceAll={input.replaceAll === true || input.replaceAll === 'true'}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-surface-500">
              <Replace className="h-3 w-3" /> Substituir por
            </div>
            <textarea
              value={String(input.replace ?? '')}
              onChange={(e) => onChange('replace', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-2 font-mono text-[11px] leading-snug text-surface-200 placeholder:text-surface-600 focus:border-brand-500/50 focus:outline-none resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={input.replaceAll === true || input.replaceAll === 'true'}
              onChange={(e) => onChange('replaceAll', String(e.target.checked))}
              className="h-3.5 w-3.5 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/30"
            />
            <span className="text-xs text-surface-300">Substituir <strong>todas</strong> as ocorrências</span>
          </label>

          <DiffContextPreview
            find={String(input.find ?? '')}
            replace={String(input.replace ?? '')}
            currentText={fetched.currentText}
          />
        </div>
      )}

      {isUpdate && (
        <div className="space-y-2.5">
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <strong>Reescrita TOTAL do documento.</strong> O conteúdo anterior será substituído e o RAG re-indexado.
            </div>
          </div>
          <ExpandableTextarea
            label="Novo conteúdo (texto completo)"
            value={String(input.content ?? '')}
            onChange={(v) => onChange('content', v)}
            minRows={10} maxRows={24}
          />
        </div>
      )}
    </div>
  )
}

// ─── 3. Handoff Rule preview (add / remove) ─────────────────────────────────

const HANDOFF_ACTIONS = [
  { value: 'human_handoff',    label: 'Transferir para humano' },
  { value: 'auto_reply',       label: 'Resposta automática' },
  { value: 'external_redirect',label: 'Redirecionar (link)' },
]

const HANDOFF_MATCH_MODES = [
  { value: 'any_keyword',  label: 'Qualquer palavra-chave' },
  { value: 'all_keywords', label: 'Todas as palavras' },
  { value: 'exact',        label: 'Frase exata' },
]

export function HandoffRuleApprovalPreview({
  toolName, input, onChange,
}: ApprovalPreviewProps) {
  const isAdd    = toolName === 'add_agent_handoff_rule'
  const isRemove = toolName === 'remove_agent_handoff_rule'

  const agentId = String(input.agentId ?? '')

  if (isRemove) {
    return (
      <div className="space-y-2.5">
        <div className="rounded-lg border border-surface-800 bg-surface-900/50 px-3 py-2">
          <div className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Agente</div>
          <div className="font-mono text-xs text-surface-300">{agentId || '—'}</div>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>Remover uma regra de handoff do agente. Esta ação <strong>não pode ser desfeita</strong>.</div>
        </div>
        {input.ruleName !== undefined && (
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Nome da regra a remover</label>
            <input
              type="text"
              value={String(input.ruleName ?? '')}
              onChange={(e) => onChange('ruleName', e.target.value)}
              className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
            />
          </div>
        )}
        {input.ruleIndex !== undefined && (
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Índice da regra (0-based)</label>
            <input
              type="number"
              value={String(input.ruleIndex ?? '')}
              onChange={(e) => onChange('ruleIndex', e.target.value)}
              className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
            />
          </div>
        )}
      </div>
    )
  }

  // add_agent_handoff_rule
  const rule = (input.rule ?? {}) as Record<string, unknown>
  const keywords = Array.isArray(rule.keywords)
    ? (rule.keywords as unknown[]).map(String).join(', ')
    : String(rule.keywords ?? '')

  const updateRule = (key: string, val: unknown) => {
    const next = { ...rule, [key]: val }
    onChange('rule', JSON.stringify(next))
  }

  return (
    <div className="space-y-2.5">
      <div className="rounded-lg border border-surface-800 bg-surface-900/50 px-3 py-2">
        <div className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Agente</div>
        <div className="font-mono text-xs text-surface-300">{agentId || '—'}</div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Nome da regra</label>
        <input
          type="text"
          value={String(rule.name ?? '')}
          onChange={(e) => updateRule('name', e.target.value)}
          className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
          placeholder="Ex: Pedido de cancelamento"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">
          Palavras-chave (separadas por vírgula)
        </label>
        <textarea
          value={keywords}
          onChange={(e) => {
            const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            updateRule('keywords', arr)
          }}
          rows={2}
          className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none resize-none"
          placeholder="cancelar, cancelamento, desistir, desistência"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Modo</label>
          <select
            value={String(rule.matchMode ?? 'any_keyword')}
            onChange={(e) => updateRule('matchMode', e.target.value)}
            className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none appearance-none cursor-pointer"
          >
            {HANDOFF_MATCH_MODES.map((m) => (
              <option key={m.value} value={m.value} className="bg-surface-900">{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Ação</label>
          <select
            value={String(rule.action ?? 'human_handoff')}
            onChange={(e) => updateRule('action', e.target.value)}
            className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none appearance-none cursor-pointer"
          >
            {HANDOFF_ACTIONS.map((a) => (
              <option key={a.value} value={a.value} className="bg-surface-900">{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">
          Template de resposta (opcional)
        </label>
        <textarea
          value={String(rule.template ?? '')}
          onChange={(e) => updateRule('template', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none resize-none"
          placeholder="Mensagem mostrada ao cliente quando a regra casa."
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">
          Departamento (opcional)
        </label>
        <input
          type="text"
          value={String(rule.department ?? '')}
          onChange={(e) => updateRule('department', e.target.value)}
          className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
          placeholder="Ex: vendas, suporte, financeiro"
        />
      </div>
    </div>
  )
}

// ─── 4. Agent Config preview (create / set_status / metadata) ──────────────

const AGENT_STATUSES = [
  { value: 'draft',  label: 'Rascunho (não atende)' },
  { value: 'active', label: 'Ativo (atende WhatsApp)' },
  { value: 'paused', label: 'Pausado' },
]

export function AgentConfigApprovalPreview({
  toolName, input, onChange,
}: ApprovalPreviewProps) {
  const isCreate   = toolName === 'create_agent'
  const isStatus   = toolName === 'set_agent_status'
  const isMetadata = toolName === 'update_agent_metadata'

  return (
    <div className="space-y-2.5">
      {!isCreate && (
        <div className="rounded-lg border border-surface-800 bg-surface-900/50 px-3 py-2">
          <div className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Agente</div>
          <div className="font-mono text-xs text-surface-300">{String(input.agentId ?? '—')}</div>
        </div>
      )}

      {(isCreate || isMetadata) && (
        <>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Nome</label>
            <input
              type="text"
              value={String(input.name ?? '')}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
              placeholder="Ex: SDR Vendas, Suporte Técnico"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Setor</label>
              <input
                type="text"
                value={String(input.sector ?? '')}
                onChange={(e) => onChange('sector', e.target.value)}
                className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
                placeholder="saúde, varejo..."
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Ícone</label>
              <input
                type="text"
                value={String(input.icon ?? 'bot')}
                onChange={(e) => onChange('icon', e.target.value)}
                className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Objetivo</label>
            <textarea
              value={String(input.objective ?? '')}
              onChange={(e) => onChange('objective', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none resize-none"
              placeholder="Ex: qualificar leads e agendar demos"
            />
          </div>
        </>
      )}

      {isStatus && (
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Novo status</label>
          <select
            value={String(input.status ?? 'draft')}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none appearance-none cursor-pointer"
          >
            {AGENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value} className="bg-surface-900">{s.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

// ─── 5. FAQ preview (create / update) ──────────────────────────────────────

export function AgentFaqApprovalPreview({
  toolName: _toolName, input, onChange,
}: ApprovalPreviewProps) {
  const keywords = Array.isArray(input.keywords)
    ? (input.keywords as unknown[]).map(String).join(', ')
    : String(input.keywords ?? '')

  return (
    <div className="space-y-2.5">
      <div className="rounded-lg border border-surface-800 bg-surface-900/50 px-3 py-2">
        <div className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Agente</div>
        <div className="font-mono text-xs text-surface-300">{String(input.agentId ?? '—')}</div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Nome da FAQ</label>
        <input
          type="text"
          value={String(input.name ?? '')}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Palavras-chave</label>
        <textarea
          value={keywords}
          onChange={(e) => {
            const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            onChange('keywords', JSON.stringify(arr))
          }}
          rows={2}
          className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none resize-none"
          placeholder="preço, valor, custo, quanto custa"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Modo</label>
          <select
            value={String(input.matchMode ?? 'any_keyword')}
            onChange={(e) => onChange('matchMode', e.target.value)}
            className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none appearance-none cursor-pointer"
          >
            {HANDOFF_MATCH_MODES.map((m) => (
              <option key={m.value} value={m.value} className="bg-surface-900">{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Prioridade</label>
          <input
            type="number"
            value={String(input.priority ?? '0')}
            onChange={(e) => onChange('priority', e.target.value)}
            className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
          />
        </div>
      </div>
      <ExpandableTextarea
        label="Template de resposta"
        value={String(input.responseTemplate ?? '')}
        onChange={(v) => onChange('responseTemplate', v)}
        minRows={4} maxRows={14}
        placeholder="Resposta fixa — suporta {{nome}}, {{empresa}}..."
      />
    </div>
  )
}

// ─── 6. Agent Tool (HTTP) preview (create / update) ─────────────────────────

export function AgentToolHttpApprovalPreview({
  toolName: _toolName, input, onChange,
}: ApprovalPreviewProps) {
  return (
    <div className="space-y-2.5">
      <div className="rounded-lg border border-surface-800 bg-surface-900/50 px-3 py-2">
        <div className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Agente</div>
        <div className="font-mono text-xs text-surface-300">{String(input.agentId ?? '—')}</div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Nome</label>
          <input
            type="text"
            value={String(input.name ?? '')}
            onChange={(e) => onChange('name', e.target.value)}
            className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Método</label>
          <select
            value={String(input.method ?? 'GET')}
            onChange={(e) => onChange('method', e.target.value)}
            className="rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none appearance-none cursor-pointer"
          >
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
              <option key={m} value={m} className="bg-surface-900">{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">URL</label>
        <input
          type="text"
          value={String(input.url ?? '')}
          onChange={(e) => onChange('url', e.target.value)}
          className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 font-mono text-[11px] text-surface-200 focus:border-brand-500/50 focus:outline-none"
          placeholder="https://api.exemplo.com/endpoint"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">Descrição (o que o LLM chama isso)</label>
        <textarea
          value={String(input.description ?? '')}
          onChange={(e) => onChange('description', e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none resize-none"
        />
      </div>
    </div>
  )
}

// ─── 7. Company Brain / KB preview ─────────────────────────────────────────

export function CompanyBrainApprovalPreview({
  toolName, input, onChange,
}: ApprovalPreviewProps) {
  const isBrain = toolName === 'update_company_brain'
  const isKb    = toolName === 'update_company_knowledge_base'

  return (
    <div className="space-y-2.5">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
        Esta alteração afeta <strong>TODOS os agentes</strong> do tenant.
      </div>

      {isBrain && (
        <>
          {[
            ['companyName', 'Nome da empresa'],
            ['industry', 'Setor'],
            ['description', 'Descrição'],
            ['productsServices', 'Produtos/Serviços'],
            ['website', 'Site'],
          ].map(([key, label]) => (
            input[key as string] !== undefined ? (
              <div key={key as string}>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-500">{label}</label>
                {(key === 'description' || key === 'productsServices') ? (
                  <textarea
                    value={String(input[key as string] ?? '')}
                    onChange={(e) => onChange(key as string, e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(input[key as string] ?? '')}
                    onChange={(e) => onChange(key as string, e.target.value)}
                    className="w-full rounded-lg border border-surface-700/60 bg-surface-800/60 px-2.5 py-1.5 text-xs text-surface-200 focus:border-brand-500/50 focus:outline-none"
                  />
                )}
              </div>
            ) : null
          ))}
        </>
      )}

      {isKb && (
        <>
          <ExpandableTextarea
            label="Instruções gerais de atendimento"
            value={String(input.instructions ?? '')}
            onChange={(v) => onChange('instructions', v)}
            minRows={6} maxRows={20}
          />
          {input.documents !== undefined && (
            <div className="rounded-lg border border-surface-800 bg-surface-900/40 px-3 py-2 text-[11px] text-surface-400">
              {Array.isArray(input.documents) ? `${(input.documents as unknown[]).length} documento(s) na payload` : 'documents incluído'}
            </div>
          )}
        </>
      )}
    </div>
  )
}
