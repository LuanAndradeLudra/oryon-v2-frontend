// B2 (SCRUM-928) — a ficha do negócio. Mesmo componente serve de PÁGINA
// (/deals/:id) e de PAINEL LATERAL (DealPanelContext) — quem chama decide
// via `onClose`/`onExpand` (presentes = modo painel; ausentes = página).
// Espelha a estrutura de `ContactDetailPanel.tsx` (header + tabs + corpo),
// com dados próprios: `GET /deals/:id` não vem enriquecido (kind/terminalLabels/
// probabilidade efetiva/ator do último movimento) como o board vem — a ficha
// resolve isso no cliente (pipeline do `CRMConfigContext`, histórico próprio).
import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, AlertTriangle, Lock } from 'lucide-react'
import { dealsApi, usersApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useToast } from '@/hooks/useToast'
import { CloseDealReasonModal, type CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import { getApiErrorMessage } from '@/lib/utils'
import { movedByLabel } from '@/lib/contactPipelines'
import { pipelineNoun } from '@/lib/pipelineKinds'
import { DealDetailHeader } from './DealDetailHeader'
import { DealSummaryTab } from './tabs/DealSummaryTab'
import { DealActivityTab } from './tabs/DealActivityTab'
import { DealConversationsTab } from './tabs/DealConversationsTab'
import type { Deal, DealStageHistoryEntry, PipelineStage, User } from '@/types'

type TabId = 'summary' | 'activity' | 'conversations' | 'proposal'

interface DealDetailPanelProps {
  dealId: string
  /** Presente = modo painel (drawer): mostra botão fechar. */
  onClose?: () => void
  /** Presente = oferece "Expandir" para a página /deals/:id. */
  onExpand?: (dealId: string) => void
}

function statusFromError(err: unknown): 404 | 403 | 'other' {
  const status = (err as { response?: { status?: number } })?.response?.status
  if (status === 404) return 404
  if (status === 403) return 403
  return 'other'
}

export function DealDetailPanel({ dealId, onClose, onExpand }: DealDetailPanelProps) {
  const { pipelines } = useCRMConfig()
  const { toast } = useToast()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 404 | 403 | 'error'>('loading')
  const [history, setHistory] = useState<DealStageHistoryEntry[] | 'loading' | 'error'>('loading')
  const [users, setUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const [closeTarget, setCloseTarget] = useState<{ deal: Deal; stage: PipelineStage } | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  // Troca de negócio (ou 1ª carga): reseta tudo, volta ao topo/aba Resumo —
  // mesmo padrão do ContactDetailPanel ao trocar de contato. Ajuste de
  // estado DURANTE o render (não em efeito): o painel pode trocar de
  // dealId sem desmontar (um chip de OUTRO negócio clicado com o painel já
  // aberto), e resetar aqui evita 1 frame com o negócio anterior sob o id novo.
  const [seenDealId, setSeenDealId] = useState(dealId)
  if (dealId !== seenDealId) {
    setSeenDealId(dealId)
    setDeal(null)
    setLoadState('loading')
    setHistory('loading')
    setActiveTab('summary')
  }

  const loadDeal = useCallback(() => {
    dealsApi.get(dealId)
      .then((res) => { setDeal(res.data); setLoadState('ok') })
      .catch((err) => {
        const status = statusFromError(err)
        setLoadState(status === 'other' ? 'error' : status)
      })
  }, [dealId])

  const loadHistory = useCallback(() => {
    dealsApi.history(dealId)
      .then((res) => setHistory(res.data))
      .catch(() => setHistory('error'))
  }, [dealId])

  // Busca os dados do negócio (e o scroll ao topo, que é DOM — legitimamente
  // um efeito). O reset síncrono acima já cobre o "trocar sem desmontar".
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
    loadDeal()
    loadHistory()
    usersApi.list().then((res) => setUsers(res.data)).catch(() => setUsers([]))
  }, [dealId, loadDeal, loadHistory])

  // Realtime — mesmo contrato dos outros consumidores (`{ contactId }`, ver
  // useContactPipelines/ConversationDealIndicator): sem `dealId` no payload,
  // filtra por contactId do negócio já carregado.
  useEffect(() => {
    if (!deal) return
    const socket = connectSocket()
    const onChanged = (p: { contactId?: string }) => {
      if (p?.contactId !== deal.contactId) return
      loadDeal()
      loadHistory()
    }
    socket.on('deal:changed', onChanged)
    return () => { socket.off('deal:changed', onChanged) }
  }, [deal, loadDeal, loadHistory])

  const pipeline = deal ? pipelines.find((p) => p.id === deal.pipelineId) ?? null : null
  /**
   * O substantivo do tipo, em toda mensagem que o operador lê.
   *
   * A ficha dizia "negócio" em 21 lugares — toast, `aria-label`, estado de
   * erro —, inclusive num funil de PROCESSO, onde o objeto se chama registro.
   * `pipelineNoun` já existia e resolvia isso desde o Modelo B (§4.2); esta
   * tela simplesmente não o usava. Sem funil carregado o fallback é "negócio",
   * que é o default do tenant.
   */
  const noun = pipelineNoun(pipeline)
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)

  const handlePatch = useCallback(async (patch: Partial<Deal> & { updateAmount?: boolean }) => {
    if (!deal) return
    const previous = deal
    setDeal({ ...deal, ...patch } as Deal)
    try {
      const res = await dealsApi.update(deal.id, patch)
      setDeal(res.data)
    } catch (err: unknown) {
      setDeal(previous)
      toast(getApiErrorMessage(err, 'Não foi possível salvar.'), 'error')
    }
  }, [deal, toast])

  const handleMoveToStage = useCallback((stage: PipelineStage) => {
    if (!deal) return
    if (stage.isWon || stage.isLost) {
      setCloseTarget({ deal, stage })
      return
    }
    const previousStageId = deal.stageId
    setDeal({ ...deal, stageId: stage.id })
    /**
     * `PATCH /deals/:id/stage` — mover é mover.
     *
     * Aqui ia `PATCH /deals/:id/status` com `status: 'open'`, desde a B2
     * (SCRUM-928). Esse endpoint é o comando de REABRIR, e o backend o rejeita
     * com `not_closed` quando o registro já está aberto
     * (`pipeline-items.service.ts`). Como os dois gestos que chegam aqui — o
     * stepper e o menu "Mover" — só existem com `status === 'open'`, a troca
     * de etapa devolvia 400 SEMPRE. É o mesmo endpoint que o painel do contato
     * já usava (`useContactPipelines.moveTo`).
     *
     * Etapa terminal não passa por aqui: sai antes, para o modal de motivo —
     * o backend exige `closeReason` e devolveria 400 `close_reason_required`.
     */
    dealsApi.moveStage(deal.id, stage.id)
      .then((res) => setDeal(res.data))
      .catch((err: unknown) => {
        setDeal((d) => (d ? { ...d, stageId: previousStageId } : d))
        toast(getApiErrorMessage(err, `Não foi possível mover o ${noun}.`), 'error')
      })
  }, [deal, toast, noun])

  const handleCloseWithReason = useCallback(async (input: CloseDealReasonInput) => {
    if (!closeTarget) return
    const { deal: target, stage } = closeTarget
    if (input.amountCents !== undefined) {
      await dealsApi.update(target.id, { amountCents: input.amountCents })
    }
    const res = await dealsApi.setStatus(target.id, { status: input.outcome, closeReason: input.reason, closeNote: input.note, stageId: stage.id })
    setDeal(res.data)
    setCloseTarget(null)
    loadHistory()
    toast(`${Noun} marcado como ${stage.label}.`, 'success')
  }, [closeTarget, loadHistory, toast, Noun])

  const handleTransferPipeline = useCallback((pipelineId: string) => {
    if (!deal) return
    dealsApi.movePipeline(deal.id, pipelineId)
      .then((res) => { setDeal(res.data); toast(`${Noun} transferido de funil.`, 'success') })
      .catch((err: unknown) => toast(getApiErrorMessage(err, `Não foi possível transferir o ${noun}.`), 'error'))
  }, [deal, toast])

  const handleDelete = useCallback(() => {
    if (!deal) return
    dealsApi.remove(deal.id)
      .then(() => { toast(`${Noun} excluído.`, 'success'); onClose?.() })
      .catch((err: unknown) => toast(getApiErrorMessage(err, `Não foi possível excluir o ${noun}.`), 'error'))
  }, [deal, toast, onClose])

  const lastEntry = Array.isArray(history) ? history[history.length - 1] : null
  const lastMovedLabel = lastEntry
    ? movedByLabel({ lastMovedByKind: lastEntry.movedByKind, lastMovedByActorName: lastEntry.movedByActorName })
    : null

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (loadState === 404) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={`${Noun} não encontrado`}
        description={`Este ${noun} não existe, foi excluído, ou está fora do seu setor.`}
        onClose={onClose}
      />
    )
  }

  if (loadState === 403) {
    return (
      <EmptyState
        icon={Lock}
        title="Sem acesso"
        description={`Você não tem acesso a este ${noun} — fale com um admin se acha que deveria ter.`}
        onClose={onClose}
      />
    )
  }

  if (loadState === 'error' || !deal) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Erro ao carregar"
        description={`Não foi possível carregar este ${noun}. Tente novamente.`}
        onClose={onClose}
      />
    )
  }

  if (!pipeline) {
    // Funis ainda carregando no CRMConfigContext, ou o negócio aponta para um
    // funil que sumiu (não deveria acontecer — FK RESTRICT no backend).
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  const TABS: { id: TabId; label: string; disabled?: boolean }[] = [
    { id: 'summary', label: 'Resumo' },
    { id: 'activity', label: 'Atividade' },
    { id: 'conversations', label: 'Conversas' },
    { id: 'proposal', label: 'Proposta', disabled: true },
  ]

  return (
    <div className="flex flex-col h-full">
      <DealDetailHeader
        deal={deal}
        pipeline={pipeline}
        pipelines={pipelines}
        users={users}
        lastMovedLabel={lastMovedLabel}
        history={Array.isArray(history) ? history : null}
        onPatch={handlePatch}
        onMoveToStage={handleMoveToStage}
        onTransferPipeline={handleTransferPipeline}
        onDelete={handleDelete}
        onClose={onClose}
        onExpand={onExpand ? () => onExpand(dealId) : undefined}
      />

      <div className="flex px-5 flex-shrink-0 border-b border-surface-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`deal-tab-${tab.id}`}
            className="relative pb-3 pt-3 mr-5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: activeTab === tab.id ? 'var(--color-brand-400, #818cf8)' : 'var(--color-surface-400, #94a3b8)' }}
          >
            {tab.label}
            {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full" />}
          </button>
        ))}
      </div>

      <div ref={bodyRef} className="flex-1 overflow-y-auto">
        {activeTab === 'summary' && <DealSummaryTab deal={deal} pipeline={pipeline} onPatch={handlePatch} />}
        {activeTab === 'activity' && <DealActivityTab deal={deal} pipeline={pipeline} history={history} />}
        {activeTab === 'conversations' && <DealConversationsTab contactId={deal.contactId} originConversationId={deal.originConversationId} />}
      </div>

      <CloseDealReasonModal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        deal={closeTarget?.deal ?? null}
        stage={closeTarget?.stage ?? null}
        pipeline={pipeline}
        onConfirm={handleCloseWithReason}
      />

    </div>
  )
}

function EmptyState({ icon: Icon, title, description, onClose }: { icon: typeof AlertTriangle; title: string; description: string; onClose?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full gap-3 px-8 text-center">
      <Icon className="w-8 h-8 text-surface-600" />
      <div>
        <p className="text-sm font-medium text-surface-200">{title}</p>
        <p className="text-xs text-surface-500 mt-1">{description}</p>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-xs text-brand-400 hover:text-brand-300 mt-1">
          Fechar
        </button>
      )}
    </div>
  )
}
