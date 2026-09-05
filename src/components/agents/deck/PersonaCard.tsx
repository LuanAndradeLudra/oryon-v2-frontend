// ─── Command Deck · card de persona ───────────────────────────────────────
// Um agente como "persona viva" (mockup `.persona` em p1b-extra.html): topo
// com avatar tingido + chip de estado, faixa "ao vivo" com a conversa do
// instante, rodapé de 3 métricas. Três variantes: ativo, pausado (esmaecido) e
// rascunho (tracejado com barra de progresso).
//
// Regra de honestidade do fallback (BE.7 ainda não existe): o chip "N ao vivo",
// a faixa ao vivo e o rodapé só aparecem quando os dados chegaram de verdade.
// Sem eles o card mostra o que sabe com certeza — status e última alteração.

import type { ReactNode } from 'react'
import { MessageCircle, Pause, PencilLine } from 'lucide-react'

import { cn } from '@/lib/utils'
import { accentColor, tint } from '@/components/ui/accentColor'
import { Button } from '@/components/ui/Button'
import type { AgentConfig } from '@/services/agentsApi'
import type { AgentLiveInfo, AgentMetrics } from '@/types/agentsOps'
import {
  daysSince,
  draftProgress,
  formatDuration,
  formatPct,
  personaAccent,
  personaInitial,
  relativeTime,
  type MetricParts,
} from './deckFormat'

interface FootMetric {
  label: string
  parts: MetricParts
  /** Cor do valor — só para taxas, onde verde/âmbar comunicam faixa. */
  color?: string
}

function Foot({ metrics }: { metrics: FootMetric[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-4 pt-3 pb-3.5">
      {metrics.map((m) => (
        <div key={m.label} className="min-w-0">
          <div className="text-3xs font-bold uppercase tracking-[0.08em] text-surface-500 truncate">{m.label}</div>
          <div
            className="font-display font-bold text-lg tabular-nums tracking-[-0.02em] text-surface-50"
            style={m.color ? { color: m.color } : undefined}
          >
            {m.parts.value}
            {m.parts.unit && <small className="text-[11px] font-medium text-surface-500 ml-[3px]">{m.parts.unit}</small>}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Número só quando é número de verdade. Protege o rodapé de uma resposta
 *  parcial do BE.7 (campo ausente/nulo): a métrica vira "—" em vez de derrubar
 *  o card ou exibir um zero que ninguém mediu. */
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Verde acima de 80%, âmbar entre 60 e 80, sem cor abaixo — mesma leitura do
 *  mockup (82% verde, 74% âmbar). */
function resolutionColor(pct: number | null): string | undefined {
  if (pct === null) return undefined
  if (pct >= 80) return 'var(--color-status-active)'
  if (pct >= 60) return 'var(--color-status-pending)'
  return 'var(--color-accent-rose)'
}

function LiveStrip({ accent, icon, children }: { accent: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-4 rounded-[12px] bg-surface-950 border border-surface-800 px-3 py-2.5 text-xs text-surface-300 flex gap-2 items-start min-h-[56px]">
      <span className="flex-shrink-0 mt-0.5 [&>svg]:w-[13px] [&>svg]:h-[13px]" style={{ color: accent }}>
        {icon}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────

export interface PersonaCardProps {
  agent: AgentConfig
  /** Dados de `/agents-ops/live` para este agente; `undefined` quando o
   *  endpoint não está disponível (BE.7 ainda não implantado). */
  live?: AgentLiveInfo
  /** Dados de `/agents-ops/:id/metrics`; `undefined` = rodapé omitido. */
  metrics?: AgentMetrics
  /** Conversas abertas na linha do agente pausado (só quando resolvível). */
  queue?: number
  onOpen: (agentId: string) => void
  onResume?: (agentId: string) => void
}

export function PersonaCard({ agent, live, metrics, queue, onOpen, onResume }: PersonaCardProps) {
  const accent = personaAccent(agent.id)
  const tc = accentColor(accent)
  const paused = agent.status === 'paused'
  const draft = agent.status === 'draft'

  if (draft) return <DraftCard agent={agent} onOpen={onOpen} />

  // Rodapé — só com métricas reais. Ativo: janela de 7 dias (rotulada como
  // tal, não como "Hoje": o contrato do BE.7 não expõe o dia corrente por
  // agente). Pausado: fila + resolução de 30 dias + última atividade.
  const started = num(metrics?.started)
  const resolved = num(metrics?.resolvedByAi)
  const pct = started && resolved !== null ? Math.round((resolved / started) * 100) : null

  const foot: FootMetric[] = []
  if (paused) {
    if (queue !== undefined) foot.push({ label: 'Fila', parts: { value: String(queue) }, color: queue > 0 ? 'var(--color-status-pending)' : undefined })
    if (metrics) {
      foot.push({ label: 'Resolução · 30d', parts: formatPct(resolved ?? 0, started ?? 0), color: resolutionColor(pct) })
    }
    const days = daysSince(agent.updated_at)
    if (days !== null) foot.push({ label: 'Última ativ.', parts: { value: String(days), unit: 'd' } })
  } else if (metrics) {
    foot.push({ label: '7 dias', parts: started === null ? { value: '—' } : { value: started.toLocaleString('pt-BR') } })
    foot.push({ label: 'Resolução', parts: formatPct(resolved ?? 0, started ?? 0), color: resolutionColor(pct) })
    foot.push({ label: 'Resposta', parts: formatDuration(num(metrics.avgResponseSec)) })
  }

  const subtitle = [agent.sector, agent.objective].filter(Boolean).join(' · ')

  return (
    <div
      className={cn(
        'rounded-[20px] border border-surface-700 bg-surface-800 overflow-hidden flex flex-col',
        paused && 'opacity-75',
      )}
    >
      {/* Topo — o gradiente tingido é o que identifica a persona à distância;
          no pausado ele some (mockup: `.persona.paused .top{background:none}`). */}
      <button
        type="button"
        onClick={() => onOpen(agent.id)}
        className="text-left px-4 pt-4 pb-3.5 flex justify-between items-start gap-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
        style={paused ? undefined : { background: `linear-gradient(160deg, ${tint(accent, 22)}, transparent 65%)` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-10 h-10 rounded-[12px] flex items-center justify-center font-display font-bold text-base flex-shrink-0"
            style={{ backgroundColor: tint(accent, 18), color: tc, boxShadow: `inset 0 0 0 1px ${tint(accent, 30)}` }}
            aria-hidden
          >
            {personaInitial(agent.name)}
          </span>
          <div className="min-w-0">
            <div className="font-bold text-sm text-surface-100 truncate">{agent.name}</div>
            {subtitle && <div className="text-[13.2px] text-surface-500 truncate">{subtitle}</div>}
          </div>
        </div>
        {paused ? (
          <span className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--color-status-pending-bg)', color: 'var(--color-status-pending)' }}>
            <i className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
            Pausado
          </span>
        ) : live ? (
          <span className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--color-status-active-bg)', color: 'var(--color-status-active)' }}>
            <i className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden />
            {live.count} ao vivo
          </span>
        ) : null}
      </button>

      {/* Faixa ao vivo — some inteira quando não há dado (não vira "0 conversas") */}
      {paused ? (
        <LiveStrip accent="var(--color-status-pending)" icon={<Pause />}>
          <span>
            Pausado {relativeTime(agent.updated_at)}
            {queue !== undefined && queue > 0 && (
              <>
                <br />
                <span className="text-surface-500">{queue} conversas aguardando na fila</span>
              </>
            )}
          </span>
        </LiveStrip>
      ) : live?.latest ? (
        <LiveStrip accent={tc} icon={<MessageCircle />}>
          <span className="font-semibold text-surface-100">{live.latest.contactName}</span>
          <span> · “{live.latest.snippet}” </span>
          <span className="text-surface-500">{relativeTime(live.latest.at)}</span>
        </LiveStrip>
      ) : null}

      {foot.length > 0 ? <Foot metrics={foot} /> : <div className="pb-4" />}

      {paused && onResume && (
        <div className="px-4 pb-4">
          <Button size="sm" variant="secondary" onClick={() => onResume(agent.id)}>
            Reativar
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Rascunho ──────────────────────────────────────────────────────────────
// Mockup: cartão tracejado, sem tint, com barra de progresso e CTA pro Studio.
// O progresso vem de `wizard_config` (ver `draftProgress` em deckFormat.ts);
// sem ele, o card aparece sem barra em vez de fingir "0 de 8".

function DraftCard({ agent, onOpen }: { agent: AgentConfig; onOpen: (id: string) => void }) {
  // O prompt gerado é a 5ª etapa e não vive no `wizard_config` — vem do
  // próprio agente.
  const progress = draftProgress(agent.wizard_config, agent.system_prompt)

  return (
    <div className="rounded-[20px] border border-dashed border-surface-700 bg-transparent flex flex-col items-center justify-center text-center gap-2 p-6">
      <span className="w-10 h-10 rounded-xl bg-surface-800 text-surface-400 flex items-center justify-center" aria-hidden>
        <PencilLine className="w-[18px] h-[18px]" />
      </span>
      <div className="font-semibold text-sm text-surface-200 truncate max-w-full">{agent.name || 'Rascunho sem nome'}</div>
      {progress && (
        <div className="text-[13.2px] text-surface-400">
          Parou em {progress.done} de {progress.total}
        </div>
      )}
      {progress && (
        <div
          className="w-[140px] h-1.5 rounded-full bg-surface-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={progress.done}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-label={`Progresso do rascunho ${agent.name || 'sem nome'}`}
        >
          <i
            className="block h-full rounded-full bg-brand-500"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}
      {/* O mockup diz "Continuar no Studio", mas o Studio de rascunho
          existente só chega na A3 (`/agents/new` hoje cria do zero). O destino
          real e correto agora é o workspace do próprio rascunho — o rótulo
          acompanha o destino em vez de prometer uma tela que não existe. */}
      <Button size="sm" variant="secondary" className="mt-1" onClick={() => onOpen(agent.id)}>
        Continuar rascunho
      </Button>
    </div>
  )
}
