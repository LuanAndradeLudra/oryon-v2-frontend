import { useState, useMemo } from 'react'
import { ArrowRight, MoreVertical, ArrowRightLeft, UserPlus, Clock, Phone, Plus, Handshake, ChevronDown, CalendarClock } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn, tintaDaEtapa, getActivePipelines, getInitials } from '@/lib/utils'
import { pipelineKindOf, pipelineKindOption, terminalLabelsOf, pipelineNoun, TERMINAL_CHIP_STYLE } from '@/lib/pipelineKinds'
import { originInfo, movedByChip, timeInStage, stuckDaysInStage, boardStats, entrySources } from '@/lib/dealCard'
import { dealProbability } from '@/lib/dealProbability'
import type { Deal, Pipeline, PipelineStage, User } from '@/types'

interface DealsBoardProps {
  stages: PipelineStage[]
  dealsByStage: Record<string, Deal[]>
  onMoveStage: (deal: Deal, toStageId: string) => void
  loading?: boolean
  /** Abre a ficha do contato do negócio — chip "ver contato →" no card. */
  onOpenContact?: (contactId: string) => void
  /** Funis do tenant — alimenta o menu "Transferir de funil" de cada card
   *  (SCRUM-293). Omitido/vazio = menu não aparece. */
  pipelines?: Pipeline[]
  onMovePipeline?: (deal: Deal, toPipelineId: string) => void
  /** F7 (SCRUM-867): funil sem nenhum card → empty state com "Adicionar contato ao funil".
   *  Omitido = só as colunas vazias (comportamento anterior). */
  onAddContact?: () => void
  /**
   * A3 (SCRUM-925): abre o "Novo negócio" já na etapa clicada. Presente só em
   * funil de VENDA — em processo o registro nasce pelo "Adicionar ao funil" de
   * 1 clique, sem formulário. Quando existe, ele é a ação primária do board
   * (P2) e substitui o CTA do vazio, que abria o cadastro completo de contato
   * (F-FUNIL-24: o operador queria um negócio, não um contato novo).
   */
  onNewDeal?: (stageId: string) => void
  /** Substantivo do card por tipo de funil ("negócio" × "registro", decisão (a)). Default: derivado de `pipeline`, senão "negócio". */
  itemNoun?: string
  /** F8 (SCRUM-869): o funil deste board — `kind` decide o card (processo: contato como título, sem valor) e os rótulos dos terminais. */
  pipeline?: Pipeline | null
  /** B2 (SCRUM-928): `?deal=<id>` no board — destaca e centraliza o card. A
   *  ficha em si abre pelo mesmo param, globalmente (`DealPanelContext`);
   *  aqui é só o realce visual. */
  highlightDealId?: string | null
  /** R2-1E-CARD-01: negócio cuja ficha está aberta — o card ganha borda de acento + anel de 3px (estado "selecionado / painel aberto" do mock). */
  selectedDealId?: string | null
  /** R2-1E-BAR-05: a faixa de contexto (tipo, contagens, entradas) vira tooltip do resumo da barra do funil — `false` a esconde. Default true (usos isolados e testes). */
  showContextStrip?: boolean
  /** D2 (SCRUM-935/F-FUNIL): clicar no CORPO do card abre a ficha do negócio
   *  (B2/928). Omitido = card não abre nada ao clicar (compat com chamadores
   *  antigos/testes que não precisam desse comportamento). */
  onOpenDeal?: (dealId: string) => void
  /** D2: usuários do tenant, para resolver o nome do dono no card de venda
   *  (F-FUNIL-11). Omitido/sem match = "Sem dono". */
  users?: User[]
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Kanban de NEGÓCIOS de um pipeline — um card por Deal, colunas = estágios.
 * Drag-drop nativo (mesmo padrão do ContactsKanban). A mudança de estágio deriva
 * o status no backend (ganho/perdido nos terminais).
 */
export function DealsBoard({
  onAddContact,
  onNewDeal,
  itemNoun,
  pipeline,
  stages, dealsByStage, onMoveStage, loading, onOpenContact, pipelines = [], onMovePipeline,
  highlightDealId,
  selectedDealId,
  showContextStrip = true,
  onOpenDeal,
  users = [],
}: DealsBoardProps) {
  // `useIsMobile` (matchMedia + resize listener) em vez de `window.innerWidth`
  // lido direto no render — o valor cru só era recalculado quando ALGUM
  // OUTRO estado mudasse a re-renderizar o componente; redimensionar a janela
  // sozinho não atualizava o layout (min-width da coluna) até isso acontecer.
  const isDesktop = !useIsMobile()
  /**
   * O ponteiro ARRASTA? O drag do card é HTML5 nativo (`draggable`), que não
   * existe em toque — sem mouse, não há como mover um card no quadro.
   *
   * A pergunta é de CAPACIDADE do ponteiro, não de largura de tela: um iPad
   * em paisagem tem 1024 px e passaria por "desktop" no `useIsMobile`, mas
   * continua sem arrastar. `(hover: hover) and (pointer: fine)` é o que
   * separa mouse de dedo.
   */
  const ponteiroArrasta = useMediaQuery('(hover: hover) and (pointer: fine)')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStageId, setOverStageId] = useState<string | null>(null)
  const [pipelineMenuDealId, setPipelineMenuDealId] = useState<string | null>(null)
  // F-FUNIL-09: drag nativo não funciona por toque — "Mover ▾" abre um menu
  // com as demais etapas, chamando o MESMO `onMoveStage` do drag-and-drop.
  const [stageMenuDealId, setStageMenuDealId] = useState<string | null>(null)
  // Todos os `stages` recebidos são do MESMO pipeline (board de um funil só) —
  // basta ler de qualquer um pra saber qual funil excluir das opções do menu.
  const currentPipelineId = stages[0]?.pipelineId
  const otherPipelines = getActivePipelines(pipelines).filter((p) => p.id !== currentPipelineId)

  // PL-C2-CAR-2: fechar ao clicar fora agora é do `Dropdown` (ele já cobre
  // isso, mais Escape e a pilha de camadas — ver P3.2). O listener de
  // document manual que vivia aqui era só pros dois menus em <div> cru.

  /**
   * C2 (SCRUM-933) — quantos negócios ABERTOS cada contato tem NESTE board.
   * Com `allowMultipleOpen` (C1 · SCRUM-932) o mesmo contato aparece em vários
   * cards, possivelmente em colunas diferentes: sem marcação, dois cards com o
   * mesmo avatar e o mesmo nome parecem duplicata ou bug. A contagem é do
   * board inteiro, não da coluna — é atravessando as colunas que a repetição
   * confunde.
   */
  const openByContact = useMemo(() => {
    const n = new Map<string, number>()
    for (const st of stages) {
      for (const d of dealsByStage[st.id] ?? []) {
        if (d.status !== 'open' || !d.contactId) continue
        n.set(d.contactId, (n.get(d.contactId) ?? 0) + 1)
      }
    }
    return n
  }, [stages, dealsByStage])

  const draggingDeal: Deal | null = (() => {
    if (!draggingId) return null
    for (const s of stages) {
      const found = (dealsByStage[s.id] ?? []).find((d) => d.id === draggingId)
      if (found) return found
    }
    return null
  })()

  const handleDrop = (stageId: string) => {
    if (draggingDeal && draggingDeal.stageId !== stageId) {
      onMoveStage(draggingDeal, stageId)
    }
    setDraggingId(null)
    setOverStageId(null)
  }

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-surface-500">
        Este pipeline não tem estágios configurados.
      </div>
    )
  }

  // Empty state do funil recém-criado (F7): as colunas continuam visíveis
  // (o usuário vê as etapas que acabou de montar) e o CTA abre o cadastro de
  // contato já com este funil selecionado. Só aparece sem NENHUM card e com
  // os dados carregados — durante o loading o skeleton das colunas basta.
  const totalCards = stages.reduce((n, st) => n + (dealsByStage[st.id]?.length ?? 0), 0)
  const showEmpty = !loading && totalCards === 0 && (!!onAddContact || !!onNewDeal)
  // Etapa de partida do "Novo negócio" — a 1ª NÃO-terminal. Criar direto num
  // terminal é 400 no backend desde a A4 (fechar exige motivo), então nem o
  // vazio nem o "+" da coluna oferecem isso.
  const firstOpenStage = stages.find((s) => !s.isWon && !s.isLost) ?? null
  // F8 (SCRUM-869): vocabulário por tipo. Funil de VENDA renderiza exatamente
  // como antes (título, valor, chips ganho/perdido); funil de PROCESSO mostra
  // o contato como título, esconde valor/total e usa Concluído/Cancelado.
  const isProcess = pipelineKindOf(pipeline) === 'process'
  const terminalLabels = terminalLabelsOf(pipeline)
  const noun = itemNoun ?? (pipeline ? pipelineNoun(pipeline) : 'negócio')

  // D2 (SCRUM-935/F-FUNIL-10): UMA faixa de contexto só (tipo do funil,
  // entradas, contagens e total) — antes vinham DUAS faixas empilhadas de
  // fora (ContactsPage). Migrada pra cá porque só existe quando `pipeline`
  // está presente (chamadores antigos/testes sem esse prop não a veem).
  //
  // A faixa usa `board-bar`, como o cabeçalho da página logo acima: as
  // duas formam a barra de contexto do funil, e só as colunas ficam no chão.
  // No escuro o token É o chão (a barra se funde com a TopBar e só a borda a
  // separa do quadro); no claro ela é branca e sobe. Antes era `surface-950/40`
  // — o próprio chão com um véu, que no tema claro
  // deixava a barra cinza enquanto os cards eram brancos, invertendo a
  // hierarquia (o que informa recuava, o que é conteúdo subia).
  const allDeals = pipeline ? Object.values(dealsByStage).flat() : []
  const stats = pipeline ? boardStats(allDeals) : null
  const entries = pipeline ? entrySources(allDeals) : []
  const kindOption = pipeline ? pipelineKindOption(pipelineKindOf(pipeline)) : null

  // R2-1E-COL: colunas abertas seguem a ordem do funil; as terminais (`isWon`/
  // `isLost` — o tipo já vem na etapa) vão empilhadas numa coluna única à
  // direita, separada por borda tracejada (README 3.4). Cada etapa mantém o
  // próprio alvo de drop, então o fluxo de fechar com motivo não muda.
  const openStages = stages.filter((s) => !s.isWon && !s.isLost)
  const terminalStages = stages.filter((s) => s.isWon || s.isLost)
  const renderColumn = (stage: PipelineStage, terminal = false) => {
    const cards = dealsByStage[stage.id] ?? []
    const isOver = overStageId === stage.id && !!draggingDeal && draggingDeal.stageId !== stage.id
    const totalCents = cards.reduce((sum, d) => sum + (d.amountCents ?? 0), 0)
    // D2 (F-FUNIL-10): total ponderado por coluna, mesma probabilidade
    // efetiva usada no card e na ficha (dealProbability) — nunca uma
    // conta paralela.
    const weightedCents = cards.reduce((sum, d) => sum + dealProbability(d, stage).weightedAmountCents, 0)

    return (
      <div
        key={stage.id}
        className={terminal ? cn('flex flex-col flex-1 min-h-0', stage.isLost && 'mt-2') : 'flex flex-col w-[85vw] md:w-[250px] flex-shrink-0 snap-start'}
        onDragOver={(e) => { e.preventDefault(); setOverStageId(stage.id) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStageId(null) }}
        onDrop={() => handleDrop(stage.id)}
      >
        {/* Header da coluna — README 3.4: 28px, border-bottom 2px na cor
            crua da etapa. */}
        <div
          className={cn('flex items-center justify-between gap-[7px] h-7 px-1 mb-2 border-b-2', terminal && stage.isLost && 'rounded-t-[4px]')}
          style={{ borderColor: stage.color, ...(terminal && stage.isLost ? { backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' } : null) }}
        >
          <div className="flex items-center gap-[7px] min-w-0">
            {/* canvas 1e: sem ponto colorido — a cor vive na linha de 2px e no texto. Terminais usam ok/perigo. */}
            <span
              className={cn('text-[12.5px] font-bold truncate', terminal && (stage.isWon ? 'text-success' : 'text-danger'))}
              style={terminal ? undefined : { color: tintaDaEtapa(stage.color) }}
            >
              {stage.label}
            </span>
            {stage.isWon && stage.label.toLowerCase() !== terminalLabels.won.toLowerCase() && (
              <span
                className="text-3xs px-1.5 py-0.5 rounded border color-chip-soft"
                style={TERMINAL_CHIP_STYLE.won}
              >
                {terminalLabels.won.toLowerCase()}
              </span>
            )}
            {stage.isLost && stage.label.toLowerCase() !== terminalLabels.lost.toLowerCase() && (
              <span
                className="text-3xs px-1.5 py-0.5 rounded border color-chip-soft"
                style={TERMINAL_CHIP_STYLE.lost}
              >
                {terminalLabels.lost.toLowerCase()}
              </span>
            )}
            {/* DEAL-COL-16: contagem como texto solto ao lado do título. */}
            <span className="text-[11.5px] font-semibold text-surface-500 tabular-nums">
              {cards.length}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* DEAL-COL-17 (spec/1e-funis.GAPS.md): soma inline na MESMA
                linha do cabeçalho, não numa linha separada abaixo. */}
            {!isProcess && totalCents > 0 && (
              <span
                className="text-[11.5px] text-surface-400 tabular-nums whitespace-nowrap"
                title={weightedCents !== totalCents ? `${brl(weightedCents)} ponderado` : undefined}
              >
                {brl(totalCents)}
              </span>
            )}
            {/* A3: criar já nesta etapa. Fora dos terminais — negócio não
                nasce fechado (a A4 exige motivo, e o backend responde 400). */}
            {onNewDeal && !stage.isWon && !stage.isLost && (
              <button
                type="button"
                onClick={() => onNewDeal(stage.id)}
                aria-label={`Novo ${noun} em ${stage.label}`}
                title={`Novo ${noun} em ${stage.label}`}
                className="w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de cards */}
        <div
          className={cn(
            'flex flex-col gap-2 flex-1 overflow-y-auto pb-4 rounded-lg transition-all duration-200 min-h-[80px]',
            isOver ? 'bg-brand-500/5 ring-2 ring-brand-500/30 ring-inset' : 'bg-transparent',
            loading && cards.length > 0 && 'opacity-50',
          )}
        >
          {/* As três leituras da coluna (carregando · vazia · com cards)
              têm CHAVE, e isso não é enfeite. Sem chave o React casa por
              posição e tipo: o `div` do esqueleto e o `div` do vazio são
              o mesmo nó, reaproveitado. O nó chegava sem `border-color`
              (o padrão do Tailwind v4 é `currentColor`) e recebia
              `border-surface-700` JUNTO com `transition-colors` — então
              a borda ANIMAVA de `currentColor` até o cinza.

              `currentColor` ali é a cor de texto herdada do body:
              `surface-100`, que é #ECF1F1 no escuro e #1A1F2E no claro.
              Por isso o tracejado piscava CLARO no tema escuro e ESCURO
              no tema claro — o inverso do tema, sempre. Não era a cor do
              vazio, era o ponto de partida da transição.

              Com chave, cada leitura monta seu próprio nó e já nasce na
              cor final; `transition-colors` volta a servir só ao que foi
              feito para servir, o realce de arrastar-sobre. */}
          {loading && cards.length === 0 ? (
            /* `surface-700`, não `surface-800`: a escala é INVERTIDA por
               tema, e a 800 no claro é #FFFFFF — o esqueleto seria um
               retângulo branco pulsando sobre o chão cinza. A 700 é cinza
               claro no claro (#D9DCE5) e escuro no escuro (#243333). */
            <div key="carregando" className="h-16 rounded-xl bg-surface-700/50 animate-pulse" aria-hidden />
          ) : cards.length === 0 ? (
            terminal && stage.isWon && !isOver ? (
              <div key="vazia" className="border border-surface-700 rounded-lg bg-surface-900 px-3 py-2.5 text-xs text-surface-400 leading-[1.5]">
                Solte aqui para marcar como <b className="font-bold text-surface-100">{terminalLabels.won}</b>. Etapas terminais pedem motivo.
              </div>
            ) : (
              <div key="vazia" className={cn(
                // canvas 1e: slot de drop = retângulo tracejado 1px, raio 8, 88px (Perdido: borda e fundo de perigo).
                'border border-dashed rounded-lg h-[88px] flex items-center justify-center px-3 text-center transition-colors',
                isOver
                  ? 'border-brand-500/60 bg-brand-500/5'
                  : terminal && stage.isLost
                    ? 'border-danger bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]'
                    : 'border-[var(--bd2)] bg-surface-900',
              )}>
                <span className={cn('text-xs', isOver ? 'text-brand-400' : 'text-surface-500')}>
                  {isOver ? 'Soltar aqui' : terminal ? `Solte aqui para marcar como ${stage.isWon ? terminalLabels.won : terminalLabels.lost}` : `Nenhum ${noun}`}
                </span>
              </div>
            )
          ) : (
            cards.map((deal) => (
              <div
                key={deal.id}
                ref={highlightDealId === deal.id ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  setTimeout(() => setDraggingId(deal.id), 0)
                }}
                onDragEnd={() => { setDraggingId(null); setOverStageId(null) }}
                onClick={() => onOpenDeal?.(deal.id)}
                data-testid={highlightDealId === deal.id ? 'deal-card-highlighted' : undefined}
                className={cn(
                  // README 3.4: borda 1px, raio 8px, padding 10px 12px.
                  'relative group/card rounded-lg border border-surface-700 bg-surface-900 px-3 py-2.5 cursor-grab active:cursor-grabbing transition-[opacity,box-shadow] duration-100 hover:border-[var(--bd2)] hover:bg-[var(--rowhover)]',
                  onOpenDeal && 'cursor-pointer',
                  // Em arraste: única sombra fora de overlay (o card É um overlay enquanto flutua).
                  draggingId === deal.id && 'opacity-95 shadow-[var(--shadow-overlay)] rotate-[-1.5deg] border-[var(--bd2)]',
                  selectedDealId === deal.id && 'border-brand-500 hover:border-brand-500 ring-[3px] ring-brand-500/20',
                  highlightDealId === deal.id && 'ring-[3px] ring-brand-500 border-brand-500',
                )}
              >
                {/* Ações do card — SEMPRE visíveis no mobile (não só no
                    hover, que não existe por toque); no desktop seguem
                    reveladas por hover/foco, como antes. */}
                <div className={cn('absolute top-2 right-2 z-10 flex items-center gap-1', !isDesktop && 'opacity-100')}>
                  {/* F-FUNIL-09: "Mover ▾" — a alternativa ao drag para
                      quem NÃO tem mouse. Some onde o arrasto funciona
                      (10/09): ali eram dois caminhos para o mesmo gesto,
                      e o botão ainda cobria o canto do card no hover.
                      Onde o ponteiro não arrasta ele continua sendo o
                      ÚNICO jeito de mover um card, então fica. */}
                  {!ponteiroArrasta && (
                    // PL-C2-CAR-2 (P3): era um <div absolute> à mão, sem
                    // portal nem `useLayer` — dentro da coluna (`overflow-y-auto`),
                    // um card perto do fim ficava com o menu CORTADO pelo
                    // scroll (às vezes invisível de vez). O `Dropdown`
                    // primitivo (mesmo usado em `DealSummary.tsx` para o
                    // mesmo gesto) portala pro `body` e entra na pilha de
                    // camadas — nunca mais corta.
                    <Dropdown
                      open={stageMenuDealId === deal.id}
                      onClose={() => setStageMenuDealId(null)}
                      align="right"
                      className="w-44"
                      anchor={
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setStageMenuDealId(stageMenuDealId === deal.id ? null : deal.id)
                          }}
                          className={cn(
                            'flex items-center gap-0.5 h-[22px] px-[7px] rounded-md border border-[var(--bd2)] text-3xs font-medium text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all',
                            stageMenuDealId === deal.id || !isDesktop ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100',
                          )}
                          aria-label={`Mover ${noun} para outra etapa`}
                        >
                          Mover <ChevronDown className="w-3 h-3" />
                        </button>
                      }
                    >
                      <div className="px-1 py-1 flex flex-col gap-0.5">
                        {stages.filter((s) => s.id !== deal.stageId).map((s) => (
                          <DropdownItem key={s.id} onClick={() => { onMoveStage(deal, s.id); setStageMenuDealId(null) }}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </DropdownItem>
                        ))}
                      </div>
                    </Dropdown>
                  )}
                  {onMovePipeline && otherPipelines.length > 0 && (
                    <Dropdown
                      open={pipelineMenuDealId === deal.id}
                      onClose={() => setPipelineMenuDealId(null)}
                      align="right"
                      className="w-48"
                      anchor={
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPipelineMenuDealId(pipelineMenuDealId === deal.id ? null : deal.id)
                          }}
                          className={cn(
                            'p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all',
                            pipelineMenuDealId === deal.id || !isDesktop ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100',
                          )}
                          aria-label="Mais ações"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      }
                    >
                      <div className="px-3 py-2 border-b border-surface-700">
                        <span className="text-3xs font-semibold text-surface-500 uppercase tracking-wide flex items-center gap-1.5">
                          <ArrowRightLeft className="w-3 h-3" /> Transferir de funil
                        </span>
                      </div>
                      <div className="px-1 py-1 flex flex-col gap-0.5">
                        {otherPipelines.map((p) => (
                          <DropdownItem key={p.id} onClick={() => { onMovePipeline(deal, p.id); setPipelineMenuDealId(null) }}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            {p.name}
                          </DropdownItem>
                        ))}
                      </div>
                    </Dropdown>
                  )}
                </div>
                {isProcess ? (
                  <ProcessCardBody deal={deal} onOpenContact={onOpenContact} siblings={openByContact.get(deal.contactId ?? '') ?? 1} />
                ) : (
                  <SalesCardBody deal={deal} onOpenContact={onOpenContact} users={users} siblings={openByContact.get(deal.contactId ?? '') ?? 1} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      // touch-pan-x: avisa o navegador que este container trata o gesto
      // horizontal — reduz a disputa com o swipe nativo de "voltar" do
      // iOS/Android perto da borda da tela, sem desabilitar o scroll-snap.
      className="flex-1 overflow-x-auto kanban-scroll touch-pan-x snap-x snap-mandatory md:snap-none flex flex-col"
    >
      {showContextStrip && pipeline && stats && kindOption && (
        <div className="border-b border-surface-700 bg-board-bar flex-shrink-0 px-4 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-surface-500" data-testid="board-context-strip">
          <span className="inline-flex items-center gap-1 text-3xs font-semibold px-1.5 py-0.5 rounded-full bg-surface-900 border border-surface-700 text-surface-300">
            <kindOption.icon className="w-3 h-3" /> {kindOption.label}
          </span>
          <span>
            {isProcess
              ? `Um ${noun} por contato por passagem. Sem valor, sem produtos.`
              : `Negócios com valor — fecham em ${terminalLabels.won} ou ${terminalLabels.lost} e entram na receita.`}
          </span>
          <span className="text-surface-600">·</span>
          <span data-testid="board-stats">
            {stats.open} aberto{stats.open === 1 ? '' : 's'}
            {' · '}{stats.wonToday} {terminalLabels.won.toLowerCase()}{stats.wonToday === 1 ? '' : 's'} hoje
            {' · '}{stats.lost} {terminalLabels.lost.toLowerCase()}{stats.lost === 1 ? '' : 's'}
          </span>
          <span className="text-surface-600">·</span>
          <span>
            Entradas:{' '}
            {entries.length > 0
              ? entries.map((e, i) => <span key={e} className="text-surface-300">{i > 0 ? ', ' : ''}{e}</span>)
              : <span className="text-surface-400">nenhuma ainda</span>}
          </span>
        </div>
      )}
      {showEmpty && (
        <div className="px-4 pt-4 flex-shrink-0" data-testid="deals-board-empty">
          {/* A3: em funil de venda o CTA cria o NEGÓCIO (o contato é escolhido
              dentro do diálogo). Em processo segue abrindo o cadastro de
              contato, que é o gesto certo lá. */}
          {onNewDeal && firstOpenStage ? (
            <EmptyState
              icon={Handshake}
              title={`Nenhum ${noun} neste funil ainda`}
              hint={`As etapas já estão prontas. Crie o primeiro ${noun} — ele entra em ${firstOpenStage.label}.`}
              action={{ label: `Novo ${noun}`, onClick: () => onNewDeal(firstOpenStage.id) }}
            />
          ) : (
            <EmptyState
              icon={UserPlus}
              title={`Nenhum ${noun} neste funil ainda`}
              hint={`As etapas já estão prontas. Adicione um contato para abrir o primeiro ${noun} — ele entra na primeira etapa.`}
              action={onAddContact ? { label: 'Adicionar contato ao funil', onClick: onAddContact } : undefined}
            />
          )}
        </div>
      )}
      <div
        className="flex gap-[10px] px-4 py-3 h-full min-h-0"
        style={{ minWidth: isDesktop ? openStages.length * 260 + (terminalStages.length > 0 ? 190 : 0) : undefined }}
      >
        {openStages.map((stage) => renderColumn(stage))}
        {terminalStages.length > 0 && (
          <div
            className="flex flex-col gap-2 w-[85vw] md:w-auto md:flex-1 md:min-w-[180px] flex-shrink-0 md:flex-shrink snap-start min-h-0 border-l border-dashed border-[var(--bd2)] pl-[10px]"
            data-testid="board-terminal-column"
          >
            {terminalStages.map((stage) => renderColumn(stage, true))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Corpo do card em funil de PROCESSO (F8 · SCRUM-870, prancheta 2): o
 * paciente/contato é o título; sem valor; abaixo, de onde veio (campanha ·
 * evento · IA · manual · importação) e quem moveu por último (auto / IA);
 * por fim, tempo na etapa e telefone. Tudo vem do próprio `Deal` do board
 * (`GET /deals?pipelineId=`, F8-870) — nenhuma chamada extra por card.
 */
/**
 * C2 (SCRUM-933): selo "1 de N" no card quando o contato tem mais de um
 * negócio aberto neste board. Não é enfeite — sem ele, dois cards com o mesmo
 * nome e o mesmo avatar em colunas diferentes leem como duplicata, e o
 * operador não tem como saber que são propostas distintas do mesmo cliente.
 */
/**
 * Observações no card (`description`, B1/SCRUM-927). O campo existia no banco e na
 * ficha, mas o card nunca o mostrava — num board de processo, onde o título é
 * o nome do contato, isso deixava os cards indistinguíveis entre si. Duas
 * linhas no máximo; o texto inteiro fica no `title`.
 */
function CardScope({ description }: { description?: string | null }) {
  const text = (description ?? '').trim()
  if (!text) return null
  return (
    // Rótulo em cima, valor embaixo — mesma gramática dos outros valores
    // rotulados do produto (as faixas "Em aberto"/"Ganho" do painel do
    // contato). Sem ele o texto ficava solto no card: dava para ler, mas não
    // para saber o que era — título? observação? Um ícone não resolveria:
    // símbolo sem legenda não ensina.
    <div className="mt-3 mb-2.5" data-testid="card-scope" title={text}>
      <span className="block text-3xs uppercase tracking-wide text-surface-500 leading-none">Observações</span>
      <p className="mt-0.5 text-2xs text-surface-300 line-clamp-2 leading-snug">{text}</p>
    </div>
  )
}

function SiblingBadge({ siblings }: { siblings: number }) {
  if (siblings < 2) return null
  return (
    <span
      className="text-3xs text-surface-400 bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
      title={`Este contato tem ${siblings} negócios abertos neste funil`}
      data-testid="card-sibling-badge"
    >
      +{siblings - 1}
    </span>
  )
}

function ProcessCardBody({ deal, onOpenContact, siblings = 1 }: { deal: Deal; onOpenContact?: (contactId: string) => void; siblings?: number }) {
  const origin = originInfo(deal)
  const OriginIcon = origin.icon
  const by = movedByChip(deal)
  const time = timeInStage(deal)
  const stuckDays = stuckDaysInStage(deal)
  const name = deal.contact?.displayName ?? deal.title
  const phone = deal.contact?.phone ?? null
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (deal.contact) onOpenContact?.(deal.contact.id) }}
        className="flex items-center gap-2 pr-16 w-full text-left group/contact"
        data-testid="process-card-title"
      >
        {deal.contact && <Avatar name={name} imageUrl={deal.contact.profilePicUrl ?? undefined} size="xs" />}
        <span className="text-[13px] font-semibold leading-[1.3] text-surface-100 truncate flex-1">{name}</span>
        <SiblingBadge siblings={siblings} />
        {deal.contact && (
          <span className="flex items-center gap-0.5 text-3xs text-surface-500 opacity-0 group-hover/contact:opacity-100 transition-opacity flex-shrink-0">
            ver <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </button>
      <CardScope description={deal.description} />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-2xs text-surface-400 truncate" title={`Origem: ${origin.label}`} data-testid="process-card-origin">
          <OriginIcon className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{origin.label}</span>
        </span>
        {by === 'ia' && (
          <span className="text-3xs text-accent-amber bg-accent-amber/10 px-1.5 py-0.5 rounded flex-shrink-0" title={deal.lastMovedByActorName ?? 'IA'}>IA</span>
        )}
        {by === 'auto' && (
          <span className="text-3xs text-surface-400 bg-surface-800 px-1.5 py-0.5 rounded flex-shrink-0" title={deal.lastMovedByActorName ?? 'automático'}>auto</span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-2xs text-surface-500">
        {time ? (
          // DEAL-CARD-11 (spec/1e-funis.GAPS.md): "parado Nd" em cor de
          // perigo/600 quando a etapa passa do limiar de "parado".
          <span
            className={cn('inline-flex items-center gap-1', stuckDays !== null && 'text-danger font-semibold')}
            title={`Nesta etapa há ${time}`}
            data-testid="process-card-time"
          >
            <Clock className="w-3 h-3" /> {stuckDays !== null ? `parado ${stuckDays} d` : time}
          </span>
        ) : <span />}
        {phone && (
          <span className="inline-flex items-center gap-1 tabular-nums"><Phone className="w-3 h-3" /> {phone}</span>
        )}
      </div>
    </>
  )
}

/**
 * DEAL-CARD-12/13 (spec/1e-funis.GAPS.md): avatar do RESPONSÁVEL pelo negócio,
 * 18px `rounded-[30%]`, tracejado/vazio quando não há dono resolvido — nunca
 * inventa iniciais quando só existe `ownerUserId` sem `User` correspondente
 * em `users` (caso "Atribuído").
 */
function OwnerAvatar({ owner }: { owner: User | null }) {
  if (!owner) {
    return <span className="w-[18px] h-[18px] rounded-[30%] border border-dashed border-[var(--bd2)] flex-shrink-0" aria-hidden />
  }
  return (
    <span className="w-[18px] h-[18px] rounded-[30%] bg-avatar-surface text-avatar-initials flex items-center justify-center text-[8px] font-bold flex-shrink-0">
      {getInitials(`${owner.firstName} ${owner.lastName ?? ''}`.trim())}
    </span>
  )
}

/**
 * Corpo do card em funil de VENDA (D2 · SCRUM-935/F-FUNIL-11): além do título
 * e valor de sempre, agora mostra dono, previsão de fechamento, tempo na
 * etapa e origem — o mesmo conjunto de sinais que o card de processo já
 * tinha, adaptado ao vocabulário de venda. `users` resolve o nome do dono
 * (o board não recebe isso embutido no `Deal`, só o `ownerUserId`).
 *
 * B6 (SCRUM-941): o selo IA/auto usa `movedByChip` (quem MOVEU por último),
 * igual ao card de processo — antes olhava só `createdByKind` (quem CRIOU),
 * então um negócio criado por humano e depois movido pela IA (F6b) não
 * mostrava nada. `movedByChip` já cai pra `createdByKind` quando o backend
 * é anterior à F8 (sem `lastMovedByKind`), então nenhum caso existente muda.
 */
function SalesCardBody({ deal, onOpenContact, users, siblings = 1 }: { deal: Deal; onOpenContact?: (contactId: string) => void; users: User[]; siblings?: number }) {
  const origin = originInfo(deal)
  const by = movedByChip(deal)
  const time = timeInStage(deal)
  const stuckDays = stuckDaysInStage(deal)
  const owner = deal.ownerUserId ? users.find((u) => u.id === deal.ownerUserId) ?? null : null
  const ownerLabel = !deal.ownerUserId ? 'Sem dono' : owner ? `${owner.firstName} ${owner.lastName ?? ''}`.trim() : 'Atribuído'
  const forecast = deal.expectedCloseAt
    ? new Date(deal.expectedCloseAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : null

  return (
    <>
      <div className="flex items-start gap-1.5 pr-20">
        <span className="text-[13px] font-semibold leading-[1.3] text-surface-100 truncate flex-1">{deal.title}</span>
        <SiblingBadge siblings={siblings} />
      </div>
      {/* DEAL-CARD-06: linha de contato 12px secundária — reaproveita o
          "ver contato" que antes vivia solto no rodapé (mesma ação, posição
          da spec). Empresa/cidade do mock não entram: `deal.contact` (resumo
          do board) não traz esse dado — [!] em spec/1e-funis.GAPS.md. */}
      {deal.contact && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenContact?.(deal.contact!.id) }}
          className="flex items-center gap-1 text-[12px] text-surface-400 hover:text-brand-400 transition-colors group/contact w-full text-left"
        >
          <span className="truncate flex-1">{deal.contact.displayName}</span>
          <span className="flex items-center gap-0.5 opacity-0 group-hover/contact:opacity-100 transition-opacity flex-shrink-0">
            ver <ArrowRight className="w-3 h-3" />
          </span>
        </button>
      )}
      <CardScope description={deal.description} />
      {/* R2-1E-CARD-02 (canvas 1e): UM rodapé — valor 13/700 · chip IA · previsão ·
          tempo à direita · avatar do dono 18px. Antes eram três linhas (valor;
          dono + previsão; origem + tempo). Nome do dono e origem descem para o
          tooltip (o canvas não os mostra no card; a ficha tem os dois). */}
      <div className="mt-0.5 flex items-center gap-1.5" title={`Origem: ${origin.label}`} data-testid="sales-card-origin">
        <span className="text-[13px] font-bold text-surface-100">{brl(deal.amountCents ?? 0)}</span>
        {by === 'ia' && (
          <span className="inline-flex items-center h-4 px-[5px] rounded-[5px] text-[10px] font-bold text-accent-amber bg-accent-amber/[.12]" title={deal.lastMovedByActorName ?? 'IA'}>IA</span>
        )}
        {by === 'auto' && (
          <span className="inline-flex items-center h-4 px-[5px] rounded-[5px] text-[10px] font-bold text-surface-400 bg-surface-800" title={deal.lastMovedByActorName ?? 'automático'}>auto</span>
        )}
        {forecast && (
          <span className="inline-flex items-center gap-[3px] text-[11px] text-surface-400" title={`Previsão de fechamento: ${forecast}`} data-testid="sales-card-forecast">
            <CalendarClock className="w-3 h-3" /> {forecast}
          </span>
        )}
        {time && (
          // DEAL-CARD-11: "parado Nd" em cor de perigo quando passa do limiar.
          <span
            className={cn('ml-auto text-[11px] whitespace-nowrap', stuckDays !== null ? 'text-danger font-semibold' : 'text-surface-500')}
            title={`Nesta etapa há ${time}`}
            data-testid="sales-card-time"
          >
            {stuckDays !== null ? `parado ${stuckDays} d` : time}
          </span>
        )}
        <span className={cn('inline-flex', !time && 'ml-auto')} title={`Dono do negócio: ${ownerLabel}`} data-testid="sales-card-owner">
          <OwnerAvatar owner={owner} />
        </span>
      </div>
    </>
  )
}
