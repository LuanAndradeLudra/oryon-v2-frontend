// ─── Navegação vertical das 10 seções (A2 / SCRUM-1013) ──────────────────────
// Coluna de 236px do mockup (`.ws .snav`): cabeçalho com o agente + 4 grupos
// rotulados. A ordem dos grupos e a alocação de cada seção são fixas e vêm de
// `sectionNavCore.ts` (módulo puro, testado em `sectionNavCore.test.ts`).

import { Link } from 'react-router-dom'
import { cn, getInitials } from '@/lib/utils'
import { accentColor } from '@/components/ui/accentColor'
import type { AgentConfig } from '@/services/agentsApi'
import { agentTintStyle } from './agentAccent'
import {
  SECTION_GROUPS, sectionCounter, sectionsInGroup, ungroupedSections,
  type SectionCounter, type SectionCounters, type SectionDef, type SectionId,
} from './sectionNavCore'

interface SectionNavProps {
  agent: AgentConfig
  current: SectionId
  counters?: SectionCounters
  /** Versão do prompt publicada (AS.2). Ausente = subtítulo sem o `· v3`. */
  promptVersion?: number | null
}

export function SectionNav({ agent, current, counters, promptVersion }: SectionNavProps) {
  return (
    <nav
      aria-label="Seções do agente"
      className="border-r border-surface-800 bg-surface-900/30 px-3 py-4.5 flex flex-col gap-0.5 overflow-y-auto"
    >
      <NavHeader agent={agent} promptVersion={promptVersion} />

      {ungroupedSections().map(section => (
        <NavItem key={section.id} section={section} current={current} agentId={agent.id} counters={counters} />
      ))}

      {SECTION_GROUPS.map(group => (
        <div key={group} className="contents">
          <div className="mt-3.5 mb-1.5 px-2 text-[9.5px] font-bold uppercase tracking-[0.12em] text-surface-500">
            {group}
          </div>
          {sectionsInGroup(group).map(section => (
            <NavItem key={section.id} section={section} current={current} agentId={agent.id} counters={counters} />
          ))}
        </div>
      ))}
    </nav>
  )
}

function NavHeader({ agent, promptVersion }: { agent: AgentConfig; promptVersion?: number | null }) {
  // "Vendas · E-commerce · v3" no mockup — monto só com o que existe, sem
  // separador solto quando `objective`/`sector`/versão faltam.
  const parts = [
    agent.objective,
    agent.sector,
    typeof promptVersion === 'number' && promptVersion > 0 ? `v${promptVersion}` : null,
  ].filter(Boolean)

  return (
    <div className="px-2 pb-3 flex items-center gap-2.5">
      <span
        aria-hidden="true"
        style={agentTintStyle(agent.id)}
        className="w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center font-bold text-base leading-none select-none"
      >
        {getInitials(agent.name)}
      </span>
      <div className="min-w-0">
        <div className="font-bold text-surface-50 truncate">{agent.name}</div>
        {parts.length > 0 && (
          <div className="text-[11px] text-surface-500 truncate">{parts.join(' · ')}</div>
        )}
      </div>
    </div>
  )
}

function NavItem({
  section, current, agentId, counters,
}: {
  section: SectionDef
  current: SectionId
  agentId: string
  counters?: SectionCounters
}) {
  const active = section.id === current
  const Icon = section.icon
  const counter = sectionCounter(section.id, counters)

  return (
    <Link
      to={`/agents/${agentId}/${section.id}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'grid grid-cols-[18px_1fr_auto] gap-2 items-center px-2.5 py-2 rounded-[10px]',
        'text-[13px] font-medium border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
        active
          ? 'bg-surface-800 border-surface-700 text-surface-50'
          : 'border-transparent text-surface-400 hover:bg-white/[0.04] hover:text-surface-200',
      )}
    >
      <Icon
        // Inativo é um degrau MAIS apagado que o rótulo (mockup: `.lucide` em
        // --s500 contra o label em --s400) — sem isso o ícone herda a cor do
        // texto e a hierarquia dentro do item some. O ativo sobrescreve com o
        // acento categórico da seção.
        className={cn('w-[15px] h-[15px]', !active && 'text-surface-500')}
        style={active ? { color: accentColor(section.accent) } : undefined}
      />
      <span className="truncate">{section.label}</span>
      {counter && <CounterBadge counter={counter} />}
    </Link>
  )
}

function CounterBadge({ counter }: { counter: SectionCounter }) {
  const warning = counter.kind === 'warning'
  return (
    <span
      className={cn('text-[10px] tabular-nums', warning ? 'font-bold' : 'text-surface-500')}
      style={warning ? { color: accentColor('amber') } : undefined}
      // O `!` é forma + cor; sozinho ele não diz o que houve, então o estado
      // vai por extenso para leitor de tela (a cor não pode ser o único
      // portador da informação).
      aria-label={warning ? 'requer atenção' : undefined}
    >
      {counter.text}
    </span>
  )
}
