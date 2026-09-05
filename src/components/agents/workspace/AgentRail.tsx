// ─── Rail de agentes (A2 / SCRUM-1013) ───────────────────────────────────────
// Coluna de 60px do mockup (`.ws .arail`): troca de agente SEM sair da tela,
// mantendo a seção atual — coerente com a promessa da A2 ("mexe e vê").
//
// A11y: esta é uma lista de avatares SEM TEXTO. Sem nome acessível ela é
// literalmente ilegível por leitor de tela (cada item seria só uma letra).
// Por isso cada item leva o nome do agente + o estado no rótulo, e a coluna
// tem `aria-label` própria. Lacuna herdada do monólito (1 aria-label para ~39
// botões em agents/detail/**) que a A2 não repete nos componentes novos.

import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { AgentConfig } from '@/services/agentsApi'
import { agentTintStyle } from './agentAccent'
import type { SectionId } from './sectionNavCore'

const STATUS_LABEL: Record<AgentConfig['status'], string> = {
  active: 'ativo',
  draft:  'rascunho',
  paused: 'pausado',
}

interface AgentRailProps {
  agents: AgentConfig[]
  activeAgentId: string
  /** Seção atual — preservada ao trocar de agente. */
  section: SectionId
}

export function AgentRail({ agents, activeAgentId, section }: AgentRailProps) {
  return (
    <nav
      aria-label="Agentes"
      className="border-r border-surface-800 bg-surface-950/50 py-3.5 flex flex-col items-center gap-2 overflow-y-auto"
    >
      {agents.map((agent) => {
        const active = agent.id === activeAgentId
        return (
          <Link
            key={agent.id}
            to={`/agents/${agent.id}/${section}`}
            aria-label={`${agent.name} — ${STATUS_LABEL[agent.status]}`}
            aria-current={active ? 'page' : undefined}
            title={agent.name}
            style={agentTintStyle(agent.id, active)}
            className={cn(
              'w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center',
              'font-bold text-base leading-none select-none transition-opacity',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
              active ? 'opacity-100' : 'opacity-55 hover:opacity-100',
            )}
          >
            {getInitials(agent.name)}
          </Link>
        )
      })}

      <Link
        to="/agents/new"
        aria-label="Criar agente"
        title="Criar agente"
        className={cn(
          'w-10 h-10 rounded-xl border border-dashed border-surface-600 mt-1',
          'flex items-center justify-center text-surface-500 shrink-0',
          'hover:text-surface-200 hover:border-surface-500 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
      >
        <Plus className="w-4 h-4" />
      </Link>
    </nav>
  )
}
