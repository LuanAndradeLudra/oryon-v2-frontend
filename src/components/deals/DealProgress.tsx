import { Check, X } from 'lucide-react'
import { cn, hexToRgba, formatRelativeTime } from '@/lib/utils'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import { stepperFor } from '@/lib/contactPipelines'
import type { Deal, DealStageHistoryEntry, Pipeline, PipelineStage } from '@/types'

/**
 * O progresso do registro — em duas formas, escolhidas pelo TIPO do funil.
 *
 * Um negócio e um registro de processo eram desenhados pelo mesmo stepper de
 * pílulas, e a ficha de um era indistinguível da do outro: a diferença
 * acontecia por ausência (o processo era "um negócio sem as coisas de
 * dinheiro"). Aqui a diferença passa a ser positiva, e é a FORMA que carrega:
 *
 *   * **Venda → funil.** Barras de largura decrescente. A forma diz "isto
 *     afunila" antes de qualquer texto, e é a mesma metáfora do quadro.
 *   * **Processo → linha do tempo.** Passos empilhados com o carimbo de quando
 *     o registro entrou em cada etapa e quanto durou. Lê como histórico, que é
 *     o que um processo é.
 *
 * O dado da linha do tempo não custa chamada nova: o painel já busca
 * `dealsApi.history(dealId)` na abertura, e até agora ele só aparecia dentro
 * da aba Atividade.
 */
export interface DealProgressProps {
  pipeline: Pipeline
  deal: Deal
  /** Passagens de etapa, do painel. Ausente = a linha do tempo mostra só a estrutura. */
  history?: DealStageHistoryEntry[] | null
  onMoveToStage: (stage: PipelineStage) => void
  disabled?: boolean
}

const corDa = (hex: string | undefined) =>
  /^#[0-9a-f]{6}$/i.test(hex ?? '') ? (hex as string) : '#6B8080'

export function DealProgress({ pipeline, deal, history, onMoveToStage, disabled }: DealProgressProps) {
  return pipelineKindOf(pipeline) === 'process'
    ? <LinhaDoTempo pipeline={pipeline} deal={deal} history={history} onMoveToStage={onMoveToStage} disabled={disabled} />
    : <Funil pipeline={pipeline} deal={deal} onMoveToStage={onMoveToStage} disabled={disabled} />
}

/** Quando o registro ENTROU em cada etapa, pelo histórico de passagens. */
function entradasPorEtapa(history?: DealStageHistoryEntry[] | null) {
  const mapa = new Map<string, string>()
  for (const h of history ?? []) {
    // A primeira entrada vence: se voltou para a etapa, a passagem mais antiga
    // é a que conta como "quando isto começou".
    if (h.toStageId && !mapa.has(h.toStageId)) mapa.set(h.toStageId, h.createdAt)
  }
  return mapa
}

// ─── Venda ───────────────────────────────────────────────────────────────────

function Funil({ pipeline, deal, onMoveToStage, disabled }: Omit<DealProgressProps, 'history'>) {
  const passos = stepperFor(pipeline, deal)
  const porId = new Map(pipeline.stages.map((s) => [s.id, s]))
  // A largura decresce do topo ao fim: é a forma que diz "funil". O piso de
  // 34% existe para o terminal continuar clicável e legível.
  const larguraDe = (i: number) => `${Math.max(34, 100 - i * (66 / Math.max(1, passos.length - 1)))}%`

  return (
    <ol className="flex flex-col gap-1" aria-label="Funil do negócio" data-testid="deal-progress-funnel">
      {passos.map((p, i) => {
        const stage = porId.get(p.id)
        const atual = p.state === 'current'
        const terminal = p.state === 'won' || p.state === 'lost'
        const feito = p.state === 'done'
        const cor = corDa(stage?.color)
        const clicavel = !disabled && !atual && !!stage && !terminal
        return (
          <li key={p.id} className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!clicavel}
              onClick={() => stage && onMoveToStage(stage)}
              aria-current={atual ? 'step' : undefined}
              title={clicavel ? `Mover para "${p.label}"` : p.label}
              data-testid={`deal-stepper-stage-${p.id}`}
              style={{
                width: larguraDe(i),
                color: atual || feito || terminal ? cor : undefined,
                borderColor: atual ? hexToRgba(cor, 0.55) : terminal ? hexToRgba(cor, 0.4) : undefined,
                backgroundColor: atual ? hexToRgba(cor, 0.16) : feito ? hexToRgba(cor, 0.08) : undefined,
              }}
              className={cn(
                'h-[26px] rounded-md border px-2.5 text-[11px] font-semibold text-left truncate transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
                !atual && !feito && !terminal && 'border-surface-700 text-surface-500',
                terminal && 'border-dashed',
                clicavel ? 'cursor-pointer hover:brightness-125' : 'cursor-default',
              )}
            >
              {terminal && (p.state === 'won'
                ? <Check className="inline w-3 h-3 mr-1 -mt-0.5" strokeWidth={3} />
                : <X className="inline w-3 h-3 mr-1 -mt-0.5" strokeWidth={3} />)}
              {p.label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

// ─── Processo ────────────────────────────────────────────────────────────────

function LinhaDoTempo({ pipeline, deal, history, onMoveToStage, disabled }: DealProgressProps) {
  const passos = stepperFor(pipeline, deal)
  const porId = new Map(pipeline.stages.map((s) => [s.id, s]))
  const entradas = entradasPorEtapa(history)

  return (
    <ol className="flex flex-col" aria-label="Andamento do registro" data-testid="deal-progress-timeline">
      {passos.map((p, i) => {
        const stage = porId.get(p.id)
        const atual = p.state === 'current'
        const terminal = p.state === 'won' || p.state === 'lost'
        const feito = p.state === 'done'
        const cor = corDa(stage?.color)
        const clicavel = !disabled && !atual && !!stage && !terminal
        const quando = entradas.get(p.id)
        const ultimo = i === passos.length - 1

        return (
          <li key={p.id} className="flex gap-2.5">
            <span className="flex flex-col items-center flex-shrink-0 pt-1">
              {terminal ? (
                <span
                  className="w-[11px] h-[11px] rounded-full border grid place-items-center"
                  style={{ borderColor: hexToRgba(cor, 0.5), color: hexToRgba(cor, 0.85) }}
                  aria-hidden
                >
                  {p.state === 'won'
                    ? <Check className="w-1.5 h-1.5" strokeWidth={4} />
                    : <X className="w-1.5 h-1.5" strokeWidth={4} />}
                </span>
              ) : (
                <span
                  className="w-2 h-2 rounded-full"
                  style={atual
                    ? { backgroundColor: cor, boxShadow: `0 0 0 3px ${hexToRgba(cor, 0.2)}` }
                    : { backgroundColor: cor, opacity: feito ? 0.55 : 0.3 }}
                  aria-hidden
                />
              )}
              {!ultimo && <span className="w-px flex-1 min-h-[20px] my-1 bg-surface-800" aria-hidden />}
            </span>

            <span className={cn('flex items-baseline justify-between gap-3 flex-1 min-w-0', !ultimo && 'pb-3')}>
              <button
                type="button"
                disabled={!clicavel}
                onClick={() => stage && onMoveToStage(stage)}
                aria-current={atual ? 'step' : undefined}
                title={clicavel ? `Mover para "${p.label}"` : p.label}
                data-testid={`deal-stepper-stage-${p.id}`}
                className={cn(
                  'text-left text-xs truncate rounded transition-colors min-w-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
                  atual ? 'font-semibold text-surface-50' : feito ? 'text-surface-400' : 'text-surface-600',
                  terminal && 'text-surface-500',
                  clicavel ? 'cursor-pointer hover:text-surface-200' : 'cursor-default',
                )}
                style={terminal ? { color: hexToRgba(cor, 0.62) } : undefined}
              >
                {p.label}
              </button>
              <span className="text-[10.5px] text-surface-500 whitespace-nowrap tabular-nums">
                {terminal && !quando
                  ? 'encerramento'
                  : quando
                    ? formatRelativeTime(quando)
                    : '—'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
