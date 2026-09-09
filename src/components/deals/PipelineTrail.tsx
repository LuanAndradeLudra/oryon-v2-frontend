import { useId, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Dropdown } from '@/components/ui/Dropdown'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import { ChipOption } from './AttributeChip'
import type { PipelineStage } from '@/types'

/**
 * Trilha do funil — mostra o caminho inteiro e deixa escolher a etapa em que o
 * registro nasce.
 *
 * Substitui a ficha "Etapa", que era a mais confusa da fila: "Novo" sozinho não
 * dizia de que eixo era. A faixa responde melhor e ainda mostra o que vem
 * depois, espelhando o quadro que o operador já usa — as colunas do Kanban
 * correm da esquerda para a direita, e a trilha repete esse mapeamento.
 *
 * ─── Os quatro degraus ───────────────────────────────────────────────────
 * O orçamento é apertado: 640 px úteis, 14 px fixos por etapa e 28 px por
 * conector. Sobram ~91 px por rótulo com 5 etapas (~15 caracteres) e só ~41 px
 * com 8 (~7 caracteres, inutilizável). Por isso a faixa NUNCA colapsa — ela
 * desce um degrau:
 *
 *   1. **Completa** — até 6 etapas com rótulos que cabem. É o caso de 100% dos
 *      funis existentes hoje (todos com 5 etapas, rótulo máximo de 18 chars).
 *   2. **Truncada** — rótulos longos cortam com reticências e ganham dica no
 *      hover, mas o espaço é distribuído por PRIORIDADE: a etapa ativa nunca
 *      trunca. Cortá-la esconderia a única informação que a faixa existe para
 *      dar. Sai de graça — é `min-w-0` nas inativas e `shrink-0` na ativa.
 *   3. **Recolhida** — 7 etapas ou mais. O meio vira um "+N" clicável e
 *      preserva sempre a primeira, a ativa, as duas vizinhas e o terminal.
 *   4. **Compacta** — só os pontos mais o nome da etapa atual e o contador.
 *      É o piso, e é o que o mobile usa: no `BottomSheet` a largura é a do
 *      telefone.
 *
 * O degrau vem da CONTAGEM, decidida no próprio render — nada de medir largura
 * em tempo real, que traria `ResizeObserver`, re-render e tremida na abertura.
 */
export interface PipelineTrailProps {
  /** Etapas do funil, em qualquer ordem — a trilha ordena por `order`. */
  stages: PipelineStage[]
  /** Etapa escolhida para o nascimento do registro. */
  activeId: string
  onSelect: (stageId: string) => void
  /** Força o degrau 4. O mobile passa `true`. */
  compact?: boolean
  className?: string
}

/** Acima disto o meio é recolhido — abaixo de ~9 caracteres o rótulo não serve. */
const MAX_VISIVEIS = 6

const isTerminal = (s: PipelineStage) => s.isWon || s.isLost

export function PipelineTrail({ stages, activeId, onSelect, compact, className }: PipelineTrailProps) {
  const [listaAberta, setListaAberta] = useState(false)
  const semMovimento = useReducedMotion()
  // `layoutId` precisa ser único por instância: duas trilhas na mesma página
  // (diálogo + painel, por exemplo) fariam o anel voar de uma para a outra.
  const anelId = useId()

  const ordenadas = useMemo(
    () => stages.slice().sort((a, b) => a.order - b.order),
    [stages],
  )
  const idxAtivo = ordenadas.findIndex((s) => s.id === activeId)
  const ativa = idxAtivo >= 0 ? ordenadas[idxAtivo] : null

  /**
   * Degrau 3. Preserva primeira · vizinha anterior · ativa · vizinha seguinte ·
   * última, e agrupa o resto. O meio é o que menos importa na hora de CRIAR —
   * o operador quer saber onde entra e onde termina.
   */
  const itens = useMemo(() => {
    if (ordenadas.length <= MAX_VISIVEIS) {
      return ordenadas.map((s) => ({ tipo: 'etapa' as const, etapa: s }))
    }
    const manter = new Set([0, idxAtivo - 1, idxAtivo, idxAtivo + 1, ordenadas.length - 1])
    const saida: ({ tipo: 'etapa'; etapa: PipelineStage } | { tipo: 'grupo'; quantidade: number })[] = []
    let escondidas = 0
    ordenadas.forEach((etapa, i) => {
      if (manter.has(i)) {
        if (escondidas > 0) { saida.push({ tipo: 'grupo', quantidade: escondidas }); escondidas = 0 }
        saida.push({ tipo: 'etapa', etapa })
      } else {
        escondidas += 1
      }
    })
    if (escondidas > 0) saida.push({ tipo: 'grupo', quantidade: escondidas })
    return saida
  }, [ordenadas, idxAtivo])

  if (ordenadas.length === 0) return null

  /** Popover com o funil inteiro — saída do "+N" e do modo compacto. */
  const listaCompleta = (
    <Dropdown
      open={listaAberta}
      onClose={() => setListaAberta(false)}
      className="z-[70] p-1 max-h-72 overflow-y-auto"
      anchor={
        compact ? (
          <button
            type="button"
            onClick={() => setListaAberta((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={listaAberta}
            aria-label={`Etapa: ${ativa?.label ?? 'nenhuma'}. Trocar.`}
            className="flex items-center gap-3 min-w-0 rounded-lg px-1 py-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          >
            <span className="flex items-center gap-1.5 shrink-0" aria-hidden>
              {ordenadas.map((s) => (
                <i
                  key={s.id}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    s.id === activeId
                      ? 'bg-brand-400 ring-[3px] ring-brand-400/20'
                      : isTerminal(s) ? 'bg-surface-600' : 'bg-surface-700',
                  )}
                />
              ))}
            </span>
            <span className="flex items-baseline gap-2 min-w-0">
              <span className="text-xs font-semibold text-surface-100 truncate">{ativa?.label}</span>
              <span className="text-[10.5px] text-surface-500 shrink-0">
                {idxAtivo + 1} de {ordenadas.length}
              </span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setListaAberta((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={listaAberta}
            className="inline-flex items-center rounded-full border border-dashed border-surface-700 px-2 py-0.5 text-[10.5px] text-surface-500 hover:text-surface-300 hover:border-surface-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          >
            +{itens.reduce((n, i) => n + (i.tipo === 'grupo' ? i.quantidade : 0), 0)}
          </button>
        )
      }
    >
      <div className="px-3 pt-2 pb-2 mb-1 border-b border-surface-800">
        <p className="text-xs font-semibold text-surface-200">Etapa</p>
        <p className="mt-0.5 text-[11px] leading-snug text-surface-500">
          Coluna do quadro em que o registro nasce.
        </p>
      </div>
      {ordenadas.map((s) => (
        <ChipOption
          key={s.id}
          selected={s.id === activeId}
          onSelect={() => { onSelect(s.id); setListaAberta(false) }}
        >
          {s.label}{isTerminal(s) ? ' · encerramento' : ''}
        </ChipOption>
      ))}
    </Dropdown>
  )

  // ─── Degrau 4 ────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <nav aria-label="Etapa de entrada" className={cn('px-4 py-2.5 bg-surface-950 border-b border-surface-800', className)}>
        {listaCompleta}
      </nav>
    )
  }

  // ─── Degraus 1 a 3 ───────────────────────────────────────────────────────
  return (
    <nav aria-label="Etapa de entrada" className={cn('flex items-center px-4 py-3 bg-surface-950 border-b border-surface-800', className)}>
      {itens.map((item, i) => (
        <div key={item.tipo === 'etapa' ? item.etapa.id : `grupo-${i}`} className="contents">
          {i > 0 && <span className="flex-1 h-px bg-surface-800 mx-2.5 min-w-[10px]" aria-hidden />}
          {item.tipo === 'grupo' ? (
            <span className="shrink-0">{listaCompleta}</span>
          ) : (
            <Passo
              etapa={item.etapa}
              ativa={item.etapa.id === activeId}
              onSelect={onSelect}
              anelId={anelId}
              semMovimento={!!semMovimento}
            />
          )}
        </div>
      ))}
    </nav>
  )
}

/**
 * Um ponto da trilha.
 *
 * A ativa é `shrink-0` — é ela que nunca perde o rótulo quando falta largura
 * (degrau 2). As demais são `min-w-0` com reticências, e a dica no hover
 * devolve o nome inteiro.
 *
 * Terminal não recebe clique: negócio não nasce ganho nem perdido.
 */
function Passo({
  etapa,
  ativa,
  onSelect,
  anelId,
  semMovimento,
}: {
  etapa: PipelineStage
  ativa: boolean
  onSelect: (id: string) => void
  anelId: string
  semMovimento: boolean
}) {
  const terminal = isTerminal(etapa)

  const corpo = (
    <button
      type="button"
      disabled={terminal}
      onClick={() => onSelect(etapa.id)}
      aria-current={ativa ? 'step' : undefined}
      className={cn(
        'flex items-center gap-1.5 min-w-0 rounded-md px-1 py-0.5 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
        terminal ? 'cursor-default' : 'cursor-pointer hover:bg-surface-900',
      )}
    >
      <span className="relative flex items-center justify-center w-1.5 h-1.5 shrink-0" aria-hidden>
        {/* O anel é um elemento SÓ, compartilhado por todos os pontos: com
            `layoutId` o Framer o anima de uma etapa para a outra, e a troca
            de etapa vira um movimento em vez de um pisca-pisca. */}
        {ativa && (
          <motion.i
            layoutId={anelId}
            className="absolute inset-0 rounded-full bg-brand-400 ring-[3px] ring-brand-400/20"
            transition={semMovimento ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 34 }}
          />
        )}
        <i
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors',
            ativa ? 'bg-transparent' : terminal ? 'bg-surface-600' : 'bg-surface-700',
          )}
        />
      </span>
      <span
        className={cn(
          'text-[11.5px] truncate',
          ativa ? 'font-semibold text-surface-100' : terminal ? 'text-surface-600' : 'text-surface-500',
        )}
      >
        {etapa.label}
      </span>
    </button>
  )

  return (
    <span className={cn('flex items-center min-w-0', ativa ? 'shrink-0' : 'shrink')}>
      {ativa ? corpo : <Tooltip content={etapa.label} side="bottom">{corpo}</Tooltip>}
    </span>
  )
}
