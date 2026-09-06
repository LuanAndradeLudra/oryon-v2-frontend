import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { getAgent, listAgents } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools, AgentTool } from '@/services/agentsApi'
import { WorkspaceLayout } from '@/components/agents/workspace/WorkspaceLayout'
import { SectionContent } from '@/components/agents/workspace/SectionContent'
import { SimulatorColumn } from '@/components/agents/workspace/SimulatorColumn'
import { useAgentDraft } from '@/components/agents/workspace/useAgentDraft'
import { WorkspaceHeader } from '@/components/agents/workspace/WorkspaceHeader'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { DEFAULT_SECTION, isSectionId, type SectionId } from '@/components/agents/workspace/sectionNavCore'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export function AgentWorkspacePage() {
  const { id, section } = useParams<{ id: string; section: string }>()

  if (!id) return null

  // `key={id}` força remount ao trocar de agente — mesmo padrão de
  // `key={selectedAgent.id}` em AgentDetail (pages/agents/AgentsPage.tsx) —
  // então o estado abaixo já nasce correto por agente, sem precisar resetá-lo
  // manualmente dentro de um effect. Importa mais agora que o rail troca de
  // agente sem sair da rota.
  return <AgentWorkspaceForAgent key={id} id={id} section={section} />
}

function AgentWorkspaceForAgent({ id, section }: { id: string; section?: string }) {
  const navigate = useNavigate()
  const [agent, setAgent] = useState<AgentConfigWithTools | null>(null)
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (section && !isSectionId(section)) {
      navigate(`/agents/${id}/${DEFAULT_SECTION}`, { replace: true })
    }
  }, [id, section, navigate])

  useEffect(() => {
    let cancelled = false
    getAgent(id)
      .then((result) => { if (!cancelled) setAgent(result) })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  // Lista que alimenta o rail. Falha silenciosa de propósito: sem ela o rail
  // fica vazio, mas a seção continua utilizável — a tela é sobre ESTE agente,
  // e derrubá-la inteira porque a lista lateral não carregou seria pior.
  useEffect(() => {
    let cancelled = false
    listAgents()
      .then((result) => { if (!cancelled) setAgents(result) })
      .catch(() => { if (!cancelled) setAgents([]) })
    return () => { cancelled = true }
  }, [])

  // Mantém o rail em dia (nome/status) quando uma seção salva o agente, sem
  // refazer o GET — é o mesmo registro nos dois lugares.
  const handleUpdate = useCallback((updated: AgentConfig) => {
    setAgent(prev => (prev ? { ...prev, ...updated } : prev))
    setAgents(prev => prev.map(a => (a.id === updated.id ? { ...a, ...updated } : a)))
  }, [])

  const handleToolsChange = useCallback((tools: AgentTool[]) => {
    setAgent(prev => (prev ? { ...prev, tools } : prev))
  }, [])

  if (loading) {
    return (
      <div className="px-6 pt-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32 bg-surface-800/70" />
          </div>
        </div>
        <Skeleton className="h-9 w-full max-w-lg bg-surface-800/60" />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (notFound || !agent) {
    return (
      <EmptyState
        icon={Bot}
        title="Agente não encontrado"
        hint="Ele pode ter sido excluído, ou o link está incorreto."
        className="m-8"
      />
    )
  }

  // Seção inválida já disparou o redirect acima; até ele acontecer, renderiza
  // a default em vez de piscar uma tela vazia.
  const current = isSectionId(section) ? section : DEFAULT_SECTION

  return (
    <LoadedWorkspace
      agent={agent}
      agents={agents}
      section={current}
      onUpdate={handleUpdate}
      onToolsChange={handleToolsChange}
    />
  )
}

/** Separado do componente acima porque `useAgentDraft` precisa de um agente
 *  JÁ CARREGADO: chamá-lo lá em cima obrigaria a aceitar `agent | null` e a
 *  conviver com os returns antecipados de loading/404, que quebrariam a ordem
 *  dos hooks. */
function LoadedWorkspace({
  agent, agents, section, onUpdate, onToolsChange,
}: {
  agent: AgentConfigWithTools
  agents: AgentConfig[]
  section: SectionId
  onUpdate: (a: AgentConfig) => void
  onToolsChange: (tools: AgentTool[]) => void
}) {
  const draft = useAgentDraft(agent, onUpdate)

  // Chip de status + switch + "Alterações (N)" + "Publicar" vivem no TopBar:
  // são ações da tela inteira, não da seção corrente.
  useRegisterTopBarActions(
    <WorkspaceHeader agent={agent} draft={draft} onUpdate={onUpdate} />,
    [agent, draft.isDirty, draft.changedFields.length, draft.publishing],
  )

  // A promessa central da tela: o simulador testa o RASCUNHO, não só o
  // publicado — prompt e regras ainda não publicados já valem na conversa ao
  // lado (decisão 6 do Maestro).
  const draftPrompt = typeof draft.draft?.system_prompt === 'string'
    ? draft.draft.system_prompt
    : undefined
  const draftRules = draft.draft?.handoff_rules as AgentConfigWithTools['handoff_rules'] | undefined

  return (
    <WorkspaceLayout
      agent={agent}
      agents={agents}
      section={section}
      simulator={
        <SimulatorColumn
          agent={agent}
          systemPrompt={draftPrompt}
          handoffRules={draftRules?.rules}
          isDirty={draft.isDirty}
        />
      }
    >
      <SectionContent
        section={section}
        agent={agent}
        onUpdate={onUpdate}
        onToolsChange={onToolsChange}
      />
    </WorkspaceLayout>
  )
}
