import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'
import { updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools, HandoffRule } from '@/services/agentsApi'
import { HandoffRulesPanel } from '@/components/agents/HandoffRuleBuilder'

// ─── Tab: Handoff ─────────────────────────────────────────────────────────────
// Auto-saves on every change (matching Tools and FAQs). The previous UX
// asked the operator to click a separate "Salvar regras" button, which was
// silently ignored often enough that rules weren't being persisted — the
// agent_configs.handoff_rules JSONB stayed empty even after the UI
// suggested a rule had been created. Small "salvando / salvo" indicator
// replaces the explicit button.

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function HandoffTab({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  const currentRules: HandoffRule[] = useMemo(
    () => agent.handoff_rules?.rules ?? [],
    [agent.handoff_rules],
  )
  const [localRules, setLocalRules] = useState<HandoffRule[]>(currentRules)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Keep local state in sync when the parent reloads the agent (e.g. after
  // a refresh or when switching agents).
  useEffect(() => { setLocalRules(currentRules) }, [currentRules])

  // Debounced auto-save: every edit schedules a PATCH, newer edits cancel
  // the pending one. 300ms is short enough that it feels instant while
  // avoiding a flurry of requests when the user is rapidly toggling rows.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = useCallback((next: HandoffRule[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setStatus('saving')
      setErrorMessage(null)
      try {
        const updated = await updateAgent(agent.id, { handoff_rules: { rules: next } })
        onUpdate(updated)
        setStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setStatus('idle'), 1500)
      } catch (err) {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    }, 300)
  }, [agent.id, onUpdate])

  const handleRulesChange = useCallback((next: HandoffRule[]) => {
    setLocalRules(next)
    scheduleSave(next)
  }, [scheduleSave])

  // Cleanup pending timers on unmount so a late save doesn't fire after
  // the component is gone.
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  return (
    <div className="flex flex-col h-full gap-3">
      <HandoffRulesPanel
        rules={localRules}
        onChange={handleRulesChange}
      />

      {/* Small status strip — replaces the old manual "Salvar regras" button.
          Reserves 20px of vertical space so the layout doesn't shift on state
          changes; only renders content when something is happening. */}
      <div className="flex items-center justify-end h-5 flex-shrink-0 text-[11px]" aria-live="polite">
        {status === 'saving' && (
          <span className="inline-flex items-center gap-1.5 text-surface-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Salvando…
          </span>
        )}
        {status === 'saved' && (
          <span className="inline-flex items-center gap-1.5 text-status-active">
            <Check className="w-3 h-3" />
            Salvo automaticamente
          </span>
        )}
        {status === 'error' && (
          <span className="inline-flex items-center gap-1.5 text-danger">
            <AlertCircle className="w-3 h-3" />
            Falha ao salvar{errorMessage ? `: ${errorMessage}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}
