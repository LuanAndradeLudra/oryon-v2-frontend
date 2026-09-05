import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { getAgent } from '@/services/agentsApi'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import { AgentDetail } from '@/components/agents/AgentDetail'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

// Ids de aba do AgentDetail atual (components/agents/AgentDetail.tsx — `type
// Tab`). O W0.2/SCRUM-995 (Tecelã) vai expor controle externo de aba nele;
// até lá esta página só VALIDA a URL contra essa lista (redireciona seção
// desconhecida pra "overview") — a aba inicial do AgentDetail continua sendo
// sempre "overview" internamente, igual ao comportamento de hoje.
const AGENT_SECTION_IDS = [
  'overview', 'prompt', 'tools', 'skills', 'capabilities', 'criteria', 'rules', 'knowledge', 'catalog', 'metrics',
] as const

export function AgentWorkspacePage() {
  const { id, section } = useParams<{ id: string; section: string }>()

  if (!id) return null

  // `key={id}` força remount ao trocar de agente — mesmo padrão de
  // `key={selectedAgent.id}` em AgentDetail (pages/agents/AgentsPage.tsx) —
  // então o estado abaixo já nasce correto por agente, sem precisar resetá-lo
  // manualmente dentro de um effect.
  return <AgentWorkspaceForAgent key={id} id={id} section={section} />
}

function AgentWorkspaceForAgent({ id, section }: { id: string; section?: string }) {
  const navigate = useNavigate()
  const [agent, setAgent] = useState<AgentConfigWithTools | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (section && !(AGENT_SECTION_IDS as readonly string[]).includes(section)) {
      navigate(`/agents/${id}/overview`, { replace: true })
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

  return (
    <AgentDetail
      agent={agent}
      tested={false}
      onTested={() => {}}
      onDeleted={() => navigate('/agents')}
    />
  )
}
