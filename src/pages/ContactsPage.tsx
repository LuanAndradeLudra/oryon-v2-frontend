import { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Upload, Settings2, AlertTriangle, Users } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { isFeatureVisible } from '@/config/featureFlags'
import { ContactsStatsBar } from '@/components/contacts/ContactsStatsBar'
import { ContactsFiltersBar } from '@/components/contacts/ContactsFiltersBar'
import { ContactsTable } from '@/components/contacts/ContactsTable'
import { ContactsMobileList } from '@/components/contacts/ContactsMobileList'
import { ContactDetailPanel } from '@/components/contacts/ContactDetailPanel'
import type { TabId } from '@/components/contacts/ContactDetailTabs'
import { CRMConfigDrawer } from '@/components/contacts/CRMConfigDrawer'
import { NewContactDrawer } from '@/components/contacts/NewContactDrawer'
import { ImportContactsDrawer } from '@/components/contacts/ImportContactsDrawer'
import { BulkActionBar } from '@/components/contacts/BulkActionBar'
import { CampaignWizard } from '@/components/campaigns/CampaignWizard'
import { DealsBoard } from '@/components/deals/DealsBoard'
import { NewDealDialog } from '@/components/deals/NewDealDialog'
import { pipelineNoun, pipelineKindOf, pipelineKindOption, terminalLabelsOf } from '@/lib/pipelineKinds'
import { boardStats, entrySources } from '@/lib/dealCard'
import { toastDealClosedWithUndo } from '@/lib/dealClose'
import { CloseDealReasonModal, type CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { ToastContainer } from '@/components/ui/Toast'
import { useContacts } from '@/hooks/useContacts'
import { useKanbanDeals } from '@/hooks/useKanbanDeals'
import { connectSocket } from '@/services/socket'
import { useToast } from '@/hooks/useToast'
import { useTableSelection } from '@/hooks/useTableSelection'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { Fab } from '@/components/common/Fab'
import { tagsApi, pipelinesApi, dealsApi } from '@/services/api'
import { isAdminTier } from '@/lib/roleHelpers'
import { formatBRL } from '@/utils/money'
import { cn, getApiErrorMessage, getActivePipelines, getDefaultPipeline } from '@/lib/utils'
import type { Contact, ContactFilters, ContactStage, Tag, Pipeline, Deal, PipelineStage } from '@/types'

/**
 * Faceta "Situação comercial" (D-10). Na LISTA de contatos (base, fora de um
 * funil), o filtro é aplicado no BACKEND (SCRUM-293 — `useContacts`/`?commercial=`)
 * porque a lista é paginada no servidor; filtrar client-side só a página
 * carregada escondia matches fora dela e deixava o badge de contagem
 * enganoso. Dentro do board de um funil não há paginação server-side (todos
 * os deals do pipeline vêm de uma vez) — ali o filtro continua client-side,
 * ver `matchesCommercialDeal` abaixo.
 */
type CommercialSituation = 'all' | 'no_deal' | 'open_deal' | 'customer'

const COMMERCIAL_OPTIONS: { key: CommercialSituation; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'no_deal', label: 'Sem negócio' },
  { key: 'open_deal', label: 'Com negócio aberto' },
  { key: 'customer', label: 'Cliente' },
]

/** Mesma faceta, agora para os cards do board de um funil (não há dealsSummary
 *  por card — cada card JÁ É um negócio, então usamos o próprio `status` do
 *  deal). "Sem negócio" nunca combina dentro de um funil (todo card tem um
 *  negócio, por definição), então filtra para nenhum resultado — é o
 *  comportamento correto, não um bug. */
function matchesCommercialDeal(deal: Deal, s: CommercialSituation): boolean {
  if (s === 'all') return true
  if (s === 'no_deal') return false
  if (s === 'open_deal') return deal.status === 'open'
  if (s === 'customer') return deal.status === 'won'
  return true
}

/**
 * Aba Leads (spec UX 2026-07-09 — "Leads · Contatos & Funis"): dois destinos
 * irmãos e explícitos — Contatos (base de pessoas, sempre tabela) e cada Funil
 * de negócio (quadro de oportunidades, Kanban). A troca entre eles é via um
 * segmented control no topo, não um dropdown/toggle escondido. O Kanban legado
 * por `contact.stage` foi aposentado desta view — todo Kanban agora é de funil.
 */
export function ContactsPage() {
  const isMobile = useIsMobile()
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [initialPanelTab, setInitialPanelTab] = useState<TabId | undefined>(undefined)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Auto-open contact from URL param (e.g. /contacts?contact=c1)
  useEffect(() => {
    const contactParam = searchParams.get('contact')
    if (contactParam) {
      setSelectedContactId(contactParam)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const [showNewContact, setShowNewContact] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showCRMConfig, setShowCRMConfig] = useState(false)
  // F7 (SCRUM-867) — o funil nasce COM etapas (tipo + modelo, invariante I2
  // validado na criação), então o redirect da SCRUM-293 para o editor de
  // estágios saiu: criar abre o board do funil novo direto, com o empty
  // state "Adicionar contato ao funil".
  const [commercial, setCommercial] = useState<CommercialSituation>('all')

  // ── Funis de negócio (múltiplos pipelines) ──────────────────────────────
  // `null` = destino "Contatos" (base de pessoas, sempre tabela). Selecionar
  // um funil troca o conteúdo principal para o board de negócios daquele
  // pipeline, mantendo os botões da página (Configurar, Importar, Novo
  // contato) funcionando normalmente — são destinos peer, não filtros.
  // Gate de múltiplos funis (SCRUM-498). Com o flag do tenant desligado (ou
  // backend sem o módulo), a página é SÓ a tabela de contatos: nenhum fetch
  // de pipeline/roteamento, nenhum segmentado/board/"Novo funil", nenhuma
  // faceta comercial (o backend ignora `?commercial=` sem o módulo).
  const multiPipeline = useMultiPipeline()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  // Estado inicial lê `?pipeline=` uma vez (link "Ver no board" da ficha do
  // contato / painel da conversa, ou refresh/link copiado) — sem apagar o
  // param, ao contrário do que a página fazia antes. Validado contra a lista
  // real assim que ela chega (efeito abaixo), já que o fetch é assíncrono.
  const [selectedPipelineIdRaw, setSelectedPipelineId] = useState<string | null>(
    () => searchParams.get('pipeline'),
  )
  // Derivado, não efeito: com o gate fechado o funil selecionado é sempre
  // `null` — assim board, `useKanbanDeals`, sync de URL e JSX enxergam
  // "destino Contatos" já no 1º render, sem disparar um fetch de board que
  // o backend responderia 404/403.
  const selectedPipelineId = multiPipeline ? selectedPipelineIdRaw : null
  // F8 (SCRUM-872): mover um registro de PROCESSO para um terminal pede o
  // motivo do catálogo (I5) antes de fechar — o drop fica pendente aqui.
  const [closeDealTarget, setCloseDealTarget] = useState<{ deal: Deal; stage: PipelineStage } | null>(null)

  // "Sem negócio" não existe dentro de um funil (todo card do board já é um
  // negócio) — o botão some do segmentado ao entrar num funil (ver JSX), e
  // se o usuário já estava com esse filtro ativo ao trocar de destino,
  // reseta para "Todos" em vez de deixar o board silenciosamente vazio.
  useEffect(() => {
    if (selectedPipelineId && commercial === 'no_deal') setCommercial('all')
  }, [selectedPipelineId, commercial])

  // Sincroniza `?pipeline=` com o funil selecionado nos dois sentidos — sem
  // isto, refresh/voltar/copiar link perdia o funil aberto (o estado inicial
  // acima só lê a URL uma vez, no mount). `replace` evita empilhar histórico
  // a cada clique no segmentado; só mexe na chave `pipeline`, preservando
  // outros params (ex. `contact`, tratado em efeito à parte).
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (selectedPipelineId) next.set('pipeline', selectedPipelineId)
      else next.delete('pipeline')
      return next
    }, { replace: true })
  }, [selectedPipelineId, setSearchParams])

  // Se o id (vindo da URL ou de um link antigo) não existir mais ou tiver
  // sido arquivado nesse meio tempo, cai pro pipeline padrão do tenant — o
  // board nunca fica preso num funil inválido/escondido do segmentado.
  useEffect(() => {
    if (pipelines.length === 0 || selectedPipelineId === null) return
    const match = pipelines.find((p) => p.id === selectedPipelineId)
    if (match && !match.isArchived) return
    setSelectedPipelineId(getDefaultPipeline(pipelines)?.id ?? null)
  }, [pipelines, selectedPipelineId])

  const { user } = useAuth()
  const currentUser = user
    ? { firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl }
    : undefined
  // Backend's POST /contacts/bulk/delete is @Roles(ADMIN, BUSINESS_ADMIN).
  // Mirror here so non-admins don't see the "Excluir" affordance in the
  // bulk action bar or the per-row context menu. SUPER_ADMIN passes
  // implicitly via the RolesGuard so the helper already covers it.
  const canBulkDelete = isAdminTier(user?.role)

  // Fonte única de contatos: sempre paginado/tabela (o Kanban de contato por
  // `stage` foi aposentado — spec UX 2026-07-09). Filtros vivem aqui.
  const {
    contacts, loading, loadingMore, hasMore, loadMore, error, total, filters, setFilters,
    updateContact, createContact, bulkUpdateStage, bulkRemove,
    bulkAddTag, bulkRemoveTag, removeContact, refetch,
  } = useContacts(
    { sortBy: 'lastContactedAt', sortDir: 'desc' },
    // Faceta comercial depende de `dealsSummary`, que só existe com o módulo
    // de funis — sem o gate, nunca manda `?commercial=` (SCRUM-498).
    { commercial: multiPipeline && commercial !== 'all' ? commercial : undefined },
  )

  // Tags are fetched once when the page mounts so the BulkActionBar can
  // show the picker without a round-trip on first selection.
  const [tags, setTags] = useState<Tag[]>([])
  useEffect(() => {
    let alive = true
    tagsApi.list()
      .then((r) => { if (alive) setTags(r.data) })
      .catch(() => { if (alive) setTags([]) })
    return () => { alive = false }
  }, [])
  const { vocab } = useTenantVocab()
  const { toasts, toast, dismiss } = useToast()

  const fetchPipelines = useCallback((selectId?: string) => {
    // Gate fechado: chamado também pelos callbacks dos drawers (onDone/
    // onCreated) — vira no-op em vez de um GET que o backend não tem.
    if (!multiPipeline) return Promise.resolve()
    return pipelinesApi
      .list()
      .then((res) => {
        const list = res.data ?? []
        setPipelines(list)
        if (selectId) setSelectedPipelineId(selectId)
      })
      .catch(() => toast('Não foi possível carregar os pipelines.', 'error'))
  }, [toast, multiPipeline])

  useEffect(() => {
    // Busca na montagem E quando o flag hidrata (login → `/auth/me` chega
    // depois da 1ª renderização da página). Sem o flag: nada de pipelines
    // nem roteamento (SCRUM-498).
    if (!multiPipeline) return
    // F8 (SCRUM-871): o strip do funil deixou de mostrar "Alimentado por
    // linha X" (`pipeline_channel_routing` congelada, decisão b) — a página
    // não busca mais roteamento nem linhas WhatsApp.
    fetchPipelines()
    // `fetchPipelines` fora das deps de propósito: só muda com `multiPipeline`
    // (já listado) e com `toast`, cuja identidade nova causaria refetch em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiPipeline])

  // Badge de contagem do segmentado ("Vendas 3", "Suporte 1") só vinha do
  // fetch inicial — mover/ganhar/perder um negócio deixava o número
  // desatualizado até um F5. `deal:changed` já é emitido pelo backend pra
  // qualquer mudança de negócio (inclusive as duas rooms quando o negócio
  // troca de funil); reage aqui também, não só dentro do board de UM
  // pipeline (useKanbanDeals), pra manter os badges de TODOS os funis
  // corretos em tempo real — inclusive mudanças feitas por outra aba/pessoa.
  useEffect(() => {
    if (!multiPipeline) return
    const socket = connectSocket()
    const onDealChanged = () => { void fetchPipelines() }
    socket.on('deal:changed', onDealChanged)
    return () => { socket.off('deal:changed', onDealChanged) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiPipeline])

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedPipelineId) ?? null,
    [pipelines, selectedPipelineId],
  )
  // Mesmo card de filtros da tabela de Contatos (busca/fonte/etiqueta/intenção/
  // sentimento/opt-in) — passado ao board para filtrar via join no backend,
  // valendo para QUALQUER funil selecionado, não só a tabela.
  const boardFilters = useMemo(
    () => ({
      search: filters.search,
      intent: filters.intent,
      sentiment: filters.sentiment,
      source: filters.source,
      tagId: filters.tagId,
      optIn: filters.optIn,
    }),
    [filters.search, filters.intent, filters.sentiment, filters.source, filters.tagId, filters.optIn],
  )
  const {
    dealsByStage, loading: dealsLoading, error: dealsError,
    moveStage: moveDealStage, movePipeline: moveDealPipeline, refetch: refetchDeals,
  } = useKanbanDeals(selectedPipelineId, boardFilters)
  const sortedPipelineStages = useMemo(
    () => (selectedPipeline?.stages ?? []).slice().sort((a, b) => a.order - b.order),
    [selectedPipeline],
  )
  const dealsSummaryLine = useMemo(() => {
    const deals = Object.values(dealsByStage).flat()
    const openCents = deals.reduce((sum, d) => sum + (d.amountCents ?? 0), 0)
    return { count: deals.length, openCents }
  }, [dealsByStage])

  // Faceta "Situação comercial" no board — o filtro pelo backend já cobre
  // busca/fonte/etiqueta/etc.; aqui só o status do próprio deal (disponível
  // sem lookup extra) decide "Com negócio aberto"/"Cliente". "Sem negócio"
  // nunca combina dentro de um funil — todo card já É um negócio.
  const displayDealsByStage = useMemo(() => {
    if (commercial === 'all') return dealsByStage
    const out: typeof dealsByStage = {}
    for (const [stageId, deals] of Object.entries(dealsByStage)) {
      out[stageId] = deals.filter((d) => matchesCommercialDeal(d, commercial))
    }
    return out
  }, [dealsByStage, commercial])

  // Strip do funil (F8 · SCRUM-871): tipo, entradas (origens presentes no
  // board) e contagens "abertos · concluídos hoje · cancelados" — tudo a
  // partir dos registros já carregados, sem chamada extra.
  const selectedKindOption = pipelineKindOption(pipelineKindOf(selectedPipeline))
  const selectedIsProcess = pipelineKindOf(selectedPipeline) === 'process'
  const selectedTerminalLabels = terminalLabelsOf(selectedPipeline)
  const boardDeals = useMemo(() => Object.values(dealsByStage).flat(), [dealsByStage])
  const boardStatsLine = useMemo(() => boardStats(boardDeals), [boardDeals])
  const boardEntries = useMemo(() => entrySources(boardDeals), [boardDeals])

  const handleMoveDeal = (deal: Deal, toStageId: string) => {
    const stage = sortedPipelineStages.find((st) => st.id === toStageId)
    // A4 (SCRUM-926): terminal = fechamento com motivo do catálogo em QUALQUER
    // funil. Até aqui o modal só se interpunha em processo — em venda o arrasto
    // fechava em silêncio com o motivo implícito `outro` (divergência D3). O
    // card fica na coluna de origem enquanto o modal está aberto, então
    // cancelar não desfaz nada: nada chegou a acontecer.
    if (stage && (stage.isWon || stage.isLost)) {
      setCloseDealTarget({ deal, stage })
      return
    }
    moveDealStage(deal, toStageId).catch(() => toast(`Não foi possível mover o ${pipelineNoun(selectedPipeline)}.`, 'error'))
  }

  const handleCloseDealWithReason = async (input: CloseDealReasonInput) => {
    if (!closeDealTarget) return
    const { deal, stage } = closeDealTarget
    const fromStageId = deal.stageId
    // Valor final confirmado no modal (venda sem itens) vai antes: fechado, o
    // registro não aceita mais edição de valor.
    if (input.amountCents !== undefined) {
      await dealsApi.update(deal.id, { amountCents: input.amountCents })
    }
    // Fecha pelo MESMO caminho do arrasto (`PATCH /deals/:id/stage`), agora com
    // motivo — e não por um `setStatus` paralelo: a coluna de destino é a que o
    // usuário escolheu, e o board reconcilia o card com a resposta.
    await moveDealStage(deal, stage.id, { closeReason: input.reason, closeNote: input.note })
    toastDealClosedWithUndo({
      message: input.outcome === 'won' ? `${selectedTerminalLabels.won}.` : `${selectedTerminalLabels.lost}.`,
      dealId: deal.id,
      fromStageId,
      onUndone: () => { void refetchDeals(); void fetchPipelines() },
    })
    void refetchDeals()
    void fetchPipelines()
  }

  const handleMovePipelineDeal = (deal: Deal, toPipelineId: string) => {
    moveDealPipeline(deal, toPipelineId)
      .then(() => {
        toast('Negócio movido de funil.', 'success')
        // Feedback imediato do badge de contagem — não espera o round-trip
        // do socket `deal:changed` (que também dispara isso, redundante mas
        // inofensivo: cobre outras abas/pessoas vendo a mesma mudança).
        void fetchPipelines()
      })
      .catch((e: unknown) => toast(getApiErrorMessage(e, 'Não foi possível mover o negócio para o funil.'), 'error'))
  }

  // F9 (SCRUM-875): "Adicionar ao funil" pelo menu da linha da tabela —
  // fluxo compartilhado (criação / DealModal em venda / modal de conflito).
  const addToPipeline = useAddToPipeline({ onCreated: () => { void refetch(); void fetchPipelines() } })

  // A3 (SCRUM-925): "Novo negócio" a partir do BOARD — a etapa vem da coluna
  // clicada e o contato é escolhido dentro do diálogo (aqui, ao contrário das
  // outras superfícies, ninguém sabe de quem é o negócio antes de perguntar).
  const [newDealStageId, setNewDealStageId] = useState<string | null>(null)

  const handleOpenDealContact = (contactId: string) => {
    setSelectedContactId(contactId)
    setInitialPanelTab('deals')
  }

  // ── Bulk selection state ───────────────────────────────────────────────
  const {
    selectedIds,
    selectedItems: selectedContacts,
    toggle: toggleSelect,
    selectAll,
    clear: clearSelection,
  } = useTableSelection(contacts, useCallback((c: typeof contacts[number]) => c.id, []))
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Esc clears selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSelection])

  const handleFiltersChange = (f: ContactFilters) => setFilters(f)

  useRegisterTopBarActions(
    <div className="flex items-center gap-2 flex-wrap">
      {/* Count badge — total de contatos, já refletindo a faceta "Situação
          comercial" ativa (SCRUM-293: `total` vem do backend já filtrado).
          Fixo só quanto a funil (spec: cabeçalho global não muda por funil). */}
      <span className="text-xs text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full border border-surface-700 font-medium">
        {total.toLocaleString('pt-BR')}
      </span>

      <button
        onClick={() => setShowCRMConfig(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Configurar
      </button>
      <button
        onClick={() => setShowImport(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        Importar
      </button>
      <button
        onClick={() => setShowNewContact(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-colors shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" />
        Novo {vocab.contact}
      </button>
    </div>,
    [total, vocab.contact],
  )

  const handleOpenPanel = (contact: Contact) => {
    setInitialPanelTab(undefined)
    setSelectedContactId(contact.id)
  }

  const handleMoveStage = async (contact: Contact, stage: ContactStage) => {
    await updateContact(contact.id, { stage })
  }

  const handleBulkMoveStage = useCallback(async (stage: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const res = await bulkUpdateStage(ids, stage)
      toast(`${res.updated} contato(s) movido(s).`, 'success')
      clearSelection()
    } catch {
      toast('Falha ao mover contatos.', 'error')
    }
  }, [selectedIds, bulkUpdateStage, toast, clearSelection])

  const handleBulkAddTag = useCallback(async (tag: Tag) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const res = await bulkAddTag(ids, tag)
      toast(`Tag "${tag.name}" adicionada a ${res.added} contato(s).`, 'success')
    } catch {
      toast('Falha ao adicionar tag.', 'error')
    }
  }, [selectedIds, bulkAddTag, toast])

  const handleBulkRemoveTag = useCallback(async (tagId: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const res = await bulkRemoveTag(ids, tagId)
      toast(`Tag removida de ${res.removed} contato(s).`, 'success')
    } catch {
      toast('Falha ao remover tag.', 'error')
    }
  }, [selectedIds, bulkRemoveTag, toast])

  // Campaign seed flow: capture the id snapshot *at click time* so the
  // wizard remains bound to that list even if the selection changes in the
  // background (or gets cleared when the wizard closes).
  const [campaignSeedIds, setCampaignSeedIds] = useState<string[] | null>(null)

  const handleCreateCampaignFromSelection = useCallback(() => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setCampaignSeedIds(ids)
  }, [selectedIds])

  // Delete flow: "request" opens the confirmation modal, "confirm" executes.
  // Both the bulk bar button and the context menu entry fan into requestBulkDelete.
  const requestBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return
    setConfirmBulkDelete(true)
  }, [selectedIds])

  const confirmBulkDeleteAction = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) { setConfirmBulkDelete(false); return }
    setBulkDeleting(true)
    try {
      const res = await bulkRemove(ids)
      toast(`${res.deleted} contato(s) excluído(s).`, 'success')
      clearSelection()
      setConfirmBulkDelete(false)
    } catch {
      toast('Falha ao excluir contatos.', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, bulkRemove, toast, clearSelection])

  const handleContactUpdate = (updated: Contact) => {
    updateContact(updated.id, updated)
  }

  return (
    <>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-surface-950">
        {isMobile && <MobilePageHeader title="Contatos" />}

        {/* Fixos para qualquer destino (Contatos ou funil) — só o card abaixo troca. */}
        <ContactsStatsBar
          contacts={contacts}
          total={total}
        />

        {/* Busca + filtros: 2 mais usados inline (Fonte, Etiquetas) e o resto
            dentro do botão "Filtros". */}
        <ContactsFiltersBar filters={filters} onFiltersChange={handleFiltersChange} />

        {/* Faceta "Situação comercial" (D-10) — filtro opt-in derivado do dealsSummary.
            Dentro de um funil, o significado muda: não há dealsSummary cross-pipeline
            por card, então o filtro passa a olhar só o status DESTE negócio nesta
            board. "Sem negócio" nunca combina ali (todo card já é um negócio) — por
            isso some do segmentado, e um aviso deixa explícito o escopo do filtro. */}
        {multiPipeline && (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-b border-surface-800/60">
          {COMMERCIAL_OPTIONS.filter((opt) => !(selectedPipelineId && opt.key === 'no_deal')).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setCommercial(opt.key)}
              className={cn(
                'text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors border',
                commercial === opt.key
                  ? 'commercial-filter-chip-active bg-brand-500/15 text-brand-300 border-brand-500/40'
                  : 'bg-surface-900 text-surface-400 border-surface-800 hover:text-surface-200',
              )}
            >
              {opt.label}
            </button>
          ))}
          {selectedPipelineId && commercial !== 'all' && (
            <span className="text-[11px] text-surface-600 whitespace-nowrap">
              considerando só o negócio neste funil
            </span>
          )}
        </div>
        )}

        {/* Card grande — segmented control (Contatos + Funis) no topo; só o
            conteúdo interno troca entre Tabela de contatos e Kanban do funil.
            Sem o gate de funis (SCRUM-498) o cabeçalho inteiro some — sobra
            a tabela, que é o único destino possível. */}
        <div className="flex-1 overflow-hidden min-w-0 flex flex-col mx-4 mb-4 mt-1 bg-surface-900 border border-surface-800 rounded-xl">
          {multiPipeline && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-surface-800 flex-wrap flex-shrink-0">
            {/* Segmented control — Contatos (base) + cada Funil, destinos peer (spec UX 2026-07-09) */}
            <div className="flex items-center gap-1 bg-surface-950 border border-surface-800 rounded-lg p-1 overflow-x-auto">
              <button
                onClick={() => setSelectedPipelineId(null)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                  !selectedPipelineId
                    ? 'bg-surface-700 text-surface-100 shadow-sm'
                    : 'text-surface-400 hover:text-surface-200',
                )}
              >
                <Users className="w-3.5 h-3.5" />
                {vocab.contacts}
                <span className="text-[9px] font-bold text-surface-500 bg-surface-950 px-1 py-0.5 rounded">BASE</span>
              </button>
              {getActivePipelines(pipelines).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPipelineId(p.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                    selectedPipelineId === p.id
                      ? 'bg-surface-700 text-surface-100 shadow-sm'
                      : 'text-surface-400 hover:text-surface-200',
                  )}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  {(() => { const KindIcon = pipelineKindOption(pipelineKindOf(p)).icon; return <KindIcon className="w-3 h-3 opacity-70 flex-shrink-0" aria-label={pipelineKindOption(pipelineKindOf(p)).label} /> })()}
                  {p.name}
                  <span className="text-[10px] tabular-nums opacity-70">{p.openDealsCount}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* B5 (SCRUM-931/P13): criar/renomear/excluir/arquivar funil saiu
                  da tela de operação — mora em Configurações, com gate de
                  papel. Aqui só se usa o funil, nunca se gerencia. */}
              <button
                onClick={() => navigate('/settings/pipeline-stages')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-colors whitespace-nowrap"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Gerenciar funis
              </button>
            </div>
          </div>
          )}

          {/* Funil selecionado: callout de escopo + resumo + strip de roteamento (spec UX §6) */}
          {selectedPipeline && (
            <div className="border-b border-surface-800/60 bg-surface-950/40 flex-shrink-0">
              <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                <p className="text-surface-400">
                  Este quadro mostra apenas negócios de <span className="text-surface-200 font-medium">{selectedPipeline.name}</span>. Contatos sem negócio aqui não aparecem —{' '}
                  <button
                    type="button"
                    onClick={() => setSelectedPipelineId(null)}
                    className="text-brand-400 hover:text-brand-300 underline underline-offset-2"
                  >
                    ver na tabela de contatos ›
                  </button>
                </p>
                <p className="text-surface-500 whitespace-nowrap tabular-nums" data-testid="board-stats">
                  {boardStatsLine.open} aberto{boardStatsLine.open === 1 ? '' : 's'}
                  {' · '}{boardStatsLine.wonToday} {selectedTerminalLabels.won.toLowerCase()}{boardStatsLine.wonToday === 1 ? '' : 's'} hoje
                  {' · '}{boardStatsLine.lost} {selectedTerminalLabels.lost.toLowerCase()}{boardStatsLine.lost === 1 ? '' : 's'}
                  {!selectedIsProcess && <> · {formatBRL(dealsSummaryLine.openCents)}</>}
                </p>
              </div>
              <div className="px-4 pb-2 text-[11px] text-surface-500 flex items-center gap-2 flex-wrap" data-testid="board-strip">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-800 border border-surface-700 text-surface-300">
                  <selectedKindOption.icon className="w-3 h-3" /> {selectedKindOption.label}
                </span>
                <span>
                  {selectedIsProcess
                    ? `Um ${pipelineNoun(selectedPipeline)} por contato por passagem. Sem valor, sem produtos.`
                    : 'Negócios com valor — fecham em Ganho ou Perdido e entram na receita.'}
                </span>
                <span className="text-surface-600">·</span>
                <span>
                  Entradas:{' '}
                  {boardEntries.length > 0
                    ? boardEntries.map((e, i) => <span key={e} className="text-surface-300">{i > 0 ? ', ' : ''}{e}</span>)
                    : <span className="text-surface-400">nenhuma ainda</span>}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
          {selectedPipelineId ? (
            dealsError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <p className="text-sm">Não foi possível carregar os negócios deste funil.</p>
                <button
                  onClick={refetchDeals}
                  className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <DealsBoard
                stages={sortedPipelineStages}
                dealsByStage={displayDealsByStage}
                onMoveStage={handleMoveDeal}
                onOpenContact={handleOpenDealContact}
                loading={dealsLoading}
                pipelines={pipelines}
                onMovePipeline={handleMovePipelineDeal}
                onAddContact={() => setShowNewContact(true)}
                onNewDeal={selectedIsProcess ? undefined : (stageId) => setNewDealStageId(stageId)}
                itemNoun={pipelineNoun(selectedPipeline)}
                pipeline={selectedPipeline}
              />
            )
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm">{error}</p>
              <button
                onClick={refetch}
                className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
              >
                Tentar novamente
              </button>
            </div>
          ) : isMobile ? (
            // Mobile: lista vertical pura — tabela larga fica inutilizável em viewport estreita.
            <ContactsMobileList
              contacts={contacts}
              loading={loading}
              onOpenPanel={handleOpenPanel}
              onOpenDeals={handleOpenDealContact ? (c) => handleOpenDealContact(c.id) : undefined}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          ) : (
            <ContactsTable
              contacts={contacts}
              loading={loading}
              onOpenPanel={handleOpenPanel}
              onMoveStage={handleMoveStage}
              onOpenDeals={handleOpenDealContact ? (c) => handleOpenDealContact(c.id) : undefined}
              onAddToPipeline={(c, p) => addToPipeline.requestAdd({ contactId: c.id, contactName: c.displayName || c.waId, pipeline: p })}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onBulkDelete={canBulkDelete ? requestBulkDelete : undefined}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
          </div>
        </div>
      </div>

      {/* Mobile FAB: novo contato — desktop usa o "+ Novo" do header */}
      <Fab
        icon={<Plus className="w-6 h-6" />}
        label="Novo contato"
        onClick={() => setShowNewContact(true)}
      />

      {/* Bulk selection floating bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionBar
            key="bulk-bar"
            count={selectedIds.size}
            selectedContacts={selectedContacts}
            tags={tags}
            onMoveStage={handleBulkMoveStage}
            onAddTag={handleBulkAddTag}
            onRemoveTag={handleBulkRemoveTag}
            onCreateCampaign={handleCreateCampaignFromSelection}
            onDelete={canBulkDelete ? requestBulkDelete : undefined}
            onClear={clearSelection}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Bulk delete confirmation — shared between bar and context menu.
          Uses the raw Modal so we can preview the contacts being deleted. */}
      <Modal
        open={confirmBulkDelete}
        onClose={() => { if (!bulkDeleting) setConfirmBulkDelete(false) }}
        title={`Excluir ${selectedIds.size} contato${selectedIds.size === 1 ? '' : 's'}`}
        className="max-w-md"
      >
        <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30">
          <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-surface-300 leading-relaxed">
            {selectedIds.size === 1
              ? 'Esta ação não pode ser desfeita pela interface.'
              : 'Esta ação não pode ser desfeita pela interface. Revise os contatos abaixo antes de confirmar.'}
          </p>
        </div>

        {selectedContacts.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-2">
              Contatos ({selectedContacts.length})
            </p>
            <div className="max-h-64 overflow-y-auto pr-1 space-y-1 rounded-lg border border-surface-800 bg-surface-950/50 p-1.5">
              {selectedContacts.slice(0, 50).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-800/60 transition-colors"
                >
                  <Avatar name={c.displayName} imageUrl={c.profilePicUrl} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-surface-100 truncate">{c.displayName}</p>
                    {c.waId && (
                      <p className="text-[10px] text-surface-500 font-mono truncate">{c.waId}</p>
                    )}
                  </div>
                  {c.stage && (
                    <span className="text-[10px] text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {c.stage}
                    </span>
                  )}
                </div>
              ))}
              {selectedContacts.length > 50 && (
                <p className="text-[11px] text-surface-500 text-center py-1">
                  +{selectedContacts.length - 50} outros contatos
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => { if (!bulkDeleting) setConfirmBulkDelete(false) }}
            disabled={bulkDeleting}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-all disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={confirmBulkDeleteAction}
            disabled={bulkDeleting || selectedIds.size === 0}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all bg-danger text-white hover:bg-red-600',
              (bulkDeleting || selectedIds.size === 0) && 'opacity-60 cursor-not-allowed',
            )}
          >
            {bulkDeleting ? 'Excluindo...' : `Excluir ${selectedIds.size} contato${selectedIds.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </Modal>

      {/* Import Contacts Drawer */}
      <ImportContactsDrawer
        open={showImport}
        onClose={() => setShowImport(false)}
        onCreate={createContact}
        onDone={() => { setShowImport(false); refetch(); fetchPipelines() }}
        pipelines={pipelines}
        defaultPipelineId={selectedPipelineId}
      />

      {/* New Contact Drawer */}
      <NewContactDrawer
        open={showNewContact}
        onClose={() => setShowNewContact(false)}
        onCreate={createContact}
        onCreated={(contact) => {
          setSelectedContactId(contact.id)
          // O negócio inicial já foi criado no funil escolhido (no próprio
          // drawer) antes deste callback disparar — refetch traz o
          // dealsSummary fresco pro chip "Negócios" da tabela, e
          // fetchPipelines atualiza o badge de abertos no segmented control.
          refetch()
          fetchPipelines()
        }}
        pipelines={pipelines}
        defaultPipelineId={selectedPipelineId}
      />

      {/* CRM Config Drawer */}
      <CRMConfigDrawer
        open={showCRMConfig}
        onClose={() => setShowCRMConfig(false)}
      />

      {/* F9 (SCRUM-875): diálogos do "Adicionar ao funil" (conflito / motivo / negócio) */}
      {addToPipeline.dialogs}

      {/* A3 (SCRUM-925): "Novo negócio" do board. O 409 reusa o modal de
          conflito do hook — o board não ganha uma segunda implementação. */}
      {newDealStageId && selectedPipeline && (
        <NewDealDialog
          open
          pipelines={pipelines}
          initialPipelineId={selectedPipeline.id}
          initialStageId={newDealStageId}
          onClose={() => setNewDealStageId(null)}
          onCreated={() => {
            setNewDealStageId(null)
            void refetchDeals()
            void fetchPipelines()
          }}
          onConflict={({ openDealId, contactId, contactName }) => {
            setNewDealStageId(null)
            addToPipeline.reportConflict({ contactId, contactName, pipeline: selectedPipeline }, openDealId)
          }}
        />
      )}

      {/* Motivo ao fechar um registro pelo board — QUALQUER tipo de funil
          desde a A4 (SCRUM-926); antes só processo passava por aqui. */}
      <CloseDealReasonModal
        open={!!closeDealTarget}
        onClose={() => setCloseDealTarget(null)}
        deal={closeDealTarget?.deal ?? null}
        stage={closeDealTarget?.stage ?? null}
        pipeline={selectedPipeline}
        onConfirm={handleCloseDealWithReason}
      />

      {/* Campaign wizard seeded from a bulk selection. The seed is captured
          at click time; closing the wizard resets it. On success we refetch
          so any contact-state side-effects (e.g. future audience counters)
          stay accurate, and the bulk selection is cleared. */}
      <CampaignWizard
        open={campaignSeedIds !== null}
        initialContactIds={campaignSeedIds ?? undefined}
        initialName={
          campaignSeedIds && campaignSeedIds.length > 0
            ? `Campanha para ${campaignSeedIds.length} contato${campaignSeedIds.length === 1 ? '' : 's'}`
            : undefined
        }
        onClose={() => setCampaignSeedIds(null)}
        onCreated={() => {
          setCampaignSeedIds(null)
          clearSelection()
          toast('Campanha criada com os contatos selecionados.', 'success')
          refetch()
        }}
      />

      {/* Detail Panel — Fixed right drawer */}
      <AnimatePresence>
        {selectedContactId && (
          <>
            <motion.div
              key="contact-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 z-[39]"
              onClick={() => setSelectedContactId(null)}
            />
            <motion.div
              key="contact-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[48rem] z-40 bg-surface-950 border-l overlay-frame flex flex-col"
            >
              <ContactDetailPanel
                contactId={selectedContactId}
                initialTab={initialPanelTab}
                onClose={() => setSelectedContactId(null)}
                onContactUpdate={handleContactUpdate}
                onContactDeleted={(id) => { removeContact(id); setSelectedContactId(null) }}
                onExpand={
                  isFeatureVisible('contactProfilePage', user?.email)
                    // O drawer fica aberto durante a navegação: a troca de rota
                    // faz o crossfade da tela inteira (AnimatedRoutes dá chave
                    // própria a /contacts/:id) — fechar antes causaria um
                    // slide-out concorrente com o fade. O contato vai no state
                    // para a página nascer sem skeleton.
                    ? (contact) => navigate(`/contacts/${contact.id}`, { state: { contact } })
                    : undefined
                }
              />
            </motion.div>
          </>
        )}
    </AnimatePresence>
    </>
  )
}
