import { useState, useEffect } from 'react'
import { RefreshCw, Sparkles, Save, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { loadHub, hubHasContent, isAgentStale, injectHubIntoPrompt } from '@/services/companyContextService'
import { cn } from '@/lib/utils'
import { updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { Banner } from '@/components/ui/Banner'
import { PromptArtifact } from '@/components/agents/PromptArtifact'

export function SystemPromptTab({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  const { user } = useAuth()
  const [draft, setDraft] = useState(agent.system_prompt)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const isDirty = draft !== agent.system_prompt

  const hub     = user?.tenantId ? loadHub(user.tenantId) : null
  const hasHub  = hub ? hubHasContent(hub) : false
  const isStale = hub ? isAgentStale(agent.updated_at, hub) : false

  useEffect(() => { setDraft(agent.system_prompt) }, [agent.system_prompt])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateAgent(agent.id, { system_prompt: draft })
      onUpdate(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    if (!hub || !hasHub) return
    setSyncing(true)
    try {
      const newPrompt = injectHubIntoPrompt(agent.system_prompt, hub)
      const updated = await updateAgent(agent.id, { system_prompt: newPrompt })
      onUpdate(updated)
      setDraft(newPrompt)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Stale warning banner */}
      {isStale && (
        <Banner
          variant="warning"
          className="flex-shrink-0"
          action={
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/25 bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {syncing
                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando…</>
                : <><Sparkles className="w-3 h-3" /> Sincronizar com Hub</>}
            </button>
          }
        >
          O Contexto da IA foi atualizado depois que este prompt foi gerado.
        </Banner>
      )}

      {/* Artifact — editable */}
      <PromptArtifact
        content={draft}
        onChange={setDraft}
      />

      {/* Save / discard row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDraft(agent.system_prompt)}
            disabled={!isDirty}
            className="text-xs text-surface-500 hover:text-surface-300 disabled:opacity-0 transition"
          >
            Descartar alterações
          </button>
          {hasHub && !isStale && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 text-xs text-surface-600 hover:text-brand-400 disabled:opacity-40 transition"
            >
              {syncing
                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando…</>
                : <><Sparkles className="w-3 h-3" /> Sincronizar com Hub</>}
            </button>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
            saved
              ? 'bg-status-active-bg text-status-active ring-1 ring-status-active-border'
              : isDirty
                ? 'bg-brand-600 hover:bg-brand-500 text-surface-950'
                : 'bg-surface-800 text-surface-600 cursor-not-allowed',
          )}
        >
          {saved
            ? <><Check className="w-3.5 h-3.5" /> Salvo</>
            : saving
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
              : <><Save className="w-3.5 h-3.5" /> Salvar prompt</>}
        </button>
      </div>
    </div>
  )
}
