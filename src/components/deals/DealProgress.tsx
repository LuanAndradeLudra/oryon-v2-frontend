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
  /** "2 dias nesta etapa" — o cabeçalho já calcula; aqui vira o rótulo do "aqui". */
  tempoNaEtapa?: string | null
}

const corDa = (hex: string | undefined) =>
  /^#[0-9a-f]{6}$/i.test(hex ?? '') ? (hex as string) : '#6B8080'

export function DealProgress({ pipeline, deal, history, onMoveToStage, disabled, tempoNaEtapa }: DealProgressProps) {
  return pipelineKindOf(pipeline) === 'process'
    ? <LinhaDoTempo pipeline={pipeline} deal={deal} history={history} onMoveToStage={onMoveToStage} disabled={disabled} tempoNaEtapa={tempoNaEtapa} />
    : <Funil pipeline={pipeline} deal={deal} onMoveToStage={onMoveToStage} disabled={disabled} tempoNaEtapa={tempoNaEtapa} />
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

function Funil({ pipeline, deal, onMoveToStage, disabled, tempoNaEtapa }: Omit<DealProgressProps, 'history'>) {
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
                // SÓ a atual leva a cor da etapa. A primeira versão pintava
                // todas — concluída em 8%, atual em 16% — e a diferença entre
                // "já passei" e "estou aqui" virava um degrau de opacidade que
                // ninguém enxerga. Com tudo colorido, nada fica em destaque.
                ...(atual
                  ? {
                      color: cor,
                      borderColor: cor,
                      backgroundColor: hexToRgba(cor, 0.18),
                      boxShadow: `0 0 0 3px ${hexToRgba(cor, 0.16)}`,
                    }
                  : {}),
              }}
              className={cn(
                'relative rounded-md border px-2.5 text-[11px] text-left truncate transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
                // A atual é mais alta, além de mais forte: dois canais dizendo
                // a mesma coisa, e nenhum deles é só cor.
                atual ? 'h-[30px] font-bold' : 'h-[26px] font-medium',
                feito && !atual && 'border-surface-700 bg-surface-800/50 text-surface-400',
                !atual && !feito && !terminal && 'border-surface-800 text-surface-600',
                terminal && !atual && 'border-dashed border-surface-800 text-surface-600',
                clicavel ? 'cursor-pointer hover:border-surface-600 hover:text-surface-200' : 'cursor-default',
              )}
            >
              {feito && !atual && <Check className="inline w-3 h-3 mr-1 -mt-0.5 opacity-70" strokeWidth={3} />}
              {terminal && !atual && (p.state === 'won'
                ? <Check className="inline w-3 h-3 mr-1 -mt-0.5" strokeWidth={3} />
                : <X className="inline w-3 h-3 mr-1 -mt-0.5" strokeWidth={3} />)}
              {p.label}
            </button>
            {/* Marcador textual: a etapa atual não depende de comparar
                preenchimentos para ser encontrada. */}
            {atual && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                style={{ color: cor }}
              >
                aqui{tempoNaEtapa ? <span className="text-surface-500 font-normal normal-case tracking-normal"> · {tempoNaEtapa}</span> : null}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ─── Processo ────────────────────────────────────────────────────────────────

function LinhaDoTempo({ pipeline, deal, history, onMoveToStage, disabled, tempoNaEtapa }: DealProgressProps) {
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
                  className={cn('rounded-full', atual ? 'w-3 h-3' : 'w-2 h-2')}
                  style={atual
                    ? { backgroundColor: cor, boxShadow: `0 0 0 4px ${hexToRgba(cor, 0.22)}` }
                    : { backgroundColor: cor, opacity: feito ? 0.55 : 0.3 }}
                  aria-hidden
                />
              )}
              {!ultimo && <span className="w-px flex-1 min-h-[20px] my-1 bg-surface-800" aria-hidden />}
            </span>

            {/* A etapa atual é um BLOCO, não uma linha mais escura: fundo
                próprio, aresta na cor da etapa e respiro em volta. Tirado o
                marcador textual, é a superfície que precisa dizer "é aqui" —
                peso de fonte sozinho não sustenta isso numa lista de quatro. */}
            <span
              className={cn(
                'flex items-baseline justify-between gap-3 flex-1 min-w-0',
                !ultimo && 'pb-3',
                atual && 'rounded-r-lg -my-0.5 py-1.5 pl-2.5 pr-2 border-l-2',
              )}
              style={atual
                ? { borderLeftColor: cor, backgroundColor: hexToRgba(cor, 0.09) }
                : undefined}
            >
              <span className="flex items-baseline gap-2 min-w-0">
                <button
                  type="button"
                  disabled={!clicavel}
                  onClick={() => stage && onMoveToStage(stage)}
                  aria-current={atual ? 'step' : undefined}
                  title={clicavel ? `Mover para "${p.label}"` : p.label}
                  data-testid={`deal-stepper-stage-${p.id}`}
                  className={cn(
                    'text-left truncate rounded transition-colors min-w-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
                    // A atual sobe de corpo e leva a cor da própria etapa; as
                    // outras ficam neutras. Sem isso, quatro linhas de peso
                    // parecido obrigam a procurar o ponto aceso.
                    atual ? 'text-[15px] font-bold' : 'text-xs',
                    !atual && (feito ? 'text-surface-400' : 'text-surface-600'),
                    clicavel ? 'cursor-pointer hover:text-surface-200' : 'cursor-default',
                  )}
                  style={atual ? { color: cor } : terminal ? { color: hexToRgba(cor, 0.55) } : undefined}
                >
                  {p.label}
                </button>
              </span>
              <span className={cn(
                'text-[10.5px] whitespace-nowrap tabular-nums shrink-0',
                atual ? 'text-surface-300' : 'text-surface-500',
              )}>
                {atual && tempoNaEtapa
                  ? tempoNaEtapa
                  : terminal && !quando
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
