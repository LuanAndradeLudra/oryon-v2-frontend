// ─── Layout do Workspace do agente (A2 / SCRUM-1013) ─────────────────────────
// Grid `.ws` do mockup: 60px (rail) · 236px (nav) · 1fr (conteúdo) · 372px
// (simulador sempre visível). Cada filho direto leva `min-w-0`, senão o
// conteúdo largo (tabelas, prompt, transcrição) empurra o grid e estoura a
// largura da página em vez de rolar dentro da própria coluna.

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { AgentConfig } from '@/services/agentsApi'
import { AgentRail } from './AgentRail'
import { SectionNav } from './SectionNav'
import type { SectionCounters, SectionId } from './sectionNavCore'

interface WorkspaceLayoutProps {
  agent: AgentConfig
  /** Todos os agentes do tenant — alimenta o rail. Vazio = rail sem itens
   *  (ainda carregando ou tenant com um agente só), nunca um rail falso. */
  agents: AgentConfig[]
  section: SectionId
  counters?: SectionCounters
  promptVersion?: number | null
  /** Conteúdo da seção corrente. */
  children: ReactNode
  /** Coluna do simulador (372px). Enquanto a W0.3 não mescla, a A2 monta o
   *  layout sem ela e a coluna simplesmente não é reservada — melhor do que
   *  deixar 372px de vazio na tela. */
  simulator?: ReactNode
}

export function WorkspaceLayout({
  agent, agents, section, counters, promptVersion, children, simulator,
}: WorkspaceLayoutProps) {
  return (
    <div
      className={cn(
        'grid flex-1 min-h-0 [&>*]:min-w-0',
        simulator
          ? 'grid-cols-[60px_236px_1fr_372px]'
          : 'grid-cols-[60px_236px_1fr]',
      )}
    >
      <AgentRail agents={agents} activeAgentId={agent.id} section={section} />
      <SectionNav agent={agent} current={section} counters={counters} promptVersion={promptVersion} />
      <main className="overflow-auto px-7 py-6">{children}</main>
      {simulator}
    </div>
  )
}
