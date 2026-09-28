import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Layers } from 'lucide-react'
import { DealsBoard } from '@/components/deals/DealsBoard'
import { DealsList, type ListSort } from '@/components/deals/DealsList'
import { BoardFilterBar } from '@/components/deals/BoardFilterBar'
import { FunnelLensBar } from '@/components/deals/FunnelLensBar'
import { NewDealDialog } from '@/components/deals/NewDealDialog'
import { CloseDealReasonModal, type CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import { NewContactDrawer } from '@/components/contacts/NewContactDrawer'
import { useKanbanDeals } from '@/hooks/useKanbanDeals'
import { useTagsAndUsers } from '@/hooks/useTagsAndUsers'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { toastDealClosedWithUndo, UNDO_CLOSE_WINDOW_MS } from '@/lib/dealClose'
import { pipelineKindOf, pipelineNoun, terminalLabelsOf } from '@/lib/pipelineKinds'
import { boardStats, entrySources } from '@/lib/dealCard'
import { matchesCloseDate, matchesOwner, boardSummary, CLOSE_FILTER_LABELS, type CloseFilter, type OwnerFilter } from '@/lib/boardFilters'
import { matchesLens, lensCounts, isFunnelLens, isRecentlyClosed, type FunnelLens } from '@/lib/funnelLenses'
import { contactsApi, dealsApi } from '@/services/api'
import { cn, getApiErrorMessage } from '@/lib/utils'
import type { Contact, Deal, Pipeline, PipelineStage } from '@/types'

interface PipelineBoardTabProps {
  pipeline: Pipeline
  pipelines: Pipeline[]
  /** Chamado após um negócio ser criado/movido — o pai reflete em badges/contadores fora deste tab. */
  onDealsChanged?: () => void
  /**
   * Termo da busca do cabeçalho (o campo mora lá, ao lado do seletor de funil).
   * Vai para o backend, que casa nome/telefone/e-mail/empresa do CONTATO do
   * negócio — filtrar no cliente esconderia os cards já carregados e mentiria
   * nos totais das colunas, que somam o que veio da consulta.
   */
  search?: string
  /**
   * Criação CONTROLADA pela página.
   *
   * Os dois diálogos de criação (negócio em funil de venda, contato em funil de
   * processo) moram aqui, mas o botão que os abre vive no CABEÇALHO da página —
   * ele precisa estar visível sempre, e não só no estado vazio do quadro. Em
   * vez de duplicar os diálogos lá em cima, o estado sobe e desce como prop: a
   * página abre, este componente continua dono do fluxo.
   */
  novoNegocioEtapaId?: string | null
  onNovoNegocioEtapa?: (stageId: string | null) => void
  novoContatoAberto?: boolean
  onNovoContato?: (aberto: boolean) => void
  /** Barra única do funil: a página entrega o início (visão + busca) e o fim (Etapas). */
  toolbarLead?: ReactNode
  toolbarTrail?: ReactNode
  /** Direção C: o mesmo recorte do quadro, em colunas (`board`) ou em linhas (`list`). */
  view?: 'board' | 'list'
}

/**
 * Board do funil (D2 · SCRUM-935) — migrado de dentro de `/contacts` (o
 * segmented control Contatos/Funil saiu, cada funil agora é `/pipelines/:id`
 * com abas Board/Relatórios). Toda a lógica de board que morava em
 * `ContactsPage` (useKanbanDeals, mover etapa, mover funil, fechar com
 * motivo, "Novo negócio", "Adicionar contato ao funil") vive aqui agora —
 * fora do contexto da tabela de contatos, que não é mais irmã dela na tela.
 */
export function PipelineBoardTab({ pipeline, pipelines, onDealsChanged, search, novoNegocioEtapaId, onNovoNegocioEtapa, novoContatoAberto, onNovoContato, toolbarLead, toolbarTrail, view = 'board' }: PipelineBoardTabProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { openDeal, openDealId } = useDealPanel()
  const { users } = useTagsAndUsers()
  /**
   * Busca com respiro: cada tecla mudaria o filtro e o `useKanbanDeals` refaz a
   * consulta do quadro inteiro a cada mudança. 250 ms transformam "negócio" em
   * uma requisição em vez de oito, sem atraso perceptível para quem digita.
   * A tela de Contatos ainda dispara por tecla; aqui o volume por consulta é
   * maior (todos os negócios do funil de uma vez) e não valia repetir.
   */
  const [buscaComRespiro, setBuscaComRespiro] = useState(search ?? '')
  useEffect(() => {
    const t = setTimeout(() => setBuscaComRespiro(search ?? ''), 250)
    return () => clearTimeout(t)
  }, [search])

  const filtros = useMemo(
    () => ({ search: buscaComRespiro.trim() || undefined }),
    [buscaComRespiro],
  )

  const {
    dealsByStage, loading, error, moveStage, movePipeline, refetch,
  } = useKanbanDeals(pipeline.id, filtros)
  /**
   * C2 (SCRUM-933): filtro "com mais de um aberto". Só existe em funil com
   * `allowMultipleOpen` — onde a I1 ainda vale, todo contato tem no máximo um
   * negócio e o filtro esvaziaria o board sempre. É a lente para a pergunta
   * que a multiplicidade cria: quais clientes estão com propostas paralelas?
   */
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  /**
   * Filtros, lente e janela dos fechados MORAM NA URL (regra do PO; R6 ·
   * SCRUM-1161): antes eram `useState` e se perdiam ao abrir um card e voltar,
   * no F5 e no link colado. `replace` porque trocar de recorte não é navegar.
   */
  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }
  const lensParam = searchParams.get('lente')
  const lens: FunnelLens = isFunnelLens(lensParam) ? lensParam : 'todos'
  const setLens = (l: FunnelLens) => setParam('lente', l === 'todos' ? null : l)
  const allClosed = searchParams.get('fechados') === 'todos'
  const setAllClosed = (v: boolean) => setParam('fechados', v ? 'todos' : null)
  const LIST_SORTS: ListSort[] = ['etapa', 'valor', 'previsao', 'parado']
  const ordemParam = searchParams.get('ordem') as ListSort | null
  const listSort: ListSort = ordemParam && LIST_SORTS.includes(ordemParam) ? ordemParam : 'etapa'
  const listDesc = searchParams.get('desc') === '1'
  const setListSort = (next: ListSort) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      // Clicar na mesma coluna inverte; outra coluna começa crescente.
      const desc = next === listSort ? !listDesc : false
      if (next === 'etapa') p.delete('ordem'); else p.set('ordem', next)
      if (desc) p.set('desc', '1'); else p.delete('desc')
      return p
    }, { replace: true })
  }
  const multiOpenOnly = searchParams.get('multi') === '1'
  const setMultiOpenOnly = (fn: (v: boolean) => boolean) => setParam('multi', fn(multiOpenOnly) ? '1' : null)
  const canFilterMultiOpen = !!pipeline.allowMultipleOpen

  /**
   * R2-1E-BAR (RODADA-2.md): filtros Responsável (`ownerUserId`) e Fechamento
   * previsto (`expectedCloseAt`) da barra do board. Client-side, sobre os
   * negócios que o quadro já carregou — mesma lente do "mais de um aberto".
   */
  const ownerFilter: OwnerFilter = searchParams.get('resp') ?? 'all'
  const setOwnerFilter = (o: OwnerFilter) => setParam('resp', o === 'all' ? null : o)
  const closeParam = searchParams.get('previsao')
  const closeFilter: CloseFilter = closeParam && closeParam in CLOSE_FILTER_LABELS ? (closeParam as CloseFilter) : 'all'
  const setCloseFilter = (c: CloseFilter) => setParam('previsao', c === 'all' ? null : c)

  const { visibleDealsByStage, multiOpenContacts, counts, hiddenClosed } = useMemo(() => {
    const counts = new Map<string, number>()
    for (const list of Object.values(dealsByStage)) {
      for (const d of list ?? []) {
        if (d.status !== 'open' || !d.contactId) continue
        counts.set(d.contactId, (counts.get(d.contactId) ?? 0) + 1)
      }
    }
    const repeated = new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id))
    const onlyMulti = multiOpenOnly && canFilterMultiOpen
    const now = new Date()
    // Fechados: só os últimos 30 dias, salvo "ver todos" (decisão D4, 27/09).
    // O recorte é no cliente até o backend aceitar `closedSince` (F1).
    let hidden = 0
    const recortado: typeof dealsByStage = {}
    for (const [stageId, list] of Object.entries(dealsByStage)) {
      recortado[stageId] = (list ?? []).filter((d) => {
        const ok = allClosed || isRecentlyClosed(d, now)
        if (!ok) hidden += 1
        return ok
      })
    }
    const base = Object.values(recortado).flat()
    const lensTotals = lensCounts(base, user?.id, now)
    const filtered: typeof dealsByStage = {}
    for (const [stageId, list] of Object.entries(recortado)) {
      filtered[stageId] = list.filter((d) =>
        (!onlyMulti || (!!d.contactId && repeated.has(d.contactId)))
        && matchesOwner(d, ownerFilter)
        && matchesCloseDate(d, closeFilter, now)
        && matchesLens(d, lens, user?.id, now),
      )
    }
    return { visibleDealsByStage: filtered, multiOpenContacts: repeated.size, counts: lensTotals, hiddenClosed: hidden }
  }, [dealsByStage, multiOpenOnly, canFilterMultiOpen, ownerFilter, closeFilter, lens, allClosed, user?.id])
  const summary = useMemo(() => boardSummary(Object.values(visibleDealsByStage).flat()), [visibleDealsByStage])
  // O que a faixa de contexto dizia (abertos · ganhos hoje · perdidos · entradas)
  // fica acessível no tooltip do resumo — a barra do funil é uma só.
  const summaryTitle = useMemo(() => {
    const all = Object.values(visibleDealsByStage).flat()
    const st = boardStats(all)
    const labels = terminalLabelsOf(pipeline)
    const entradas = entrySources(all)
    return [
      `${st.open} aberto${st.open === 1 ? '' : 's'}`,
      `${st.wonToday} ${labels.won.toLowerCase()}${st.wonToday === 1 ? '' : 's'} hoje`,
      `${st.lost} ${labels.lost.toLowerCase()}${st.lost === 1 ? '' : 's'}`,
      `Entradas: ${entradas.length > 0 ? entradas.join(', ') : 'nenhuma ainda'}`,
    ].join(' · ')
  }, [visibleDealsByStage, pipeline])
  const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order)
  const isProcess = pipelineKindOf(pipeline) === 'process'

  const [closeDealTarget, setCloseDealTarget] = useState<{ deal: Deal; stage: PipelineStage } | null>(null)
  // Controlado pela página quando ela passa os pares; local quando não passa
  // (o componente continua utilizável sozinho, e os testes existentes não mudam).
  const [newDealStageIdLocal, setNewDealStageIdLocal] = useState<string | null>(null)
  const newDealStageId = novoNegocioEtapaId !== undefined ? novoNegocioEtapaId : newDealStageIdLocal
  const setNewDealStageId = onNovoNegocioEtapa ?? setNewDealStageIdLocal
  // B2 (SCRUM-928): `?deal=<id>` — mesmo deep link que o antigo /contacts?pipeline=
  // usava pra realçar o card. Capturado uma vez (lazy initializer): o
  // DealPanelContext global consome e limpa o MESMO param pra abrir a ficha;
  // se este estado reagisse a `searchParams` ao vivo, o realce sumiria assim
  // que a ficha abrisse.
  const [highlightDealId] = useState<string | null>(() => searchParams.get('deal'))
  const [showNewContactLocal, setShowNewContactLocal] = useState(false)
  const showNewContact = novoContatoAberto !== undefined ? novoContatoAberto : showNewContactLocal
  const setShowNewContact = onNovoContato ?? setShowNewContactLocal

  const handleMoveDeal = (deal: Deal, toStageId: string) => {
    const stage = sortedStages.find((st) => st.id === toStageId)
    // A4 (SCRUM-926): terminal = fechamento com motivo do catálogo, em
    // QUALQUER funil — o card fica na coluna de origem até o modal fechar.
    if (stage && (stage.isWon || stage.isLost)) {
      // O quadro não traz os itens do negócio: o modal leria "sem itens" e
      // ofereceria editar um valor que é a soma deles (R1 · SCRUM-1161). A
      // ficha completa vem antes de abrir; se falhar, abre com o que há.
      dealsApi.get(deal.id)
        .then((res) => setCloseDealTarget({ deal: { ...deal, ...res.data }, stage }))
        .catch(() => setCloseDealTarget({ deal, stage }))
      return
    }
    // PL-C2-CAR-1 (P7): mover para uma etapa ABERTA é reversível e de 1 clique
    // (arrasto) — não pede confirmação, mas precisa dizer que aconteceu e dar
    // saída pra quem soltou na coluna errada. Antes o card só se movia, sem
    // nenhum sinal de sucesso (só o erro tostava). O fechamento (Ganho/Perdido)
    // já tinha esse padrão via `toastDealClosedWithUndo` — isto é o mesmo
    // gesto pras etapas abertas, reaproveitando o `moveStage` do próprio board
    // (mantém o estado otimista local em vez de só a chamada de API).
    const fromStageId = deal.stageId
    moveStage(deal, toStageId)
      .then(() => {
        toast(`Movido para ${stage?.label ?? 'outra etapa'}.`, 'success', {
          label: 'Desfazer',
          onClick: () => {
            void moveStage({ ...deal, stageId: toStageId }, fromStageId)
              .catch(() => toast('Não foi possível desfazer.', 'error'))
          },
        }, UNDO_CLOSE_WINDOW_MS)
      })
      .catch(() => toast(`Não foi possível mover o ${pipelineNoun(pipeline)}.`, 'error'))
  }

  const handleCloseDealWithReason = async (input: CloseDealReasonInput) => {
    if (!closeDealTarget) return
    const { deal, stage } = closeDealTarget
    const fromStageId = deal.stageId
    const labels = terminalLabelsOf(pipeline)
    const terminalLabel = input.outcome === 'won' ? labels.won : labels.lost
    // O valor final digitado no modal era descartado aqui — a ficha aplicava,
    // o quadro não (R1 · SCRUM-1161). Mesma ordem da ficha: valor, depois etapa.
    if (input.amountCents !== undefined) {
      await dealsApi.update(deal.id, { amountCents: input.amountCents })
    }
    await moveStage(deal, stage.id, { closeReason: input.reason, closeNote: input.note })
    toastDealClosedWithUndo({
      message: `${terminalLabel}.`,
      dealId: deal.id,
      fromStageId,
      onUndone: () => { void refetch(); onDealsChanged?.() },
    })
    setCloseDealTarget(null)
    void refetch()
    onDealsChanged?.()
  }

  const handleMovePipelineDeal = (deal: Deal, toPipelineId: string) => {
    movePipeline(deal, toPipelineId)
      .then(() => {
        toast('Negócio movido de funil.', 'success')
        onDealsChanged?.()
      })
      .catch((e: unknown) => toast(getApiErrorMessage(e, 'Não foi possível mover o negócio para o funil.'), 'error'))
  }

  // ── Ações em lote da Lista ────────────────────────────────────────────────
  // Uma chamada por negócio (não existe rota em lote); falhas não param o
  // resto — o aviso diz quantos deram certo.
  const emLote = async (deals: Deal[], fn: (d: Deal) => Promise<unknown>, feito: string) => {
    const r = await Promise.allSettled(deals.map(fn))
    const ok = r.filter((x) => x.status === 'fulfilled').length
    const falhou = deals.length - ok
    void refetch()
    onDealsChanged?.()
    if (falhou === 0) toast(`${ok} ${ok === 1 ? pipelineNoun(pipeline) : pipelineNoun(pipeline) + 's'} ${feito}.`, 'success')
    else toast(`${ok} de ${deals.length} ${feito}; ${falhou} não ${falhou === 1 ? 'deu' : 'deram'} certo.`, 'error')
  }
  const handleBulkOwner = (deals: Deal[], ownerUserId: string | null) =>
    emLote(deals, (d) => dealsApi.update(d.id, { ownerUserId }), 'com responsável trocado')
  const handleBulkStage = (deals: Deal[], stageId: string) =>
    emLote(deals.filter((d) => d.stageId !== stageId), (d) => dealsApi.moveStage(d.id, stageId), 'movidos de etapa')
  const handleBulkPipeline = (deals: Deal[], pipelineId: string) =>
    emLote(deals, (d) => dealsApi.movePipeline(d.id, pipelineId), 'transferidos de funil')

  const handleOpenDealContact = (contactId: string) => {
    // Board isolado (sem drawer de contato irmão na mesma tela) — a ficha
    // completa é o destino natural aqui, ao contrário do antigo
    // /contacts?pipeline= (que abria o drawer quick-view da própria página).
    //
    // `voltarPara` leva o endereço EXATO de onde se saiu (com a aba do funil na
    // querystring): o "Voltar" da ficha tem como padrão a lista de contatos, e
    // sem isso quem entrou por um card do quadro era despejado no CRM — uma
    // tela em que nunca esteve.
    navigate(`/contacts/${contactId}`, {
      state: { voltarPara: `${location.pathname}${location.search}`, voltarLabel: 'Voltar para o funil' },
    })
  }

  const createContact = async (dto: Parameters<typeof contactsApi.create>[0]): Promise<Contact> => {
    const { data } = await contactsApi.create(dto)
    return data
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Não foi possível carregar os negócios deste funil.</p>
        <button onClick={refetch} className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2">
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <>
      <BoardFilterBar
        users={users}
        owner={ownerFilter}
        onOwnerChange={setOwnerFilter}
        close={closeFilter}
        onCloseChange={setCloseFilter}
        summary={summary}
        summaryTitle={summaryTitle}
        isProcess={isProcess}
        noun={pipelineNoun(pipeline)}
        lead={toolbarLead}
        trail={toolbarTrail}
      >
        {canFilterMultiOpen && (
          <>
            <button
              type="button"
              onClick={() => setMultiOpenOnly((v) => !v)}
              aria-pressed={multiOpenOnly}
              data-testid="board-filter-multi-open"
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-xs font-medium transition-colors flex-shrink-0',
                multiOpenOnly
                  ? 'border-brand-500 bg-accent-soft text-accent-dark'
                  : 'border-[var(--bd2)] bg-surface-900 text-surface-300 hover:text-surface-100',
              )}
            >
              <Layers className="w-3 h-3" />
              Com mais de um aberto
              {multiOpenContacts > 0 && <span className="text-surface-500">· {multiOpenContacts}</span>}
            </button>
            {multiOpenOnly && multiOpenContacts === 0 && (
              <span className="text-[11px] text-surface-500">Nenhum contato tem dois negócios abertos aqui.</span>
            )}
          </>
        )}
      </BoardFilterBar>
      <FunnelLensBar value={lens} onChange={setLens} counts={counts} hasUser={!!user?.id} />
      {view === 'list' ? (
      <DealsList
        stages={sortedStages}
        deals={Object.values(visibleDealsByStage).flat()}
        users={users}
        pipeline={pipeline}
        pipelines={pipelines}
        loading={loading}
        sort={listSort}
        sortDesc={listDesc}
        onSort={setListSort}
        onOpenDeal={openDeal}
        onOpenContact={handleOpenDealContact}
        selectedDealId={openDealId}
        onBulkOwner={handleBulkOwner}
        onBulkStage={handleBulkStage}
        onBulkPipeline={handleBulkPipeline}
      />
      ) : (
      <DealsBoard
        stages={sortedStages}
        dealsByStage={visibleDealsByStage}
        onMoveStage={handleMoveDeal}
        onOpenContact={handleOpenDealContact}
        onOpenDeal={openDeal}
        loading={loading}
        pipelines={pipelines}
        onMovePipeline={handleMovePipelineDeal}
        onAddContact={() => setShowNewContact(true)}
        onNewDeal={isProcess ? undefined : (stageId) => setNewDealStageId(stageId)}
        itemNoun={pipelineNoun(pipeline)}
        pipeline={pipeline}
        users={users}
        highlightDealId={highlightDealId}
        selectedDealId={openDealId}
        showContextStrip={false}
        closedWindow={{ allClosed, hidden: hiddenClosed, onToggle: () => setAllClosed(!allClosed) }}
      />
      )}

      {newDealStageId && (
        <NewDealDialog
          open
          pipelines={pipelines}
          initialPipelineId={pipeline.id}
          initialStageId={newDealStageId}
          onClose={() => setNewDealStageId(null)}
          onCreated={() => {
            setNewDealStageId(null)
            void refetch()
            onDealsChanged?.()
          }}
          onConflict={(info) => {
            // Conflito (409 open_exists) num negócio criado direto do board: o
            // backend devolve o id do negócio que já existe — o aviso leva até
            // ele em vez de só dizer que existe (R5 · SCRUM-1161).
            setNewDealStageId(null)
            toast(`${info.contactName} já tem um ${pipelineNoun(pipeline)} aberto neste funil.`, 'error', {
              label: 'Abrir',
              onClick: () => openDeal(info.openDealId),
            })
          }}
        />
      )}

      <CloseDealReasonModal
        open={!!closeDealTarget}
        onClose={() => setCloseDealTarget(null)}
        deal={closeDealTarget?.deal ?? null}
        stage={closeDealTarget?.stage ?? null}
        pipeline={pipeline}
        onConfirm={handleCloseDealWithReason}
      />

      <NewContactDrawer
        open={showNewContact}
        onClose={() => setShowNewContact(false)}
        onCreate={createContact}
        onCreated={() => {
          setShowNewContact(false)
          void refetch()
          onDealsChanged?.()
        }}
        pipelines={pipelines}
        defaultPipelineId={pipeline.id}
      />
    </>
  )
}
