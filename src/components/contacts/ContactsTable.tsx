import { useMemo, useState, useCallback } from 'react'
import {
  UserX, MoreHorizontal, Loader2, MessageSquare, ExternalLink, Smile, Meh, Frown, HelpCircle, Check, X,
  Phone, Copy, CheckSquare, Square, ArrowRightLeft, Trash2, KanbanSquare, Handshake,
} from 'lucide-react'
import { DataTable, type DataTableColumn, type DataTableSort } from '@/components/ui/DataTable'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { useContextMenuCtx, type ContextMenuEntry } from '@/components/ui/contextMenuCore'
import { StageBadge } from './StageBadge'
import { LeadScorePill } from './LeadScorePill'
import { DealsSummaryChips } from './DealsSummaryChips'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { type ContactColumnsConfig } from '@/hooks/useContactColumnsConfig'
import { relativeDate, getActivePipelines, formatPhoneBR } from '@/lib/utils'
import { formatBRL } from '@/utils/money'
import { pipelineKindOption, pipelineKindOf, defaultSalesPipeline } from '@/lib/pipelineKinds'
import type { Contact, ContactStage, Pipeline } from '@/types'

const SENTIMENT_ICON = {
  positive: <Smile className="w-4 h-4 text-status-active" />,
  neutral:  <Meh className="w-4 h-4 text-surface-400" />,
  negative: <Frown className="w-4 h-4 text-red-400" />,
  unknown:  <HelpCircle className="w-4 h-4 text-surface-600" />,
}

const INTENT_CONFIG = {
  high:    { label: 'Alta',    chip: 'var(--color-status-active)' },
  medium:  { label: 'Média',   chip: 'var(--color-status-pending)' },
  low:     { label: 'Baixa',   chip: 'var(--color-status-muted)' },
  unknown: { label: '—',       chip: 'var(--color-status-muted)' },
}

/** Coluna key → campo de ordenação do backend (README 3.2: "seta de ordenação
 *  de 11px na coluna ativa"). Só as 3 colunas com um `sortBy` correspondente
 *  em `ContactFilters` são clicáveis — as demais não têm como o backend ordenar. */
const SORT_KEY_TO_COLUMN: Record<string, string> = {
  displayName: 'name',
  leadScore: 'score',
  lastContactedAt: 'lastContactedAt',
}
const COLUMN_TO_SORT_KEY: Record<string, 'displayName' | 'leadScore' | 'lastContactedAt'> = {
  name: 'displayName',
  score: 'leadScore',
  lastContactedAt: 'lastContactedAt',
}

/** Etiquetas em chips (até `max`, resto em "+N") — mesma peça na coluna
 *  Etiquetas e inline na célula Nome quando a coluna está oculta. */
function TagChips({ tags, max = 2, emptyDash = false }: { tags: Contact['tags']; max?: number; emptyDash?: boolean }) {
  const list = tags ?? []
  if (list.length === 0) return emptyDash ? <span className="text-surface-500 text-xs">—</span> : null
  return (
    <div className="flex gap-1 flex-wrap">
      {list.slice(0, max).map((tag) => (
        <span
          key={tag.id}
          className="color-chip inline-flex items-center h-[18px] whitespace-nowrap align-middle text-[10.5px] font-semibold px-[7px] rounded-xs border"
          style={{ ['--chip']: tag.color } as React.CSSProperties}
          title={tag.name}
        >
          {tag.name}
        </span>
      ))}
      {list.length > max && <span className="text-[11px] text-surface-500">+{list.length - max}</span>}
    </div>
  )
}

function ActionsMenuCell({ contact, onOpenPanel, onOpenConversation }: {
  contact: Contact
  onOpenPanel: (c: Contact) => void
  onOpenConversation?: (c: Contact) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <Dropdown
        open={open}
        onClose={() => setOpen(false)}
        align="right"
        className="w-48"
        anchor={
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={`Mais ações — ${contact.displayName || contact.waId}`}
            aria-haspopup="menu"
            aria-expanded={open}
            // DataTable revealOnHover: escondido até hover/foco da linha;
            // data-row-action-open o mantém visível com o menu aberto.
            data-row-action=""
            data-row-action-open={open ? '' : undefined}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        }
      >
        <div className="px-1 py-1 flex flex-col gap-0.5">
          <DropdownItem onClick={() => { onOpenPanel(contact); setOpen(false) }}>
            <ExternalLink className="w-3.5 h-3.5" /> Abrir CRM
          </DropdownItem>
          {onOpenConversation && (
            <DropdownItem onClick={() => { onOpenConversation(contact); setOpen(false) }}>
              <MessageSquare className="w-3.5 h-3.5" /> Ver conversa
            </DropdownItem>
          )}
        </div>
      </Dropdown>
    </span>
  )
}

interface ContactsTableProps {
  contacts: Contact[]
  loading: boolean
  onOpenPanel: (contact: Contact) => void
  onOpenConversation?: (contact: Contact) => void
  onMoveStage?: (contact: Contact, stage: ContactStage) => void
  onOpenDeals?: (contact: Contact) => void
  /** F9 (SCRUM-875): repassado à linha — "Adicionar ao funil" no menu de contexto. */
  onAddToPipeline?: (contact: Contact, pipeline: Pipeline) => void
  /** Contato com o drawer aberto — pinta a linha como ativa (README 3.2). */
  activeKey?: string | null
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAll?: (ids: string[]) => void
  onBulkDelete?: () => void
  /** Scroll infinito — dispara ao chegar perto do fim da tabela. */
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  /** Colunas configuráveis (README 3.2, "Modal Configurar colunas") — "Nome"
   *  fica de fora, é sempre a primeira e não é togglável. */
  columnsConfig: ContactColumnsConfig
  sortBy?: 'displayName' | 'leadScore' | 'lastContactedAt' | 'createdAt'
  sortDir?: 'asc' | 'desc'
  onSortChange?: (sortBy: 'displayName' | 'leadScore' | 'lastContactedAt', sortDir: 'asc' | 'desc') => void
}

export function ContactsTable({
  contacts,
  loading,
  onOpenPanel,
  onOpenConversation,
  onMoveStage,
  onAddToPipeline,
  activeKey,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onBulkDelete,
  hasMore,
  loadingMore,
  onLoadMore,
  columnsConfig,
  sortBy,
  sortDir,
  onSortChange,
}: ContactsTableProps) {
  const { stages, pipelines } = useCRMConfig()
  const multiPipeline = useMultiPipeline()
  const { open: openContextMenu } = useContextMenuCtx()
  const hasSelection = (selectedIds?.size ?? 0) > 0

  // ── Menu de contexto por linha — mesma árvore de opções que ContactRow.tsx
  //    tinha antes da migração pro DataTable, só que parametrizada pelo
  //    contato clicado em vez de fechar sobre um único contato via props. ──
  const buildContactContextMenu = useCallback((contact: Contact): ContextMenuEntry[] => {
    const otherStages = stages.filter((s) => s.key !== contact.stage)
    const isSelected = selectedIds?.has(contact.id) ?? false
    const selectionCount = selectedIds?.size ?? 0

    const items: ContextMenuEntry[] = [
      { label: 'Abrir CRM', icon: ExternalLink, onClick: () => onOpenPanel(contact) },
    ]
    if (contact.waId) {
      items.push({
        label: 'Copiar telefone',
        icon: Phone,
        onClick: () => navigator.clipboard.writeText(contact.waId ?? '').catch(() => {}),
      })
    }
    items.push({
      label: 'Copiar nome',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(contact.displayName).catch(() => {}),
    })
    if (onToggleSelect) {
      items.push({ separator: true })
      items.push({
        label: isSelected ? 'Desselecionar' : 'Selecionar',
        icon: isSelected ? Square : CheckSquare,
        onClick: () => onToggleSelect(contact.id),
      })
    }
    if (onMoveStage && otherStages.length > 0) {
      items.push({ separator: true })
      items.push({
        label: 'Mover para',
        icon: ArrowRightLeft,
        children: otherStages.map((s) => ({
          label: s.label,
          icon: () => (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
          ),
          onClick: () => onMoveStage(contact, s.key),
        })),
      })
    }
    const activePipelines = multiPipeline && onAddToPipeline ? getActivePipelines(pipelines) : []
    const salesDefault = onAddToPipeline ? defaultSalesPipeline(pipelines) : null
    if (salesDefault) {
      const jaAberto = !salesDefault.allowMultipleOpen
        && !!contact.dealsSummary?.byPipeline.find((b) => b.pipelineId === salesDefault.id && b.openCount > 0)
      items.push({ separator: true })
      items.push({
        label: 'Novo negócio',
        icon: Handshake,
        disabled: jaAberto,
        onClick: () => onAddToPipeline!(contact, salesDefault),
      })
    }
    if (activePipelines.length > 0) {
      items.push({ separator: true })
      items.push({
        label: 'Adicionar ao funil',
        icon: KanbanSquare,
        children: activePipelines.map((p) => {
          const open = contact.dealsSummary?.byPipeline.find((b) => b.pipelineId === p.id && b.openCount > 0)
          const openStages = open?.openStages ?? []
          const allowsMultiple = !!p.allowMultipleOpen
          const openLabel = openStages.length > 1
            ? `${openStages.length} abertos`
            : openStages[0]?.stageLabel ?? null
          const KindIcon = pipelineKindOption(pipelineKindOf(p)).icon
          return {
            label: !open
              ? p.name
              : allowsMultiple
                ? `${p.name} — + outro${openLabel ? ` (${openLabel})` : ''}`
                : `${p.name} — já está${openLabel ? ` · ${openLabel}` : ''}`,
            icon: () => (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <KindIcon className="w-3 h-3 opacity-70" />
              </span>
            ),
            disabled: !!open && !allowsMultiple,
            onClick: () => onAddToPipeline!(contact, p),
          }
        }),
      })
    }
    if (onBulkDelete && hasSelection && isSelected && selectionCount > 0) {
      items.push({ separator: true })
      items.push({
        label: `Excluir selecionados (${selectionCount})`,
        icon: Trash2,
        danger: true,
        onClick: onBulkDelete,
      })
    }
    return items
  }, [stages, pipelines, multiPipeline, selectedIds, hasSelection, onOpenPanel, onMoveStage, onToggleSelect, onAddToPipeline, onBulkDelete])

  const handleRowContextMenu = useCallback((contact: Contact, e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (target?.closest('[data-allow-browser-menu]')) return
    e.preventDefault()
    e.stopPropagation()
    const items = buildContactContextMenu(contact)
    if (items.length > 0) openContextMenu(e.clientX, e.clientY, items)
  }, [buildContactContextMenu, openContextMenu])

  const handleRowClick = useCallback((contact: Contact, e: React.MouseEvent) => {
    if (onToggleSelect && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onToggleSelect(contact.id)
      return
    }
    if (onToggleSelect && hasSelection) {
      e.preventDefault()
      onToggleSelect(contact.id)
      return
    }
    onOpenPanel(contact)
  }, [onToggleSelect, hasSelection, onOpenPanel])

  // ── Definição de todas as colunas togglável/reordenável (README 3.2). ──
  const allColumnsByKey = useMemo((): Record<string, DataTableColumn<Contact>> => ({
    phone: {
      key: 'phone',
      header: 'Telefone',
      render: (c) => <span className="text-[13px] text-surface-400 whitespace-nowrap">{formatPhoneBR(c.waId)}</span>,
    },
    email: {
      key: 'email',
      header: 'E-mail',
      render: (c) => <span className="text-xs text-surface-400 truncate">{c.email || '—'}</span>,
    },
    stage: {
      key: 'stage',
      header: 'Situação',
      render: (c) => c.stage
        ? <StageBadge stage={c.stage} stages={stages} />
        : <span className="text-surface-600 text-xs">—</span>,
    },
    score: {
      key: 'score',
      header: 'Score',
      sortable: true,
      render: (c) => c.leadScore != null
        ? <LeadScorePill score={c.leadScore} showIcon={false} className="text-xs" />
        : <span className="text-surface-600 text-sm font-semibold tabular-nums">—</span>,
    },
    intent: {
      key: 'intent',
      header: 'Intenção',
      render: (c) => {
        const cfg = INTENT_CONFIG[c.intent ?? 'unknown']
        return (
          <span
            className="color-chip inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border"
            style={{ ['--chip']: cfg.chip } as React.CSSProperties}
          >
            {cfg.label}
          </span>
        )
      },
    },
    sentiment: {
      key: 'sentiment',
      header: 'Sentimento',
      render: (c) => SENTIMENT_ICON[c.aiSentiment ?? 'unknown'],
    },
    tags: {
      key: 'tags',
      header: 'Etiquetas',
      render: (c) => <TagChips tags={c.tags} emptyDash />,
    },
    pipelines: {
      key: 'pipelines',
      header: 'Funis',
      render: (c) => <DealsSummaryChips contact={c} className="max-w-[260px]" onAddToPipeline={onAddToPipeline} />,
    },
    source: {
      key: 'source',
      header: 'Fonte',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-surface-400 capitalize">
            {c.source === 'meta_ads' ? 'Meta Ads' : c.source ?? '—'}
          </span>
          {c.source === 'meta_ads' && (
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: '#1877f2', opacity: 0.9 }} title="Meta Ads" />
          )}
        </div>
      ),
    },
    lastContactedAt: {
      key: 'lastContactedAt',
      // "Quando e quem" (você/agente/sem resposta) do mockup: a API não entrega
      // quem falou por último no contato — só o relativo, sem inventar o resto.
      header: 'Última interação',
      sortable: true,
      render: (c) => <span className="text-[13px] text-surface-400 whitespace-nowrap">{relativeDate(c.lastContactedAt)}</span>,
    },
    deals: {
      key: 'deals',
      header: 'Negócios',
      align: 'right',
      // Valor (R$) em vez de contagem; sem valor, "—" mudo (não "0"). Em aberto
      // primeiro, senão o ganho — o tooltip diz qual dos dois está sendo mostrado.
      render: (c) => {
        const s = c.dealsSummary
        const open = s?.openCents ?? 0
        const cents = open > 0 ? open : (s?.wonCents ?? 0)
        if (cents <= 0) return <span className="text-[13px] text-surface-600">—</span>
        return (
          <span className="text-[13px] font-medium tabular-nums text-surface-200" title={open > 0 ? 'Valor em aberto' : 'Valor ganho'}>
            {formatBRL(cents)}
          </span>
        )
      },
    },
    optIn: {
      key: 'optIn',
      header: 'Opt-in',
      render: (c) => c.optIn
        ? <Check className="w-4 h-4 text-status-active" />
        : <X className="w-4 h-4 text-surface-600" />,
    },
  }), [stages, onAddToPipeline])

  // Telefone e etiquetas viram subtítulo/chips dentro do Nome enquanto a coluna
  // própria estiver oculta (padrão); com a coluna ligada, não duplica.
  const phoneInName = columnsConfig.hiddenKeys.has('phone')
  const tagsInName = columnsConfig.hiddenKeys.has('tags')
  const nameColumn: DataTableColumn<Contact> = {
    key: 'name',
    header: 'Nome',
    sortable: true,
    render: (c) => (
      <div className="flex items-center gap-[9px] min-w-0">
        <Avatar name={c.displayName} imageUrl={c.profilePicUrl} size="xs" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-surface-100 truncate">{c.displayName}</p>
          {phoneInName && c.waId && (
            <p className="text-[11px] text-surface-500 tabular-nums truncate">{formatPhoneBR(c.waId)}</p>
          )}
        </div>
        {tagsInName && (c.tags?.length ?? 0) > 0 && (
          <div className="flex-shrink-0"><TagChips tags={c.tags} /></div>
        )}
      </div>
    ),
  }

  const actionsColumn: DataTableColumn<Contact> = {
    key: 'actions',
    header: '',
    widthClass: 'w-9',
    render: (c) => <ActionsMenuCell contact={c} onOpenPanel={onOpenPanel} onOpenConversation={onOpenConversation} />,
  }

  const columns = useMemo(() => {
    const middle = columnsConfig.order
      .filter((key) => key !== 'pipelines' || multiPipeline)
      .filter((key) => !columnsConfig.hiddenKeys.has(key))
      .map((key) => allColumnsByKey[key])
      .filter((c): c is DataTableColumn<Contact> => !!c)
    return [nameColumn, ...middle, actionsColumn]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsConfig.order, columnsConfig.hiddenKeys, multiPipeline, allColumnsByKey])

  const sort: DataTableSort | null = sortBy && SORT_KEY_TO_COLUMN[sortBy]
    ? { key: SORT_KEY_TO_COLUMN[sortBy], dir: sortDir ?? 'desc' }
    : null

  const handleSortChange = (next: DataTableSort) => {
    const key = COLUMN_TO_SORT_KEY[next.key]
    if (key && onSortChange) onSortChange(key, next.dir)
  }

  const handleToggleSelectAll = () => {
    if (!onSelectAll) return
    const allSelected = contacts.length > 0 && contacts.every((c) => selectedIds?.has(c.id))
    onSelectAll(allSelected ? [] : contacts.map((c) => c.id))
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loadingMore || !onLoadMore) return
    const el = e.currentTarget
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 320) onLoadMore()
  }

  return (
    <div className="flex-1 overflow-auto" onScroll={handleScroll}>
      <DataTable
        columns={columns}
        rows={contacts}
        rowKey={(c) => c.id}
        loading={loading && contacts.length === 0}
        emptyIcon={UserX}
        emptyTitle="Nenhum contato encontrado"
        emptyHint="Tente ajustar os filtros ou adicione um novo contato"
        sort={sort}
        onSortChange={handleSortChange}
        onRowClick={handleRowClick}
        onRowContextMenu={handleRowContextMenu}
        activeKey={activeKey}
        rowHeight="md"
        revealOnHover
        selectedKeys={onToggleSelect ? selectedIds ?? new Set() : undefined}
        onToggleSelect={onToggleSelect}
        onToggleSelectAll={onSelectAll ? handleToggleSelectAll : undefined}
      />
      {loadingMore && contacts.length > 0 && (
        <div className="py-4 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-surface-500 animate-spin" />
        </div>
      )}
    </div>
  )
}
