import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Layers } from 'lucide-react'
import { DealsBoard } from '@/components/deals/DealsBoard'
import { NewDealDialog } from '@/components/deals/NewDealDialog'
import { CloseDealReasonModal, type CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import { NewContactDrawer } from '@/components/contacts/NewContactDrawer'
import { useKanbanDeals } from '@/hooks/useKanbanDeals'
import { useTagsAndUsers } from '@/hooks/useTagsAndUsers'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { useToast } from '@/hooks/useToast'
import { toastDealClosedWithUndo } from '@/lib/dealClose'
import { pipelineKindOf, pipelineNoun, terminalLabelsOf } from '@/lib/pipelineKinds'
import { contactsApi } from '@/services/api'
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
}

/**
 * Board do funil (D2 · SCRUM-935) — migrado de dentro de `/contacts` (o
 * segmented control Contatos/Funil saiu, cada funil agora é `/pipelines/:id`
 * com abas Board/Relatórios). Toda a lógica de board que morava em
 * `ContactsPage` (useKanbanDeals, mover etapa, mover funil, fechar com
 * motivo, "Novo negócio", "Adicionar contato ao funil") vive aqui agora —
 * fora do contexto da tabela de contatos, que não é mais irmã dela na tela.
 */
export function PipelineBoardTab({ pipeline, pipelines, onDealsChanged, search, novoNegocioEtapaId, onNovoNegocioEtapa, novoContatoAberto, onNovoContato }: PipelineBoardTabProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { openDeal } = useDealPanel()
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
  const [multiOpenOnly, setMultiOpenOnly] = useState(false)
  const canFilterMultiOpen = !!pipeline.allowMultipleOpen

  const { visibleDealsByStage, multiOpenContacts } = useMemo(() => {
    const counts = new Map<string, number>()
    for (const list of Object.values(dealsByStage)) {
      for (const d of list ?? []) {
        if (d.status !== 'open' || !d.contactId) continue
        counts.set(d.contactId, (counts.get(d.contactId) ?? 0) + 1)
      }
    }
    const repeated = new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id))
    if (!multiOpenOnly || !canFilterMultiOpen) {
      return { visibleDealsByStage: dealsByStage, multiOpenContacts: repeated.size }
    }
    const filtered: typeof dealsByStage = {}
    for (const [stageId, list] of Object.entries(dealsByStage)) {
      filtered[stageId] = (list ?? []).filter((d) => !!d.contactId && repeated.has(d.contactId))
    }
    return { visibleDealsByStage: filtered, multiOpenContacts: repeated.size }
  }, [dealsByStage, multiOpenOnly, canFilterMultiOpen])
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
  const [searchParams] = useSearchParams()
  const [highlightDealId] = useState<string | null>(() => searchParams.get('deal'))
  const [showNewContactLocal, setShowNewContactLocal] = useState(false)
  const showNewContact = novoContatoAberto !== undefined ? novoContatoAberto : showNewContactLocal
  const setShowNewContact = onNovoContato ?? setShowNewContactLocal

  const handleMoveDeal = (deal: Deal, toStageId: string) => {
    const stage = sortedStages.find((st) => st.id === toStageId)
    // A4 (SCRUM-926): terminal = fechamento com motivo do catálogo, em
    // QUALQUER funil — o card fica na coluna de origem até o modal fechar.
    if (stage && (stage.isWon || stage.isLost)) {
      setCloseDealTarget({ deal, stage })
      return
    }
    moveStage(deal, toStageId).catch(() => toast(`Não foi possível mover o ${pipelineNoun(pipeline)}.`, 'error'))
  }

  const handleCloseDealWithReason = async (input: CloseDealReasonInput) => {
    if (!closeDealTarget) return
    const { deal, stage } = closeDealTarget
    const fromStageId = deal.stageId
    const labels = terminalLabelsOf(pipeline)
    const terminalLabel = input.outcome === 'won' ? labels.won : labels.lost
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
      {canFilterMultiOpen && (
        <div className="flex items-center gap-2 px-1 pb-2">
          <button
            type="button"
            onClick={() => setMultiOpenOnly((v) => !v)}
            aria-pressed={multiOpenOnly}
            data-testid="board-filter-multi-open"
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium transition-colors',
              multiOpenOnly
                ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                : 'border-surface-700 bg-surface-800 text-surface-300 hover:text-surface-100',
            )}
          >
            <Layers className="w-3 h-3" />
            Com mais de um aberto
            {multiOpenContacts > 0 && <span className="text-surface-500">· {multiOpenContacts}</span>}
          </button>
          {multiOpenOnly && multiOpenContacts === 0 && (
            <span className="text-[11px] text-surface-500">Nenhum contato tem dois negócios abertos aqui.</span>
          )}
        </div>
      )}
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
      />

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
          onConflict={() => {
            // Conflito (409 open_exists) num negócio criado direto do board:
            // sem drawer de contato nesta tela pra oferecer as 3 saídas do
            // fluxo "Adicionar ao funil" — aponta o caminho existente por toast.
            setNewDealStageId(null)
            toast('Este contato já tem um negócio aberto neste funil.', 'error')
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
