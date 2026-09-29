import { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Upload, Settings2, AlertTriangle, List, Table, SlidersHorizontal } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTopBarActions, useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { isFeatureVisible } from '@/config/featureFlags'
import { contactsSummaryText } from '@/lib/contactsSummary'
import { ContactsFiltersBar } from '@/components/contacts/ContactsFiltersBar'
import { ViewTabs } from '@/components/contacts/ViewTabs'
import { availableSegments, buildSegmentQuery, getSegment, type SegmentKey } from '@/components/contacts/contactSegments'
import { CRMConfigDrawer } from '@/components/contacts/CRMConfigDrawer'
import { ContactsTable } from '@/components/contacts/ContactsTable'
import { ContactsList } from '@/components/contacts/ContactsList'
import { SendTemplateDrawer } from '@/components/contacts/SendTemplateDrawer'
import { ContactDetailPanel } from '@/components/contacts/ContactDetailPanel'
import type { TabId } from '@/components/contacts/ContactDetailTabs'
import { NewContactDrawer } from '@/components/contacts/NewContactDrawer'
import { ImportContactsDrawer } from '@/components/contacts/ImportContactsDrawer'
import { BulkActionBar } from '@/components/contacts/BulkActionBar'
import { CampaignWizard } from '@/components/campaigns/CampaignWizard'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { Modal } from '@/components/ui/Modal'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Avatar } from '@/components/ui/Avatar'
import { useContacts } from '@/hooks/useContacts'
import { useEstadoNaUrl } from '@/hooks/useEstadoNaUrl'
import { lerFiltrosDeContatos, escreverFiltrosDeContatos, chaveDosFiltrosDeContatos, lerSituacao } from '@/lib/filtrosDeContatos'
import { useToast } from '@/hooks/useToast'
import { useTableSelection } from '@/hooks/useTableSelection'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useListScrollMemory } from '@/hooks/useListScrollMemory'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { useContactColumnsConfig } from '@/hooks/useContactColumnsConfig'
import { ContactsColumnsModal } from '@/components/contacts/ContactsColumnsModal'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { Fab } from '@/components/common/Fab'
import { tagsApi, pipelinesApi, contactsApi } from '@/services/api'
import { isAdminTier } from '@/lib/roleHelpers'
import { cn, getApiErrorMessage } from '@/lib/utils'
import type { Contact, ContactFilters, ContactStage, Tag, Pipeline } from '@/types'
import { RODAPE_DA_LISTA } from '@/components/contacts/rodapeDaLista'

/**
 * Faceta "Situação comercial" (D-10) — filtro opt-in derivado do
 * `dealsSummary` de cada contato, aplicado no BACKEND (SCRUM-293 —
 * `useContacts`/`?commercial=`) porque a lista é paginada no servidor.
 */
type CommercialSituation = 'all' | 'no_deal' | 'open_deal' | 'customer'

/**
 * Ordenação padrão da lista: MAIS RECENTES (criação), e não "última interação".
 *
 * `ORDER BY lastContactedAt DESC` no Postgres põe os NULL primeiro (o service
 * não passa NULLS LAST — pendência B1 de ACHADOS-API-CONTATOS-SEGMENTOS), então
 * todo contato sem conversa sobe ao topo — e, com paginação no servidor, um
 * reordenamento no cliente não resolve (a 1ª página pode ser toda de NULL).
 * `createdAt DESC` é total e estável: nunca há NULL. Quando o backend corrigir
 * o NULLS LAST, voltar para { sortBy: 'lastContactedAt', sortDir: 'desc' }.
 */
const DEFAULT_SORT = { sortBy: 'createdAt', sortDir: 'desc' } as const

const SORT_HINT: Record<string, string> = {
  createdAt: 'mais recentes primeiro',
  lastContactedAt: 'última interação',
  leadScore: 'lead score',
  displayName: 'nome',
}

const COMMERCIAL_OPTIONS: { key: CommercialSituation; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'no_deal', label: 'Sem negócio' },
  { key: 'open_deal', label: 'Com negócio aberto' },
  { key: 'customer', label: 'Cliente' },
]

const lerConfigCrm = (v: string | null) => v === 'crm'
const ABAS_FICHA: readonly TabId[] = ['overview', 'deals', 'history', 'conversations', 'campaigns']
const lerAbaFicha = (v: string | null): TabId => (v && (ABAS_FICHA as readonly string[]).includes(v) ? (v as TabId) : 'overview')
const escreverConfigCrm = (v: boolean) => (v ? 'crm' : null)

/**
 * D2 (SCRUM-935): o board de negócios saiu daqui — cada funil agora é sua
 * própria tela, `/pipelines/:id` (Board + Relatórios). Esta página voltou a
 * ser só a tabela/lista de Contatos; `?pipeline=<id>` (deep link antigo,
 * salvo em favoritos/atalhos) redireciona pra lá em vez de quebrar.
 */
export function ContactsPage() {
  const isMobile = useIsMobile()
  // SCRUM-1068: sobrevive à troca de rota (/contacts → /contacts/:id → volta),
  // diferente de um useRef local que se perde no unmount da página.
  const listScrollPosRef = useListScrollMemory('contacts-list')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const isLg = useMediaQuery('(min-width: 1024px)')

  // Estado na URL (regra do PO: navegação preserva estado): o contato aberto
  // vive em `?contact=<id>` — abre o painel ao montar, é escrito ao abrir/trocar
  // e limpo ao fechar (replace, sem empilhar histórico), preservando os demais
  // params (`?deal=`, `?pipeline=`…). A URL é a fonte da verdade.
  const selectedContactId = searchParams.get('contact')
  // A aba do painel também vive na URL (`?ficha=`). Abrir/trocar de contato
  // grava contato e aba NA MESMA atualização (duas chamadas seguidas se
  // apagariam) — sem aba pedida, o contato abre na Visão geral (regra do painel).
  const setSelectedContactId = useCallback((id: string | null, aba?: TabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id) next.set('contact', id)
      else next.delete('contact')
      if (id && aba && aba !== 'overview') next.set('ficha', aba)
      else next.delete('ficha')
      return next
    }, { replace: true })
  }, [setSearchParams])
  const abaDaFicha: TabId = lerAbaFicha(searchParams.get('ficha'))
  const setAbaDaFicha = useCallback((aba: TabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (aba === 'overview') next.delete('ficha')
      else next.set('ficha', aba)
      return next
    }, { replace: true })
  }, [setSearchParams])

  // D2 (SCRUM-935): `/contacts?pipeline=<id>` (link salvo/atalho de antes do
  // board virar página própria) redireciona pra `/pipelines/<id>` — mantém o
  // deep link funcionando em vez de deixá-lo cair na lista de contatos sem
  // explicação. Outros params (ex. `?deal=<id>`, consumido globalmente pelo
  // DealPanelContext) seguem junto, exceto `pipeline` em si.
  const pipelineRedirectId = searchParams.get('pipeline')
  useEffect(() => {
    if (!pipelineRedirectId) return
    const rest = new URLSearchParams(searchParams)
    rest.delete('pipeline')
    const qs = rest.toString()
    navigate(`/pipelines/${pipelineRedirectId}${qs ? `?${qs}` : ''}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineRedirectId])

  const [showNewContact, setShowNewContact] = useState(false)
  const [showImport, setShowImport] = useState(false)
  // Painel de configuração do CRM aberto na URL (`?config=crm`, como `config=funis` no funil).
  const [showCRMConfig, setShowCRMConfig] = useEstadoNaUrl<boolean>('config', { padrao: false, ler: lerConfigCrm, escrever: escreverConfigCrm })
  const [showColumnsModal, setShowColumnsModal] = useState(false)
  // Situação comercial na URL (`?situacao=`), como os demais filtros.
  const commercial: CommercialSituation = lerSituacao(searchParams)
  const setCommercial = (v: CommercialSituation) => setSearchParams((prev) => {
    const p = new URLSearchParams(prev)
    if (v === 'all') p.delete('situacao')
    else p.set('situacao', v)
    return p
  }, { replace: true })
  // Direção A (DECISOES-PENDENTES #33): "Lista" é o padrão; "Tabela" é o modo
  // denso com colunas configuráveis. Estado na URL (regra do PO): `?view=tabela`;
  // ausente = lista. Sobrevive a recarregar e a voltar de /contacts/:id.
  const view: 'list' | 'table' = searchParams.get('view') === 'tabela' ? 'table' : 'list'
  const changeView = (v: 'list' | 'table') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (v === 'table') next.set('view', 'tabela')
      else next.delete('view')
      return next
    }, { replace: true })
  }
  const [templateContact, setTemplateContact] = useState<Contact | null>(null)
  const columnsConfig = useContactColumnsConfig()

  // Funis do tenant — só para os pickers dos drawers (Novo contato/Importar,
  // "selecionar em qual funil esse contato vai"). Gate SCRUM-498: sem o
  // flag, nem o fetch acontece (o backend nem tem o módulo).
  const multiPipeline = useMultiPipeline()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const { toast } = useToast()

  const fetchPipelines = useCallback(() => {
    if (!multiPipeline) return Promise.resolve()
    return pipelinesApi
      .list()
      .then((res) => setPipelines(res.data ?? []))
      .catch(() => toast('Não foi possível carregar os pipelines.', 'error'))
  }, [toast, multiPipeline])

  useEffect(() => {
    if (!multiPipeline) return
    fetchPipelines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiPipeline])

  const chaveFiltros = chaveDosFiltrosDeContatos(searchParams)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtrosDaUrl = useMemo(() => lerFiltrosDeContatos(searchParams), [chaveFiltros])
  const escreverFiltrosNaUrl = useCallback((f: ContactFilters) => {
    setSearchParams((prev) => escreverFiltrosDeContatos(prev, f), { replace: true })
  }, [setSearchParams])

  const { user } = useAuth()
  const currentUser = user
    ? { firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl }
    : undefined
  // Backend's POST /contacts/bulk/delete is @Roles(ADMIN, BUSINESS_ADMIN).
  // Mirror here so non-admins don't see the "Excluir" affordance in the
  // bulk action bar or the per-row context menu. SUPER_ADMIN passes
  // implicitly via the RolesGuard so the helper already covers it.
  const canBulkDelete = isAdminTier(user?.role)

  const {
    contacts, loading, loadingMore, hasMore, loadMore, error, total, filters, setFilters,
    updateContact, createContact, bulkUpdateStage, bulkRemove,
    bulkAddTag, bulkRemoveTag, removeContact, refetch,
  } = useContacts(
    { ...DEFAULT_SORT },
    {
      commercial: multiPipeline && commercial !== 'all' ? commercial : undefined,
      // Filtros, busca e ordem na URL (regra do PO): sobrevivem ao F5 e ao
      // "voltar" da ficha. Objeto memoizado pela chave — objeto novo = nova busca.
      filtros: filtrosDaUrl,
      aoMudarFiltros: escreverFiltrosNaUrl,
    },
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

  // F9 (SCRUM-875): "Adicionar ao funil" pelo menu da linha da tabela —
  // fluxo compartilhado (criação / DealModal em venda / modal de conflito).
  const addToPipeline = useAddToPipeline({ onCreated: () => { void refetch() } })

  const handleOpenDealContact = (contactId: string) => {
    setSelectedContactId(contactId, 'deals')
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

  // Esc clears selection — com o painel aberto, o Esc é do painel (fecha; o
  // segundo Esc limpa a seleção).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selectedContactId) clearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSelection, selectedContactId])

  const handleFiltersChange = (f: ContactFilters) => setFilters(f)

  // ── Painel do contato: fechar devolve o foco à linha; ↑/↓ troca de contato ──
  const activeIndex = selectedContactId ? contacts.findIndex((c) => c.id === selectedContactId) : -1
  const closePanel = useCallback(() => {
    const id = selectedContactId
    setSelectedContactId(null)
    if (id) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-contact-open="${CSS.escape(id)}"]`)?.focus()
      })
    }
  }, [selectedContactId, setSelectedContactId])

  useEffect(() => {
    if (!selectedContactId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return
      // Modal/menu por cima: o Esc e as setas são dele, não do painel.
      if (document.querySelector('[aria-modal="true"], [role="menu"]')) return
      if (e.key === 'Escape') { e.preventDefault(); closePanel(); return }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && activeIndex >= 0) {
        const down = e.key === 'ArrowDown'
        const next = contacts[activeIndex + (down ? 1 : -1)]
        if (!next) {
          if (down && hasMore && !loadingMore) loadMore()
          return
        }
        e.preventDefault()
        setSelectedContactId(next.id)
        requestAnimationFrame(() => {
          document.querySelector(`[data-contact-id="${CSS.escape(next.id)}"]`)?.scrollIntoView({ block: 'nearest' })
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedContactId, activeIndex, contacts, hasMore, loadingMore, loadMore, closePanel, setSelectedContactId])

  // Lg+: painel ACOPLADO ao lado da lista, sem scrim. Abaixo de lg (e no mobile)
  // segue a sobreposição de tela inteira.
  const dockedOpen = !isMobile && isLg && !!selectedContactId
  // Id deferido: React pinta cabeçalho/lista antes de montar o corpo do painel.
  const deferredContactId = useDeferredValue(selectedContactId)
  // Semente do painel: o contato como a lista o conhece (nome, telefone,
  // etapa, etiquetas) — suficiente para o cabeçalho nascer pronto.
  const seedContact = useMemo(
    () => (selectedContactId ? contacts.find((c) => c.id === selectedContactId) ?? null : null),
    [contacts, selectedContactId],
  )

  // CONT-HDR-03/09 (spec/1c-contatos.GAPS.md): subtítulo dinâmico da TopBar
  // substitui o badge de contagem solto entre os botões. Só "N contatos"
  // (dado real, já filtrado pela faceta comercial) — "N novos esta semana"
  // fica de fora: `ContactsStatsBar.newThisWeek` só conta a página carregada,
  // não o total do tenant (GAPS-PENDENTES 1.3), e inventar o número seria
  // pior que omiti-lo.
  // R2-1C-FILT-02: o resumo (opt-in, c/ etiquetas, situação predominante) saiu da
  // faixa de 36px e ficou no tooltip do subtítulo + no botão "Resumo" da barra de filtros.
  // ── Abas de segmentos (contactSegments.ts, do Farol): só as que a API sustenta
  // (Todos, Quentes) — as demais não existem na tela. A aba ativa é DERIVADA dos
  // filtros (Quentes ≡ intenção alta, a definição do segmento), então escolher
  // "Intenção alta" no painel Filtro também acende Quentes, sem estado duplicado.
  const segments = availableSegments()
  const activeSegment: SegmentKey = filters.intent === 'high' ? 'hot' : 'all'
  const isDefaultSort = (f: ContactFilters, seg: SegmentKey) => {
    const p = getSegment(seg).params
    return (f.sortBy === DEFAULT_SORT.sortBy && f.sortDir === DEFAULT_SORT.sortDir)
      || (f.sortBy === p.sortBy && f.sortDir === p.sortDir)
  }
  const handleSegmentChange = (key: string) => {
    const next = key as SegmentKey
    if (next === activeSegment) return
    // Sai do segmento atual: tira o que ele impunha (intenção e, se a ordenação
    // ainda é a padrão dele/da tela, a ordenação) — a escolha manual do usuário fica.
    const base: ContactFilters = { ...filters }
    if (getSegment(activeSegment).params.intent !== undefined) delete base.intent
    if (isDefaultSort(filters, activeSegment)) { delete base.sortBy; delete base.sortDir }
    const built = buildSegmentQuery(next, base)
    // "Todos" sem ordenação própria volta ao padrão da tela (ver DEFAULT_SORT).
    if (built.sortBy === getSegment('all').params.sortBy && base.sortBy === undefined && next === 'all') {
      built.sortBy = DEFAULT_SORT.sortBy
      built.sortDir = DEFAULT_SORT.sortDir
    }
    setFilters(built)
  }
  // Contagem por aba: uma consulta leve (limit=1) por segmento, sobre os demais
  // filtros do usuário. Falha → sem número (nunca inventa).
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({})
  const countBaseKey = JSON.stringify({
    ...filters, intent: undefined, sortBy: undefined, sortDir: undefined,
    commercial: multiPipeline && commercial !== 'all' ? commercial : undefined,
  })
  useEffect(() => {
    let alive = true
    const base = JSON.parse(countBaseKey) as ContactFilters
    Promise.all(availableSegments().map((seg) =>
      contactsApi.list(buildSegmentQuery(seg.key, base), 1, 1)
        .then((r) => [seg.key, r.data.total] as const)
        .catch(() => null),
    )).then((rows) => {
      if (!alive) return
      const next: Record<string, number> = {}
      rows.forEach((row) => { if (row) next[row[0]] = row[1] })
      setSegmentCounts(next)
    })
    return () => { alive = false }
  }, [countBaseKey])

  const summaryText = contactsSummaryText(contacts, total)
  useRegisterTopBarSubtitle(<span title={summaryText}>{`${total.toLocaleString('pt-BR')} contatos`}</span>, [total, summaryText])

  useRegisterTopBarActions(
    <div className="flex items-center gap-2 flex-wrap">
      {/* Abre o DRAWER de configuração do CRM, não a página de Configurações.

          Cheguei a trocar por atalhos para /settings, argumentando que duas
          superfícies com as mesmas telas fazem as regras de permissão
          divergirem. O PO preferiu o drawer, e a razão dele vence a minha: sair
          da tela para criar UM campo custa o contexto inteiro do trabalho em
          curso — a lista, os filtros, a rolagem —, e configuração de CRM é algo
          que se faz no meio de outra coisa, quase nunca como destino.

          As telas de dentro são os MESMOS componentes de /settings
          (`StagesManager`, `CustomFieldsManager`), então não há duas
          implementações: há duas portas para a mesma sala. */}
      {/* R2-1C-PIX-02 (medido ao vivo): era um botão à mão (30px, 12/500,
          raio 8) — vira o primitivo Button neutral sm (28px, 12/600, raio 7). */}
      <Button
        size="sm"
        variant="neutral"
        leftIcon={<Settings2 className="w-3.5 h-3.5" />}
        onClick={() => setShowCRMConfig(true)}
        data-testid="crm-config-link"
      >
        Configurar
      </Button>
      {/* Direção A: no desktop, Importar e Novo lead moram na barra da lista
          (à direita do seletor Lista|Tabela); aqui ficam só no mobile. */}
      {isMobile && (
        <>
          <Button
            size="sm"
            variant="neutral"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setShowImport(true)}
          >
            Importar
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowNewContact(true)}
          >
            Novo {vocab.contact}
          </Button>
        </>
      )}
    </div>,
    // ATENÇÃO: o nó é registrado na topbar por um efeito com dependências, e o
    // que ela renderiza é a árvore capturada na última registração. Qualquer
    // ESTADO que este bloco leia precisa entrar nesta lista, senão o controle
    // fica congelado no valor antigo e o clique não faz nada visível — foi o
    // que aconteceu quando o botão virou menu (10/09).
    [total, vocab.contact, isMobile],
  )

  // Handlers da lista (ContactListRow é React.memo): identidade ESTÁVEL, pra que
  // abrir/trocar de contato re-renderize só as 2 linhas cujo `active` mudou. O
  // que muda por render (tamanho da seleção) entra por ref, não por dependência.
  const handleOpenPanel = useCallback((contact: Contact) => {
    setSelectedContactId(contact.id)
  }, [setSelectedContactId])

  // "Abrir ficha": o painel fica aberto durante a navegação (a troca de rota faz
  // o crossfade da tela inteira — AnimatedRoutes dá chave própria a
  // /contacts/:id; fechar antes causaria um slide-out concorrente com o fade).
  // O contato vai no state para a página nascer sem skeleton.
  const canOpenProfile = isFeatureVisible('contactProfilePage', user?.email)
  const openProfile = useMemo(
    () => (canOpenProfile
      // A ficha volta para ESTA lista com filtros, busca e visão (a URL toda),
      // e não para `/contacts?contact=` cru, que perdia tudo.
      ? (contact: Contact) => {
          const volta = new URLSearchParams(searchParams)
          volta.set('contact', contact.id)
          navigate(`/contacts/${contact.id}`, { state: { contact, voltarPara: `/contacts?${volta.toString()}` } })
        }
      : undefined),
    [canOpenProfile, navigate, searchParams],
  )

  // Linha da lista: Ctrl/Cmd (ou já existir seleção) marca em vez de abrir —
  // mesmo contrato do clique na linha da tabela.
  const selectionSizeRef = useRef(0)
  useEffect(() => { selectionSizeRef.current = selectedIds.size }, [selectedIds])
  const handleRowOpen = useCallback((contact: Contact, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || selectionSizeRef.current > 0) {
      e.preventDefault()
      toggleSelect(contact.id)
      return
    }
    handleOpenPanel(contact)
  }, [toggleSelect, handleOpenPanel])

  // Ação "Abrir conversa" da linha: a conversa mais recente do contato. Sem
  // conversa não há o que abrir — o caminho é o template (não inventa uma).
  const handleOpenConversation = useCallback((contact: Contact) => {
    contactsApi.getConversations(contact.id)
      .then((r) => {
        const conv = r.data?.data?.[0]
        if (conv) navigate(`/conversations?id=${conv.id}`)
        else toast('Este contato ainda não tem conversa. Envie um template para iniciar.', 'info')
      })
      .catch(() => toast('Não foi possível abrir a conversa.', 'error'))
  }, [navigate, toast])

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

  // Ainda redirecionando `?pipeline=` — não pisca a tabela de contatos por
  // baixo enquanto a navegação acontece.
  if (pipelineRedirectId) return null

  return (
    <>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-surface-950">
        {isMobile && <MobilePageHeader title="Contatos" />}


        {/* Busca + filtros: 2 mais usados inline (Fonte, Etiquetas) e o resto
            dentro do botão "Filtros". */}
        <ContactsFiltersBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          tags={tags}
          commercial={multiPipeline ? { value: commercial, options: COMMERCIAL_OPTIONS, onChange: (k) => setCommercial(k as CommercialSituation) } : undefined}
          trailing={(
            <>
              {view === 'table' && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                  onClick={() => setShowColumnsModal(true)}
                  title="Configurar colunas"
                >
                  Colunas
                </Button>
              )}
              <SegmentedControl
                label="Modo de exibição"
                size="sm"
                value={view}
                onChange={changeView}
                // Barra estreita (< 720 px): só o ícone; o nome segue para leitor de tela.
                options={[
                  { value: 'list', label: <span className="sr-only @[720px]:not-sr-only">Lista</span>, icon: List },
                  { value: 'table', label: <span className="sr-only @[720px]:not-sr-only">Tabela</span>, icon: Table },
                ]}
              />
              <Button size="sm" variant="neutral" leftIcon={<Upload className="w-3.5 h-3.5" />} onClick={() => setShowImport(true)} title="Importar contatos">
                <span className="sr-only @[720px]:not-sr-only">Importar</span>
              </Button>
              <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowNewContact(true)}>
                Novo {vocab.contact}
              </Button>
            </>
          )}
        />

        <ViewTabs
          views={segments.map((seg) => ({ id: seg.key, label: seg.label, count: segmentCounts[seg.key] }))}
          value={activeSegment}
          onChange={handleSegmentChange}
          hint={`ordenado por ${SORT_HINT[filters.sortBy ?? DEFAULT_SORT.sortBy] ?? 'critério escolhido'}`}
        />

        <div className={cn(
          'flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)]',
          dockedOpen ? 'grid-cols-[minmax(0,1fr)_400px]' : 'grid-cols-[minmax(0,1fr)]',
        )}>
        <div className="min-w-0 min-h-0 flex flex-col bg-surface-800">
          {error ? (
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
            // Mobile: a mesma lista de pessoas em variante touch (sem checkbox nem
            // ações inline — as ações estão no painel); tabela larga fica
            // inutilizável em viewport estreita.
            <ContactsList
              variant="touch"
              contacts={contacts}
              loading={loading}
              activeId={selectedContactId}
              onOpen={handleRowOpen}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              scrollPositionRef={listScrollPosRef}
            />
          ) : (
            <>
            {view === 'list' ? (
            <ContactsList
              contacts={contacts}
              loading={loading}
              activeId={selectedContactId}
              selectedIds={selectedIds}
              onOpen={handleRowOpen}
              onToggleSelect={toggleSelect}
              onOpenConversation={handleOpenConversation}
              onSendTemplate={setTemplateContact}
              onOpenProfile={openProfile}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              scrollPositionRef={listScrollPosRef}
            />
            ) : (
            <ContactsTable
              contacts={contacts}
              loading={loading}
              onOpenPanel={handleOpenPanel}
              onMoveStage={handleMoveStage}
              onOpenDeals={handleOpenDealContact ? (c) => handleOpenDealContact(c.id) : undefined}
              onAddToPipeline={(c, p) => addToPipeline.requestAdd({ contactId: c.id, contactName: c.displayName || c.waId, pipeline: p })}
              activeKey={selectedContactId}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onBulkDelete={canBulkDelete ? requestBulkDelete : undefined}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              columnsConfig={columnsConfig}
              sortBy={filters.sortBy}
              sortDir={filters.sortDir}
              onSortChange={(sortBy, sortDir) => setFilters({ ...filters, sortBy, sortDir })}
            />
            )}
            {/* CONT-FOOTER-01..04 (spec/1c-contatos.GAPS.md): rodapé fixo de
                40px — "1–N de total" fora de seleção, ações em massa dentro
                dela (era uma pílula flutuante, BulkActionBar `inline`). As
                setas de paginação do mock não entram: a lista é scroll
                infinito, sem endpoint de página (GAPS-PENDENTES). */}
            <div className={RODAPE_DA_LISTA}>
              {selectedIds.size > 0 ? (
                <BulkActionBar
                  inline
                  count={selectedIds.size}
                  total={total}
                  selectedContacts={selectedContacts}
                  tags={tags}
                  onMoveStage={handleBulkMoveStage}
                  onAddTag={handleBulkAddTag}
                  onRemoveTag={handleBulkRemoveTag}
                  onCreateCampaign={handleCreateCampaignFromSelection}
                  onDelete={canBulkDelete ? requestBulkDelete : undefined}
                  onClear={clearSelection}
                />
              ) : (
                <span>
                  {contacts.length === 0 ? '0 de 0' : `1–${contacts.length.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')}`}
                </span>
              )}
            </div>
            </>
          )}
        </div>
        {/* Abertura: a coluna de 400px entra de uma vez (um relayout só) e o
            conteúdo desliza/esmaece em CSS (`.panel-in`). Troca de contato
            (↑↓/clique): o miolo remonta por `key` com `.panel-swap`, já com o
            contato da lista como semente — sem spinner. O corpo pesado usa o
            id DEFERIDO: o cabeçalho pinta primeiro, o resto vem em seguida. */}
        {dockedOpen && selectedContactId && (
          <aside
            aria-label="Detalhe do contato"
            className="panel-in min-w-0 min-h-0 flex flex-col overflow-hidden border-l border-surface-700 bg-[var(--panel-bg)]"
          >
            <div key={selectedContactId} className="panel-swap flex-1 min-h-0 flex flex-col">
              <ContactDetailPanel
                docked
                contactId={selectedContactId}
                initialContact={seedContact}
                deferBody={deferredContactId !== selectedContactId}
                tab={abaDaFicha}
                onTabChange={setAbaDaFicha}
                onClose={closePanel}
                onContactUpdate={handleContactUpdate}
                onContactDeleted={(id) => { removeContact(id); setSelectedContactId(null) }}
                onExpand={openProfile}
                footer={activeIndex >= 0 ? `${activeIndex + 1} de ${total.toLocaleString('pt-BR')} · ↑↓ para navegar` : '↑↓ para navegar'}
              />
            </div>
          </aside>
        )}
        </div>
      </div>

      {/* Mobile FAB: novo contato — desktop usa o "+ Novo" do header */}
      <Fab
        icon={<Plus className="w-6 h-6" />}
        label="Novo contato"
        onClick={() => setShowNewContact(true)}
      />

      {/* Bulk delete confirmation — shared between bar and context menu.
          Usa o Modal cru (role=alertdialog) e não o ConfirmModal porque mostra
          a prévia dos contatos que serão excluídos; o alcance vai no mesmo
          bloco de impacto (Banner danger + contagem) do ConfirmModal. */}
      <Modal
        open={confirmBulkDelete}
        onClose={() => { if (!bulkDeleting) setConfirmBulkDelete(false) }}
        title={`Excluir ${selectedIds.size} contato${selectedIds.size === 1 ? '' : 's'}`}
        className="max-w-md"
        role="alertdialog"
      >
        <Banner variant="danger" className="mb-4">
          <p className="leading-snug">
            <span className="font-display text-base font-bold mr-1.5 tabular-nums">{selectedIds.size}</span>
            {selectedIds.size === 1 ? 'contato será excluído permanentemente' : 'contatos serão excluídos permanentemente'}
          </p>
          <p className="mt-0.5 opacity-80">
            {selectedIds.size === 1
              ? 'Esta ação não pode ser desfeita pela interface.'
              : 'Esta ação não pode ser desfeita pela interface. Revise os contatos abaixo antes de confirmar.'}
          </p>
        </Banner>

        {selectedContacts.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-2">
              Contatos ({selectedContacts.length})
            </p>
            <div className="max-h-64 overflow-y-auto pr-1 space-y-1 rounded-lg border border-surface-700 bg-surface-950/50 p-1.5">
              {selectedContacts.slice(0, 50).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--rowhover)] transition-colors"
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
          {/* Foco inicial em Cancelar (destrutivo): Enter não apaga por acidente. */}
          <Button
            variant="neutral"
            onClick={() => { if (!bulkDeleting) setConfirmBulkDelete(false) }}
            disabled={bulkDeleting}
            data-autofocus=""
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmBulkDeleteAction}
            loading={bulkDeleting}
            disabled={bulkDeleting || selectedIds.size === 0}
          >
            {bulkDeleting ? 'Excluindo...' : `Excluir ${selectedIds.size} contato${selectedIds.size === 1 ? '' : 's'}`}
          </Button>
        </div>
      </Modal>

      {/* "Enviar template" da linha da lista (o do painel vive no header dele). */}
      {templateContact && (
        <SendTemplateDrawer
          contact={templateContact}
          open
          onClose={() => setTemplateContact(null)}
        />
      )}

      {/* Import Contacts Drawer */}
      <ImportContactsDrawer
        open={showImport}
        onClose={() => setShowImport(false)}
        onCreate={createContact}
        onDone={() => { setShowImport(false); refetch() }}
        pipelines={pipelines}
      />

      {/* New Contact Drawer */}
      <NewContactDrawer
        open={showNewContact}
        onClose={() => setShowNewContact(false)}
        onCreate={createContact}
        onCreated={(contact) => {
          setSelectedContactId(contact.id)
          refetch()
        }}
        pipelines={pipelines}
      />

      <CRMConfigDrawer
        open={showCRMConfig}
        onClose={() => setShowCRMConfig(false)}
      />

      <ContactsColumnsModal
        open={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        config={columnsConfig}
        multiPipeline={multiPipeline}
      />

      {/* F9 (SCRUM-875): diálogos do "Adicionar ao funil" (conflito / motivo / negócio) */}
      {addToPipeline.dialogs}

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

      {/* Detail Panel — sobreposição de tela inteira (abaixo de lg / mobile).
          Em lg+ o painel é o <aside> acoplado acima, sem scrim. */}
      <AnimatePresence>
        {selectedContactId && !dockedOpen && (
          <>
            <motion.div
              key="contact-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-[var(--color-scrim-soft)] z-[39]"
              onClick={closePanel}
            />
            <motion.div
              key="contact-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
              className="fixed top-0 right-0 bottom-0 w-full z-40 bg-[var(--panel-bg)] border-l overlay-frame flex flex-col"
            >
              <ContactDetailPanel
                contactId={selectedContactId}
                tab={abaDaFicha}
                onTabChange={setAbaDaFicha}
                onClose={closePanel}
                onContactUpdate={handleContactUpdate}
                onContactDeleted={(id) => { removeContact(id); setSelectedContactId(null) }}
                onExpand={openProfile}
              />
            </motion.div>
          </>
        )}
    </AnimatePresence>
    </>
  )
}
