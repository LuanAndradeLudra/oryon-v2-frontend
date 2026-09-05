// ─── LiveCount ─────────────────────────────────────────────────────────────
// O topo da coluna direita: quantos vão receber, de quantos que atendem, e o
// que separa os dois. A barra empilhada e a legenda são o `ui/StackedBar`
// (W0.5) — este é o consumidor que motivou o `dimmed` da primitiva.
//
// Os 4 segmentos NÃO somam `matched`: os motivos de exclusão se sobrepõem
// (Decisão D5 do BE.3). A barra usa `total={matched}` para que "elegíveis"
// ocupe a fração honesta do todo, e cada motivo apareça na proporção do
// próprio peso, sem afirmar que a soma fecha.
import { Sparkles } from 'lucide-react'
import { InsightCard } from '@/components/ui/InsightCard'
import { StackedBar, type StackedBarSegment } from '@/components/ui/StackedBar'
import type { AudienceEvaluation } from './useAudienceEvaluate'

interface LiveCountProps {
  evaluation: AudienceEvaluation | null
  loading: boolean
  error: string | null
  /** Custo estimado em centavos, quando a D2 já souber o template escolhido. */
  estimatedCostCents?: number
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-700 bg-surface-800 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.1em] text-surface-400">{label}</div>
      <div className="text-xl text-surface-50 mt-0.5 tabular-nums">{value}</div>
    </div>
  )
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function LiveCount({ evaluation, loading, error, estimatedCostCents }: LiveCountProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-surface-700 bg-surface-800 p-3 text-xs text-surface-300">
        {error}
      </div>
    )
  }

  if (!evaluation) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-[0.1em] text-surface-400">Vão receber</div>
        <div className="text-surface-500 text-sm mt-2">
          Monte ao menos uma condição para ver o público.
        </div>
      </div>
    )
  }

  const { eligible, matched, excluded, within24h, available } = evaluation

  const segments: StackedBarSegment[] = [
    { value: eligible, color: 'brand', label: 'Elegíveis' },
    { value: excluded.recentlyCampaigned, color: 'rose', label: 'Receberam disparo no período', dimmed: true },
    { value: excluded.optOut, color: 'amber', label: 'Sem opt-in' },
    { value: excluded.activeAi, color: 'muted', label: 'Em conversa com a IA' },
  ]

  return (
    <>
      <div>
        <div className="text-[10px] uppercase tracking-[0.1em] text-surface-400">Vão receber</div>
        <div
          className="font-display font-black text-[56px] leading-none tracking-[-0.03em] text-surface-50 tabular-nums mt-1.5"
          aria-live="polite"
        >
          {eligible.toLocaleString('pt-BR')}
        </div>
        <div className="text-xs text-surface-400 mt-1">
          de {matched.toLocaleString('pt-BR')} que atendem às condições
          {' · '}
          <span className="text-surface-200">{loading ? 'calculando…' : 'calculado agora'}</span>
        </div>
      </div>

      {/* Sem BE.3 o motor antigo devolve só um total: não há como separar
          elegíveis de excluídos, e uma barra de um segmento só mentiria uma
          composição que ninguém calculou. */}
      {available && matched > 0 && <StackedBar segments={segments} total={matched} legend height={10} />}

      <div className="grid grid-cols-2 gap-2">
        {available && <Kpi label="Dentro da janela 24h" value={within24h.toLocaleString('pt-BR')} />}
        {typeof estimatedCostCents === 'number' && (
          <Kpi label="Custo estimado" value={formatBRL(estimatedCostCents)} />
        )}
      </div>

      {available && excluded.recentlyCampaigned > 0 && (
        <InsightCard
          tone="dashed"
          accent="brand"
          icon={<Sparkles />}
          title={`${excluded.recentlyCampaigned.toLocaleString('pt-BR')} já receberam um disparo no período`}
          description={
            <>
              Tirando a exclusão por disparo recente, o público sobe para{' '}
              {(eligible + excluded.recentlyCampaigned).toLocaleString('pt-BR')}. Em bases que
              se sobrepõem, a taxa de descadastro costuma subir junto.
            </>
          }
        />
      )}
    </>
  )
}
