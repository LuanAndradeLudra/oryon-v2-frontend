// ─── Ações do Workspace no TopBar (A2 / SCRUM-1013) ──────────────────────────
// Mockup `p2a-agentes.html:115`: pílula com chip de status + switch, depois
// "Alterações (N)" (secundário) e "Publicar" (primário). Vai para o TopBar via
// `useRegisterTopBarActions`, não para dentro da coluna de conteúdo — é ação
// da tela inteira, não da seção corrente.
//
// "Alterações (N)" REVELA, não descarta. Ele descartava direto — `setDraft(null)`,
// `writeStoredDraft(null)` e `agentDraftApi.discard()`, ou seja apagava também
// no servidor — sem confirmação, com rótulo substantivo e ícone de histórico.
// Nada ali anunciava destruição e o único aviso morava num tooltip, que exige
// hover e some. O usuário age pelo que a interface promete, e "Alterações (N)"
// promete VER. Então mostra: abre o card do mockup (`p2a-agentes.html:142`),
// com a lista das alterações e o "Publicar" ao lado. O Descartar mora dentro
// dele, com nome de verbo e com `ConfirmModal` — ver `ChangesCard`.

import { useState } from 'react'
import { Check, History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { Switch } from '@/components/ui/Switch'
import { STATUS_CONFIG } from '@/components/agents/detail/constants'
import { updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { ChangesCard } from './ChangesCard'
import type { UseAgentDraft } from './useAgentDraft'

interface WorkspaceHeaderProps {
  agent: AgentConfigWithTools
  draft: UseAgentDraft
  onUpdate: (a: AgentConfig) => void
}

export function WorkspaceHeader({ agent, draft, onUpdate }: WorkspaceHeaderProps) {
  const [savingStatus, setSavingStatus] = useState(false)
  const [showChanges, setShowChanges] = useState(false)
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
          // `text-2xs`, não `text-xs`: o mockup pede 12px no chip contra 13,2
          // nos botões `.btn.sm` ao lado, ou seja o chip é o MENOR dos três.
          // `text-xs` emite 13,2 no desktop e 12 abaixo de 768px, então
          // empatava com os botões nos DOIS regimes. `--text-2xs` é 11px fixo
          // e preserva a relação sempre. Exceção deliberada: é o único chip do
          // app em `text-2xs`, e a razão é a vizinhança, não o chip.
          className="inline-flex items-center gap-1.5 text-2xs font-medium"
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
        <Dropdown
          open={showChanges}
          onClose={() => setShowChanges(false)}
          align="right"
          anchor={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowChanges(o => !o)}
              aria-expanded={showChanges}
              aria-haspopup="dialog"
            >
              <History className="h-4 w-4" />
              Alterações ({draft.changedFields.length})
            </Button>
          }
        >
          <ChangesCard
            agent={agent}
            draft={draft.draft}
            changedFields={draft.changedFields}
            publishing={draft.publishing}
            publishError={draft.publishError}
            onPublish={() => { void draft.publish() }}
            onDiscard={() => { draft.discard(); setShowChanges(false) }}
          />
        </Dropdown>
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
