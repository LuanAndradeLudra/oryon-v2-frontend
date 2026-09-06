// ─── Command Deck · coluna Atenção ────────────────────────────────────────
// Coluna esquerda (272px): só o que exige uma decisão agora. Cada item é um
// `InsightCard` (ui/, W0.5) — a peça já existe exatamente com a geometria do
// `.att` do mockup, então não reimplemento o cartão aqui.
//
// A "Sugestões da IA" do mockup (cartão tracejado) fica de fora do v1: não há
// nenhum contrato que produza essa sugestão hoje, e um card com texto fixo
// seria uma promessa falsa. Entra quando existir fonte real.

import { KeyRound, Pause, FlaskConical, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

import { InsightCard } from '@/components/ui/InsightCard'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import type { DeckAttentionItem, DeckAttentionKind } from './useDeckData'

const KIND_ICON: Record<DeckAttentionKind, ReactNode> = {
  token_expiring: <KeyRound />,
  paused: <Pause />,
  untested: <FlaskConical />,
}

export interface DeckAttentionProps {
  items: DeckAttentionItem[]
  loading?: boolean
  onOpenAgent: (agentId: string) => void
  onResumeAgent: (agentId: string) => void
}

export function DeckAttention({ items, loading, onOpenAgent, onResumeAgent }: DeckAttentionProps) {
  return (
    <section aria-label="Atenção" className="flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-3xs font-bold uppercase tracking-[0.1em] text-surface-400">Atenção</h2>
        {!loading && items.length > 0 && (
          <span
            className="text-xs font-medium rounded-full px-2 py-0.5 tabular-nums"
            style={{ backgroundColor: 'var(--color-status-pending-bg)', color: 'var(--color-status-pending)' }}
          >
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[86px] rounded-2xl" />
          <Skeleton className="h-[86px] rounded-2xl" />
          <Skeleton className="h-[86px] rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-700 px-4 py-6 text-center">
          <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-surface-600" strokeWidth={1.5} aria-hidden />
          <p className="text-xs text-surface-400">Nada pedindo atenção agora</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <InsightCard
              key={item.id}
              accent={item.accent}
              icon={KIND_ICON[item.kind]}
              title={item.title}
              description={item.description}
              actions={
                <>
                  {item.kind === 'paused' && (
                    <Button size="sm" variant="primary" onClick={() => onResumeAgent(item.agentId)}>
                      Reativar
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => onOpenAgent(item.agentId)}>
                    {item.kind === 'untested' ? 'Testar agora' : item.kind === 'token_expiring' ? 'Renovar' : 'Abrir agente'}
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}
