// ─── Command Deck · coluna Pulso ──────────────────────────────────────────
// Coluna direita (300px): 3 anéis do dia + feed ao vivo. Os anéis usam o
// `RingProgress` de ui/ (W0.5), extraído justamente deste mockup.
//
// Fallback: quando `/pulse` ou `/feed` respondem 404/501 (BE.7 não implantado),
// a seção correspondente é OMITIDA, não zerada — anel em 0% diria "nenhuma
// conversa foi resolvida hoje", que é uma afirmação diferente de "esse número
// ainda não existe". A exceção é o tenant sem nenhum agente, onde o endpoint
// responde de verdade com zeros: aí zero é o valor certo.

import { RingProgress } from '@/components/ui/RingProgress'
import { Skeleton } from '@/components/ui/Skeleton'
import type { AgentsPulse, AgentFeedItem } from '@/types/agentsOps'
import { LiveFeed } from './LiveFeed'

export interface PulsePanelProps {
  pulse: AgentsPulse | null
  pulseAvailable: boolean
  feed: AgentFeedItem[]
  feedAvailable: boolean
  loading?: boolean
}

export function PulsePanel({ pulse, pulseAvailable, feed, feedAvailable, loading }: PulsePanelProps) {
  return (
    <section aria-label="Pulso" className="flex flex-col min-w-0">
      {(pulseAvailable || loading) && (
        <>
          <h2 className="text-3xs font-bold uppercase tracking-[0.1em] text-surface-400 mb-3">Pulso · hoje</h2>
          {loading || !pulse ? (
            <div className="grid grid-cols-3 gap-2 mb-[18px]">
              <Skeleton className="w-16 h-16 rounded-full mx-auto" />
              <Skeleton className="w-16 h-16 rounded-full mx-auto" />
              <Skeleton className="w-16 h-16 rounded-full mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 mb-[18px]">
              <RingProgress value={pulse.resolvedByAiPct} color="brand" label="Resolvido pela IA" />
              <RingProgress
                value={pulse.conversations}
                max={Math.max(pulse.goal, pulse.conversations, 1)}
                color="blue"
                label={pulse.goal > 0 ? `Conversas · meta ${pulse.goal}` : 'Conversas'}
              />
              <RingProgress
                value={pulse.transferred}
                max={Math.max(pulse.conversations, pulse.transferred, 1)}
                color="rose"
                label="Transferidas"
              >
                {pulse.transferred.toLocaleString('pt-BR')}
              </RingProgress>
            </div>
          )}
        </>
      )}

      {(feedAvailable || loading) && (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-3xs font-bold uppercase tracking-[0.1em] text-surface-400">Ao vivo</h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'var(--color-status-active-bg)', color: 'var(--color-status-active)' }}
            >
              <i className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden />
              tempo real
            </span>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2 pt-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <LiveFeed items={feed} />
          )}
        </>
      )}
    </section>
  )
}
