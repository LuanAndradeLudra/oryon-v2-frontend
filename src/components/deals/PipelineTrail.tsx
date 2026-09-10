import { useId, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn, hexToRgba, tintaDaEtapa } from '@/lib/utils'
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
 * O espelho vai até a COR: cada etapa tem a sua (`stage.color`), e o quadro já
 * a usa no ponto e no rótulo da coluna. Aqui é a mesma convenção — é o que faz
 * a faixa ser reconhecida como "as colunas do meu funil" e não como um stepper
 * genérico. O rótulo "ETAPAS" à esquerda diz de que eixo a faixa fala, já que
 * o cabeçalho ali em cima nomeia o funil.
 *
 * ─── Os quatro degraus ───────────────────────────────────────────────────
 * O orçamento é apertado: 640 px úteis menos ~62 px do rótulo "ETAPAS", 14 px
 * fixos por etapa e 28 px por conector. Sobram ~79 px por rótulo com 5 etapas
 * (~13 caracteres) e ~35 px com 8 (inutilizável). Por isso a faixa NUNCA
 * colapsa — ela desce um degrau:
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
/* Quantas etapas a faixa mostra antes de agrupar o meio em "+N".

   Caiu de 6 para 5 quando os rótulos cresceram (11,5 → 12,5px): o mesmo número
   de passos passou a pedir mais largura, e a faixa começou a estourar antes de
   o agrupamento entrar. O corte de contenção acima impede a sobreposição; este
   número é o que evita chegar nela. */
const MAX_VISIVEIS = 5

const isTerminal = (s: PipelineStage) => s.isWon || s.isLost

/**
 * Cor da etapa, com piso.
 *
 * `hexToRgba` fatia a string na mão e devolveria `rgba(NaN,NaN,NaN,…)` para
 * qualquer coisa que não seja `#rrggbb` — e a coluna aceita texto livre. Aqui
 * o que não for hexadecimal de 6 dígitos cai no cinza da escala.
 */
const corDa = (s: PipelineStage) =>
  /^#[0-9a-f]{6}$/i.test(s.color ?? '') ? s.color : '#6B8080'

type ItemTrilha =
  | { tipo: 'etapa'; etapa: PipelineStage }
  | { tipo: 'grupo'; quantidade: number }

/** O conector `i` separa percurso de desfecho? (primeiro terminal da faixa) */
function fronteiraDesfecho(itens: ItemTrilha[], i: number) {
  const atual = itens[i]
  const anterior = itens[i - 1]
  if (atual?.tipo !== 'etapa' || !isTerminal(atual.etapa)) return false
  return anterior?.tipo !== 'etapa' || !isTerminal(anterior.etapa)
}

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
    const saida: ItemTrilha[] = []
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
              {ordenadas.map((s) => {
                const c = corDa(s)
                return (
                  <i
                    key={s.id}
                    className="w-1.5 h-1.5 rounded-full"
                    style={s.id === activeId
                      ? { backgroundColor: c, boxShadow: `0 0 0 3px ${hexToRgba(c, 0.22)}` }
                      : { backgroundColor: c, opacity: isTerminal(s) ? 0.35 : 0.5 }}
                  />
                )
              })}
            </span>
            <span className="flex items-baseline gap-2 min-w-0">
              <span
                className="text-xs font-semibold truncate"
                /* `#ECF1F1` era o surface-100 do tema ESCURO cravado à mão —
                   quase branco sobre o branco do tema claro. */
                style={{ color: ativa ? tintaDaEtapa(corDa(ativa)) : 'var(--color-surface-100)' }}
              >
                {ativa?.label}
              </span>
              <span className="text-[10.5px] text-surface-500 shrink-0">
                {idxAtivo + 1} de {ordenadas.length}
              </span>
            </span>
          </button>
        ) : (
          /* O "+N" esconde etapas e nada na tela diz o que ele faz — mesmo
             balão estilizado do resto da faixa, para não haver dois visuais de
             balão na mesma tira. */
          <Tooltip side="bottom" content="Clique para ver todas as etapas">
            <button
              type="button"
              onClick={() => setListaAberta((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={listaAberta}
              className="inline-flex items-center rounded-full border border-dashed border-surface-700 px-2 py-0.5 text-[11px] text-surface-500 hover:text-surface-300 hover:border-surface-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
            >
              +{itens.reduce((n, i) => n + (i.tipo === 'grupo' ? i.quantidade : 0), 0)}
            </button>
          </Tooltip>
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
          <span className="inline-flex items-center gap-2">
            <i
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: corDa(s), opacity: isTerminal(s) ? 0.5 : 1 }}
              aria-hidden
            />
            {s.label}{isTerminal(s) ? ' · encerramento' : ''}
          </span>
        </ChipOption>
      ))}
    </Dropdown>
  )

  // ─── Degrau 4 ────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <nav aria-label="Etapa de entrada" className={cn('flex items-center gap-2.5 px-4 py-2.5 bg-surface-950 border-b border-surface-800', className)}>
        <span className="text-3xs font-mono uppercase tracking-wider text-surface-500 shrink-0">Etapas</span>
        <span className="w-px h-3 bg-surface-800 shrink-0" aria-hidden />
        {listaCompleta}
      </nav>
    )
  }

  // ─── Degraus 1 a 3 ───────────────────────────────────────────────────────
  return (
    /* `overflow-hidden` + `min-w-0`: a CONTENÇÃO da faixa.

       Sem isso a trilha transbordava para fora da própria caixa quando os
       rótulos não cabiam — e, como o contador ("3 de 3 · 11 dias") é irmão dela
       na mesma linha, o excesso era pintado POR CIMA dele. Um flex item só
       encolhe até o conteúdo se puder; sem `min-w-0` ele empurra, e sem
       `overflow-hidden` o que sobra vaza em vez de ser cortado.

       O recorte é horizontal por natureza do problema (a trilha crescia para o
       lado), mas `overflow-hidden` corta nos dois eixos: quem pinta FORA da
       própria caixa — o anel de 3px do ponto ativo — precisa de folga vertical
       de quem monta a faixa, senão a sombra é cortada em reta. Ver o `py-1
       -my-1` no `DealProgress`.

       Com os dois, o pior caso vira um rótulo cortado — e cortado tem quem o
       leia: é exatamente para isso que o balão carrega o nome inteiro. */
    <nav aria-label="Etapa de entrada" className={cn('flex items-center min-w-0 overflow-hidden px-4 py-3 bg-surface-950 border-b border-surface-800', className)}>
      {/* Diz de que eixo a faixa fala. O cabeçalho logo acima nomeia o funil,
          então aqui basta o substantivo. */}
      <span className="flex items-center gap-2.5 shrink-0 mr-2.5">
        <span className="text-3xs font-mono uppercase tracking-wider text-surface-500">Etapas</span>
        <span className="w-px h-3 bg-surface-800" aria-hidden />
      </span>
      {itens.map((item, i) => (
        <div key={item.tipo === 'etapa' ? item.etapa.id : `grupo-${i}`} className="contents">
          {i > 0 && (
            // O fio vira tracejado onde o funil deixa de ser percurso e vira
            // desfecho. É a única fronteira real da faixa: antes dela o
            // negócio anda, depois dela ele acaba.
            <span
              className={cn(
                'flex-1 mx-2.5 min-w-[10px]',
                fronteiraDesfecho(itens, i)
                  ? 'h-0 border-t border-dashed border-surface-700'
                  : 'h-px bg-surface-800',
              )}
              aria-hidden
            />
          )}
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
  // O quadro usa `stage.color` no ponto e no rótulo da coluna; a faixa repete.
  // `#6B8080` é o cinza de fallback para etapa sem cor gravada.
  const cor = corDa(etapa)

  const corpo = (
    <button
      type="button"
      disabled={terminal}
      onClick={() => onSelect(etapa.id)}
      aria-current={ativa ? 'step' : undefined}
      className={cn(
        'flex items-center gap-1.5 min-w-0 rounded-md px-1 py-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
        // O passo CRESCE ao passar o mouse. Numa faixa de texto pequeno, fundo
        // sozinho é fraco demais para dizer "isto reage"; escala diz na hora.
        // 4% é o teto útil: acima disso o rótulo se desloca em relação aos
        // vizinhos e a faixa parece tremer. `origin-left` faz o passo crescer
        // para DENTRO da faixa em vez de empurrar quem está à esquerda.
        // 220ms com ease-out-quint: a escala desacelera até assentar. Em 150ms
        // com ease-out padrão o passo 'pula' — o movimento termina cedo demais
        // para o olho acompanhar num alvo desse tamanho.
        'transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left',
        'motion-reduce:transition-none',
        terminal
          ? 'cursor-default'
          : 'cursor-pointer hover:bg-surface-900 hover:scale-[1.03] motion-reduce:hover:scale-100',
      )}
    >
      {terminal ? (
        // Terminal não é um passo do caminho — é o desfecho. Ponto maior, com
        // o sinal do que ele significa: ✓ para o ganho, × para a perda. A
        // opacidade sozinha dizia só "apagado", que tanto podia ser
        // "encerramento" quanto "ainda não chegou".
        <span
          className="flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0 border"
          style={{ borderColor: tintaDaEtapa(cor, 0.55), color: tintaDaEtapa(cor) }}
          aria-hidden
        >
          {etapa.isWon
            ? <Check className="w-2 h-2" strokeWidth={3.5} />
            : <X className="w-2 h-2" strokeWidth={3.5} />}
        </span>
      ) : (
      <span className="relative flex items-center justify-center w-1.5 h-1.5 shrink-0" aria-hidden>
        {/* O anel é um elemento SÓ, compartilhado por todos os pontos: com
            `layoutId` o Framer o anima de uma etapa para a outra, e a troca
            de etapa vira um movimento em vez de um pisca-pisca. A cor viaja
            junto, então o anel também troca de tom no caminho. */}
        {ativa && (
          <motion.i
            layoutId={anelId}
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: cor, boxShadow: `0 0 0 3px ${hexToRgba(cor, 0.22)}` }}
            transition={semMovimento ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 34 }}
          />
        )}
        <i
          // Cor E opacidade no mesmo tempo do anel: quando a etapa deixa de
          // ser a atual, o fundo do ponto volta enquanto o anel desliza para a
          // etapa nova. Animar só a opacidade fazia a cor reaparecer de estalo
          // no meio do movimento.
          className="w-1.5 h-1.5 rounded-full transition-[background-color,opacity] duration-200 ease-out"
          // Inativa fica na PRÓPRIA cor, esmaecida: é o que faz a faixa ler
          // como as colunas do quadro, e não como um stepper qualquer.
          style={ativa ? undefined : { backgroundColor: cor, opacity: 0.5 }}
        />
      </span>
      )}
      <span
        /* O rótulo cresceu (11,5 → 12,5px) e o ATIVO cresce mais (13px).

           Preferi tamanho a cor: a cor aqui já tem dono — ela diz QUAL etapa é,
           e é a mesma do quadro. Intensificá-la para chamar atenção faria a
           faixa competir com o próprio código de cores e, no tema claro, essa
           paleta não tem para onde subir sem sujar. Tamanho e peso são o
           recurso que ainda estava livre. */
        className={cn(
          'truncate transition-colors duration-200 ease-out',
          ativa ? 'text-[13px] font-semibold' : 'text-[12.5px]',
        )}
        style={ativa
          ? { color: tintaDaEtapa(cor) }
          : terminal
            // Cinza, não a cor a 62%: o desfecho já é dito pelo ✓/× acima, e
            // cor esmaecida some no tema claro.
            ? { color: 'var(--color-surface-400)' }
            : { color: 'var(--color-surface-500)' }}
      >
        {etapa.label}
      </span>
    </button>
  )

  return (
    /* O balão volta, e volta ESTILIZADO — o `title` nativo não serve aqui.

       O motivo é a própria faixa: com muitas etapas ela encolhe os rótulos até
       "No…", "Ate…", "Fe…". Nesse estado o texto na tela não identifica mais a
       etapa, e o balão deixa de ser repetição para virar a ÚNICA leitura
       possível. Foi por não considerar a trilha encolhida que eu o removi.

       Por isso ele traz o rótulo INTEIRO em destaque e a ação embaixo, em tom
       de apoio: identidade primeiro, instrução depois.

       Só nas não-ativas: a etapa atual é `shrink-0`, nunca encolhe, e sempre se
       lê por completo. */
    <span className={cn('flex items-center min-w-0', ativa ? 'shrink-0' : 'shrink')}>
      {ativa ? corpo : (
        <Tooltip
          side="bottom"
          wide
          content={
            <span className="block leading-snug">
              <span className="block font-semibold text-surface-50">{etapa.label}</span>
              <span className="block text-surface-400">
                {terminal
                  ? 'Encerramento do funil — fechar exige motivo, então não é etapa de entrada.'
                  : 'Clique para mover para esta etapa'}
              </span>
            </span>
          }
        >
          {corpo}
        </Tooltip>
      )}
    </span>
  )
}
