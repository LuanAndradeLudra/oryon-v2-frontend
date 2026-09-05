// ─── Command Deck ─────────────────────────────────────────────────────────
// A view "Deck" da tela de Agentes (A1/SCRUM-1012). Três colunas com papéis
// distintos, como no mockup aprovado (`p2a-agentes.html#a1`, CSS `.deck` em
// `p1b-extra.html`): Atenção 272 · grid de personas · Pulso 300.
//
// Vive aqui, e não dentro da AgentsPage, para manter a página como um
// roteador fino entre Deck e Lista — a Lista continua sendo exatamente o
// list+detail de hoje, sem mudança de comportamento até a A4.

import { useMemo, useState } from 'react'
import { Bot, Search } from 'lucide-react'

import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { AgentConfig } from '@/services/agentsApi'
import { DeckAttention } from './DeckAttention'
import { PersonaCard } from './PersonaCard'
import { PulsePanel } from './PulsePanel'
import { useDeckData } from './useDeckData'

export interface CommandDeckProps {
  agents: AgentConfig[]
  loading: boolean
  onOpenAgent: (agentId: string) => void
  onResumeAgent: (agentId: string) => void
  onNewAgent: () => void
}

/** Rascunhos por último; fora isso mantém a ordem que o backend devolveu
 *  (`updated_at` desc), que é a mesma da Lista. */
function orderForDeck(agents: AgentConfig[]): AgentConfig[] {
  return [...agents].sort((a, b) => Number(a.status === 'draft') - Number(b.status === 'draft'))
}

export function CommandDeck({ agents, loading, onOpenAgent, onResumeAgent, onNewAgent }: CommandDeckProps) {
  const [query, setQuery] = useState('')
  const deck = useDeckData(agents, !loading)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? agents.filter((a) => a.name.toLowerCase().includes(q) || (a.sector ?? '').toLowerCase().includes(q))
      : agents
    return orderForDeck(list)
  }, [agents, query])

  const counts = useMemo(() => ({
    active: agents.filter((a) => a.status === 'active').length,
    paused: agents.filter((a) => a.status === 'paused').length,
    draft: agents.filter((a) => a.status === 'draft').length,
  }), [agents])

  if (!loading && agents.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <EmptyState
          icon={Bot}
          title="Nenhum agente ainda"
          hint="Crie o primeiro pra começar a atender no WhatsApp."
          action={{ label: 'Criar primeiro agente', onClick: onNewAgent }}
          iconStyle={{ color: 'color-mix(in srgb, var(--color-accent-violet) 55%, transparent)' }}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[272px_1fr_300px] flex-1 min-h-0">
      {/* ── Esquerda: Atenção ── */}
      <div className="p-5 min-w-0 border-r border-surface-800 bg-surface-950/50 overflow-y-auto">
        <DeckAttention
          items={deck.attention}
          loading={loading}
          onOpenAgent={onOpenAgent}
          onResumeAgent={onResumeAgent}
        />
      </div>

      {/* ── Centro: grid de personas ── */}
      <div className="p-5 min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-3xs font-bold uppercase tracking-[0.08em] text-surface-400">Agentes</h2>
            {!loading && (
              <span className="text-xs text-surface-500 truncate">
                · {counts.active} {counts.active === 1 ? 'ativo' : 'ativos'} · {counts.paused} {counts.paused === 1 ? 'pausado' : 'pausados'} · {counts.draft} {counts.draft === 1 ? 'rascunho' : 'rascunhos'}
              </span>
            )}
          </div>
          <label className="relative flex-shrink-0">
            <span className="sr-only">Buscar agente</span>
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="w-[200px] pl-8 pr-3 py-1.5 rounded-xl bg-surface-900 border border-surface-800 text-xs text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-surface-700"
            />
          </label>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} title="Nenhum agente com esse nome" className="py-10" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {visible.map((agent) => (
              <PersonaCard
                key={agent.id}
                agent={agent}
                live={deck.liveAvailable ? deck.live[agent.id] : undefined}
                metrics={deck.metrics[agent.id]}
                queue={deck.queue[agent.id]}
                onOpen={onOpenAgent}
                onResume={onResumeAgent}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Direita: Pulso ── */}
      <div className="p-5 min-w-0 border-l border-surface-800 bg-surface-950/50 overflow-y-auto">
        {loading ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : (
          <PulsePanel
            pulse={deck.pulse}
            pulseAvailable={deck.pulseAvailable}
            feed={deck.feed}
            feedAvailable={deck.feedAvailable}
          />
        )}
      </div>
    </div>
  )
}
