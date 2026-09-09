import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { cn, hexToRgba, formatRelativeTime } from '@/lib/utils'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import { stepperFor } from '@/lib/contactPipelines'
import { PipelineTrail } from './PipelineTrail'
import type { Deal, DealStageHistoryEntry, Pipeline, PipelineStage } from '@/types'

/**
 * O progresso do registro — em duas formas, escolhidas pelo TIPO do funil.
 *
 * Um negócio e um registro de processo eram desenhados pelo mesmo stepper de
 * pílulas, e a ficha de um era indistinguível da do outro: a diferença
 * acontecia por ausência (o processo era "um negócio sem as coisas de
 * dinheiro"). Aqui a diferença passa a ser positiva, e é a FORMA que carrega:
 *
 *   * **Venda → trilha.** A mesma faixa horizontal do diálogo de criação, com
 *     o contador do caminho ("3 de 4"). Criar e consultar falam a mesma língua.
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
    : <TrilhaDoFunil pipeline={pipeline} deal={deal} onMoveToStage={onMoveToStage} disabled={disabled} tempoNaEtapa={tempoNaEtapa} />
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

/**
 * A trilha do funil — a MESMA do diálogo de criação.
 *
 * Aqui havia barras de largura decrescente, imitando um gráfico de funil. A
 * forma mentia: num funil de verdade a largura codifica VOLUME (quantos
 * negócios chegam a cada etapa), e ali ela era derivada do índice da linha —
 * ornamento com cara de dado. E volume é propriedade do funil inteiro, que é
 * assunto do quadro; a ficha fala de UM negócio.
 *
 * A faixa horizontal não finge ser gráfico, cabe em uma linha em vez de cinco,
 * e é o componente que o operador acabou de ver ao criar o registro — criar e
 * consultar passam a falar a mesma língua.
 */
function TrilhaDoFunil({ pipeline, deal, onMoveToStage, disabled, tempoNaEtapa }: Omit<DealProgressProps, 'history'>) {
  // O contador conta o CAMINHO — só as etapas não-terminais. Incluir Ganho e
  // Perdido no denominador diria "3 de 6" num funil de quatro passos.
  const caminho = pipeline.stages
    .filter((s) => !s.isWon && !s.isLost)
    .sort((a, b) => a.order - b.order)
  const posicao = caminho.findIndex((s) => s.id === deal.stageId) + 1

  return (
    <div className="flex items-center gap-3 min-w-0">
      <PipelineTrail
        stages={pipeline.stages}
        activeId={deal.stageId}
        onSelect={(stageId) => {
          const alvo = pipeline.stages.find((s) => s.id === stageId)
          if (alvo && !disabled) onMoveToStage(alvo)
        }}
        // A faixa vive dentro do cabeçalho da ficha, não como banda própria:
        // sem fundo, sem borda inferior e sem recuo lateral.
        className="flex-1 min-w-0 bg-transparent border-b-0 px-0 py-0"
      />
      <span className="text-[10.5px] text-surface-500 whitespace-nowrap shrink-0 tabular-nums" data-testid="deal-stage-position">
        {posicao > 0 ? `${posicao} de ${caminho.length}` : `${caminho.length} etapas`}
        {tempoNaEtapa && <span className="text-surface-600"> · {tempoNaEtapa}</span>}
      </span>
    </div>
  )
}

// ─── Processo ────────────────────────────────────────────────────────────────

function LinhaDoTempo({ pipeline, deal, history, onMoveToStage, disabled, tempoNaEtapa }: DealProgressProps) {
  const passos = stepperFor(pipeline, deal)
  const porId = new Map(pipeline.stages.map((s) => [s.id, s]))
  const entradas = entradasPorEtapa(history)
  const semMovimento = useReducedMotion()
  // Único por instância: duas fichas abertas fariam o bloco voar de uma para
  // a outra.
  const blocoId = useId()

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
                atual ? (
                  /* O pulso só existe AQUI, na linha do tempo do processo —
                     não na trilha do diálogo de criação. Lá a etapa ativa é uma
                     ESCOLHA (o operador está decidindo onde o registro nasce);
                     aqui ela é um ESTADO VIVO: o registro está parado neste
                     ponto agora. Pulsar uma escolha seria ruído; pulsar um
                     estado é o que um indicador de "ao vivo" faz. */
                  <span className="relative flex items-center justify-center w-3 h-3 shrink-0" aria-hidden>
                    <span
                      className="pulso-etapa absolute inset-0 rounded-full"
                      style={{ backgroundColor: hexToRgba(cor, 0.35) }}
                    />
                    <span
                      className="pulso-ponto relative w-3 h-3 rounded-full"
                      style={{ backgroundColor: cor, boxShadow: `0 0 0 4px ${hexToRgba(cor, 0.22)}` }}
                    />
                  </span>
                ) : (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cor, opacity: feito ? 0.55 : 0.3 }}
                    aria-hidden
                  />
                )
              )}
              {!ultimo && <span className="w-px flex-1 min-h-[20px] my-1 bg-surface-800" aria-hidden />}
            </span>

            {/* A etapa atual é um BLOCO, não uma linha mais escura: fundo
                próprio, aresta na cor da etapa e respiro em volta. Tirado o
                marcador textual, é a superfície que precisa dizer "é aqui" —
                peso de fonte sozinho não sustenta isso numa lista de quatro. */}
            {/* Duas camadas de propósito: a de FORA espaça, a de DENTRO pinta.
                Antes eram a mesma, e o `pb-3` que separa um passo do outro
                ficava DENTRO da caixa pintada — o bloco da etapa atual descia
                12 px a mais e encostava no título de baixo. Espaçamento em
                padding só funciona quando nada é pintado por cima dele. */}
            {/* Três camadas, cada uma com um trabalho: a de FORA espaça
                (`pb-3`), a do MEIO abraça só o conteúdo e serve de âncora para
                a pintura, a de DENTRO é o texto. */}
            <span className={cn('flex-1 min-w-0', !ultimo && 'pb-3')}>
            <span className="relative block">
              {/* O bloco da etapa atual é UMA superfície só, compartilhada por
                  todas as linhas via `layoutId`: quando a etapa muda, o Framer
                  a anima da linha antiga para a nova, em vez de apagá-la aqui e
                  acendê-la ali. É a mesma técnica do anel da trilha.
                  Absoluta e ATRÁS do conteúdo, então a troca move a superfície
                  sem tocar no texto. `-inset-y-1` reproduz o respiro que o
                  `-my-1 py-1` dava antes. */}
              {atual && (
                <motion.span
                  layoutId={blocoId}
                  className="absolute -inset-y-1 inset-x-0 rounded-r-md border-l-2 pointer-events-none"
                  style={{ borderLeftColor: cor, backgroundColor: hexToRgba(cor, 0.09) }}
                  transition={semMovimento
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 380, damping: 34 }}
                  aria-hidden
                />
              )}
            <span
              className={cn(
                // `items-center`, não `items-baseline`: o título tem 15 px e o
                // tempo 10,5 px, e alinhar pela BASE joga o menor para baixo do
                // centro óptico — foi assim que "agora nesta etapa" apareceu
                // afundado em relação ao nome da etapa.
                // O recuo lateral vale para TODAS as linhas, não só para a
                // atual: se ele aparecesse junto com o bloco, o texto pularia
                // 8 px a cada troca de etapa — e o que precisa se mover é a
                // superfície, não a palavra.
                'relative flex items-center justify-between gap-3 min-w-0 pl-2 pr-1.5',
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
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
            </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
