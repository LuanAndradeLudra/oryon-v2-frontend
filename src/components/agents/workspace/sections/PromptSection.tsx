// Seção "Prompt" do Workspace (A2 / SCRUM-1013).
// Doc com gutter de linha (decisão 7 do Maestro) — ver `promptDocCore.ts` para
// por que o parsing é próprio e o `PromptArtifact.tsx` fica com ZERO mudanças.
// A leitura é o doc; editar é o mesmo toggle de textarea que a SystemPromptTab
// já tinha, não um editor novo. O `SystemPromptTab` segue intacto servindo o
// AgentDetail legado que a /agents ainda renderiza.

import { useEffect, useState } from 'react'
import { Check, Pencil, RefreshCw, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { hubHasContent, injectHubIntoPrompt, isAgentStale, loadHub } from '@/services/companyContextService'
import { updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '../SectionHeader'
import { PromptDoc } from '../PromptDoc'
import { approxTokens } from '../promptDocCore'
import { sectionById } from '../sectionNavCore'

export function PromptSection({
  agent,
  onUpdate,
  promptVersion,
}: {
  agent: AgentConfigWithTools
  onUpdate: (a: AgentConfig) => void
  /** Versão publicada (AS.2). Ausente = subtítulo sem o `v3`. */
  promptVersion?: number | null
}) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(agent.system_prompt)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Prompt recarregado por fora (troca de agente, publicação) descarta o
  // rascunho local — mesma regra que a SystemPromptTab já aplicava.
  useEffect(() => { setDraft(agent.system_prompt) }, [agent.system_prompt])

  const hub = user?.tenantId ? loadHub(user.tenantId) : null
  const isStale = hub && hubHasContent(hub) ? isAgentStale(agent.updated_at, hub) : false
  const isDirty = draft !== agent.system_prompt

  const handleSave = async () => {
    setSaving(true)
    try {
      onUpdate(await updateAgent(agent.id, { system_prompt: draft }))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    if (!hub) return
    setSyncing(true)
    try {
      const merged = injectHubIntoPrompt(agent.system_prompt, hub)
      onUpdate(await updateAgent(agent.id, { system_prompt: merged }))
      setDraft(merged)
    } finally {
      setSyncing(false)
    }
  }

  const description = [
    typeof promptVersion === 'number' && promptVersion > 0 ? `v${promptVersion}` : null,
    // Rotulado como aproximação porque é heurística de caracteres, não
    // tokenizer — ver `approxTokens`.
    `~${approxTokens(agent.system_prompt).toLocaleString('pt-BR')} tokens`,
    'o que muda aqui aparece na conversa ao lado',
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Prompt"
        description={description}
        accent={sectionById('prompt').accent}
        actions={
          editing ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setDraft(agent.system_prompt); setEditing(false) }}
                disabled={saving}
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
                <Check className="w-4 h-4" />
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
          )
        }
      />

      {isStale && (
        <Banner
          variant="warning"
          action={
            <button
              onClick={handleSync}
              disabled={syncing}
              aria-label="Sincronizar o prompt com o contexto da empresa"
              className="inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
            >
              <RefreshCw className={syncing ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
              {syncing ? 'Sincronizando…' : 'Sincronizar'}
            </button>
          }
        >
          O contexto da empresa mudou depois da última edição deste prompt.
        </Banner>
      )}

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Prompt do agente"
          spellCheck={false}
          className="w-full min-h-[420px] rounded-xl border border-surface-700 bg-surface-900/40 px-4 py-3 font-mono text-xs leading-6 text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        />
      ) : (
        <PromptDoc content={agent.system_prompt} />
      )}
    </div>
  )
}
