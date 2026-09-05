// ─── Agentes · linha da Lista ─────────────────────────────────────────────
// A linha fechada da A4 (SCRUM-1015), `.xrow .xh` do mockup: avatar tingido,
// nome · área com o chip de estado, duas colunas de número e o chevron.
//
// Os valores de geometria vêm do CSS do mockup (`p1b-extra.html:104-113`), não
// da escala do Tailwind: neste projeto `--radius-lg` vale 16px e `--radius-xl`
// vale 20px, então onde o mockup pede 8px ou 12px a classe utilitária de nome
// parecido daria o dobro. Por isso os raios estão em pixel explícito.

import { ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { accentColor, tint } from '@/components/ui/accentColor'
import type { AgentConfig } from '@/services/agentsApi'
import type { AgentLiveInfo, AgentMetrics } from '@/types/agentsOps'
import { formatPct, personaAccent, personaInitial } from '@/components/agents/deck/deckFormat'
import { daysSince } from '@/components/agents/deck/deckFormat'

/** Verde acima de 80%, âmbar entre 60 e 80, rosa abaixo — mesma leitura do
 *  Deck (`PersonaCard`), para as duas telas não classificarem o mesmo agente
 *  de formas diferentes. */
function resolutionColor(pct: number | null): string | undefined {
  if (pct === null) return undefined
  if (pct >= 80) return 'var(--color-status-active)'
  if (pct >= 60) return 'var(--color-status-pending)'
  return 'var(--color-accent-rose)'
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Rótulo + valor de uma das duas colunas numéricas da linha. */
function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-3xs font-bold uppercase tracking-[0.1em] text-surface-500">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">{children}</div>
    </div>
  )
}

export interface AgentRowProps {
  agent: AgentConfig
  expanded: boolean
  onToggle: (agentId: string) => void
  /** `/agents-ops/live`; `undefined` quando o BE.7 não está disponível. */
  live?: AgentLiveInfo
  /** `/agents-ops/:id/metrics`; `undefined` = colunas numéricas omitidas. */
  metrics?: AgentMetrics
  /** Conversas abertas na linha do agente pausado, quando resolvível. */
  queue?: number
  children?: React.ReactNode
}

export function AgentRow({ agent, expanded, onToggle, live, metrics, queue, children }: AgentRowProps) {
  const accent = personaAccent(agent.id)
  const paused = agent.status === 'paused'
  const draft = agent.status === 'draft'

  const started = num(metrics?.started)
  const resolved = num(metrics?.resolvedByAi)
  const pct = started && resolved !== null ? Math.round((resolved / started) * 100) : null

  const area = [agent.sector, agent.objective].filter(Boolean).join(' · ')
  const lastDays = daysSince(agent.updated_at)

  return (
    <div
      className={cn(
        'rounded-[20px] border bg-surface-800 overflow-hidden transition-shadow',
        expanded ? 'border-transparent' : 'border-surface-700',
        paused && !expanded && 'opacity-75',
      )}
      style={
        expanded
          ? {
              borderColor: 'color-mix(in srgb, var(--color-brand-cta) 50%, transparent)',
              boxShadow:
                '0 0 0 1px color-mix(in srgb, var(--color-brand-cta) 25%, transparent), 0 12px 32px rgb(0 0 0 / 0.35)',
            }
          : undefined
      }
    >
      <div className="grid grid-cols-[auto_1.4fr_1fr_1fr_auto] gap-4 items-center px-4 py-3.5">
        {/* Avatar — `.av` do mockup: 40px, raio 12px, 16px de fonte */}
        <span
          className="w-10 h-10 rounded-[12px] flex items-center justify-center font-display font-bold text-base flex-shrink-0"
          style={{
            backgroundColor: tint(accent, 18),
            color: accentColor(accent),
            boxShadow: `inset 0 0 0 1px ${tint(accent, 30)}`,
          }}
          aria-hidden
        >
          {personaInitial(agent.name)}
        </span>

        {/* Nome · área + chip de estado */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <b className="font-semibold text-surface-100 truncate">
              {agent.name}
              {agent.sector && <span className="font-normal"> · {agent.sector}</span>}
            </b>
            {paused ? (
              <span
                className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: 'var(--color-status-pending-bg)', color: 'var(--color-status-pending)' }}
              >
                <i className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
                Pausado
              </span>
            ) : draft ? (
              <span
                className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: 'var(--color-status-muted-bg)', color: 'var(--color-status-muted)' }}
              >
                Rascunho
              </span>
            ) : live ? (
              <span
                className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: 'var(--color-status-active-bg)', color: 'var(--color-status-active)' }}
              >
                <i className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden />
                {live.count} ao vivo
              </span>
            ) : null}
          </div>
          {area && <div className="text-[13.2px] text-surface-400 truncate mt-0.5">{area}</div>}
        </div>

        {/* Coluna numérica 1 — volume (ativo) ou fila (pausado).
            "7 dias" e não "Hoje": o contrato do BE.7 não expõe o dia corrente
            por agente, e o Deck já rotula assim. Duas telas dizendo janelas
            diferentes sobre o mesmo número seria pior que divergir do mockup. */}
        {paused ? (
          queue !== undefined ? (
            <Metric label="Fila">
              <b className="font-display font-bold text-lg tabular-nums tracking-[-0.02em]" style={{ color: queue > 0 ? 'var(--color-status-pending)' : 'var(--color-surface-50)' }}>
                {queue}
              </b>
            </Metric>
          ) : (
            <div />
          )
        ) : started !== null ? (
          <Metric label="7 dias">
            <b className="font-display font-bold text-lg tabular-nums tracking-[-0.02em] text-surface-50">
              {started.toLocaleString('pt-BR')}
            </b>
          </Metric>
        ) : (
          <div />
        )}

        {/* Coluna numérica 2 — resolução, com a barra de 60px do mockup */}
        {metrics ? (
          <Metric label={paused ? 'Resolução · 30d' : 'Resolução'}>
            <b
              className="font-display font-bold text-lg tabular-nums tracking-[-0.02em] text-surface-50"
              style={{ color: resolutionColor(pct) }}
            >
              {formatPct(resolved ?? 0, started ?? 0).value}
              {pct !== null && <small className="text-[11px] font-medium text-surface-500 ml-[3px]">%</small>}
            </b>
            {pct !== null && (
              <div className="w-[60px] h-1.5 rounded-full bg-surface-700 overflow-hidden flex-shrink-0">
                <i className="block h-full" style={{ width: `${pct}%`, backgroundColor: resolutionColor(pct) }} />
              </div>
            )}
          </Metric>
        ) : (
          <div />
        )}

        {/* Chevron — `.btn.icon`: 32px, raio 8px */}
        <button
          type="button"
          onClick={() => onToggle(agent.id)}
          aria-expanded={expanded}
          aria-label={expanded ? `Fechar detalhes de ${agent.name}` : `Ver detalhes de ${agent.name}`}
          className={cn(
            'w-8 h-8 rounded-[8px] inline-flex items-center justify-center text-surface-400 transition-colors cursor-pointer',
            expanded ? 'bg-white/[0.06]' : 'hover:bg-white/[0.06]',
          )}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Sem métrica nenhuma (BE.7 fora), a linha ainda diz quando mudou pela
          última vez — o que sabemos com certeza, em vez de duas colunas vazias. */}
      {!metrics && !paused && lastDays !== null && (
        <div className="px-4 pb-3 -mt-2 text-xs text-surface-500">
          Atualizado {lastDays === 0 ? 'hoje' : `há ${lastDays}d`}
        </div>
      )}

      {expanded && children}
    </div>
  )
}
