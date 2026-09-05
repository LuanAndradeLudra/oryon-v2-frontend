// ─── Ações do Workspace no TopBar (A2 / SCRUM-1013) ──────────────────────────
// Mockup `p2a-agentes.html:118`: pílula com chip de status + switch, depois
// "Alterações (N)" (secundário) e "Publicar" (primário). Vai para o TopBar via
// `useRegisterTopBarActions`, não para dentro da coluna de conteúdo — é ação
// da tela inteira, não da seção corrente.

import { useState } from 'react'
import { Check, History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Tooltip } from '@/components/ui/Tooltip'
import { STATUS_CONFIG } from '@/components/agents/detail/constants'
import { updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { fieldLabel } from './agentDraftCore'
import type { UseAgentDraft } from './useAgentDraft'

interface WorkspaceHeaderProps {
  agent: AgentConfigWithTools
  draft: UseAgentDraft
  onUpdate: (a: AgentConfig) => void
}

export function WorkspaceHeader({ agent, draft, onUpdate }: WorkspaceHeaderProps) {
  const [savingStatus, setSavingStatus] = useState(false)
  const cfg = STATUS_CONFIG[agent.status]

  // O switch liga/desliga o agente. "draft" (nunca publicado) não é um estado
  // que o switch alcança — só `active` <-> `paused` —, então ele fica
  // desligado e explicado, em vez de mentir que um rascunho está no ar.
  const isActive = agent.status === 'active'
  const canToggle = agent.status !== 'draft'

  const toggleStatus = async (next: boolean) => {
    setSavingStatus(true)
    try {
      onUpdate(await updateAgent(agent.id, { status: next ? 'active' : 'paused' }))
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-sm border border-surface-700 bg-surface-800 py-1 pl-2.5 pr-1.5">
        {/* Mockup: `border:none;background:none;padding:0` sobre o `.chip.st` —
            dentro da pílula o chip é só TEXTO na cor do status, não a etiqueta
            preenchida do `.color-chip`. O ponto herda por `currentColor`. */}
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium"
          style={{ color: cfg?.chip }}
        >
          <span className="chip-dot h-1.5 w-1.5 rounded-full" />
          {cfg?.label ?? agent.status}
        </span>
        <Switch
          checked={isActive}
          disabled={!canToggle || savingStatus}
          onChange={toggleStatus}
        />
      </div>

      {draft.isDirty && (
        <Tooltip content={changedSummary(draft.changedFields)}>
          <Button variant="secondary" size="sm" onClick={draft.discard}>
            <History className="h-4 w-4" />
            Alterações ({draft.changedFields.length})
          </Button>
        </Tooltip>
      )}

      <Button
        size="sm"
        onClick={draft.publish}
        // Sem alteração não há o que publicar — desabilitado é mais honesto
        // que um botão que não faz nada ao ser clicado.
        disabled={!draft.isDirty || draft.publishing}
      >
        {draft.publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {draft.publishing ? 'Publicando…' : 'Publicar'}
      </Button>
    </div>
  )
}

/** `ui/Tooltip` aceita só texto, então a lista de campos vai em uma linha em
 *  vez de bullets — os rótulos são curtos ("Prompt", "Regras"), então cabe. */
function changedSummary(fields: string[]): string {
  const nomes = fields.map(fieldLabel).join(', ')
  return `Não publicado ainda: ${nomes}. Clique para descartar.`
}
