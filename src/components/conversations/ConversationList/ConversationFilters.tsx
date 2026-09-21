import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveActivePreset } from '@/lib/dateRange'
import { resolveHandlingValue } from '@/lib/conversationFilterState'
import { QuickFiltersMenu } from './QuickFiltersMenu'
import { TagFilterMenu } from './TagFilterMenu'
import type { ConversationFilters, Tag, User } from '@/types'

// ── Esquema de filtros da lista (mock 1d) ────────────────────────────────────
//
//   [ Minhas | Fila | Todas ]                                     [ funil ]
//   ( Não lidas ) ( Com IA ) ( SLA ) ( Etiqueta ▾ )
//
// R2-1D-FILT (RODADA-2.md): tudo mapeia em filtros que já existiam —
//   Minhas/Fila/Todas → assignedTo 'me' | 'unassigned' | 'all'
//   Não lidas         → unreadOnly
//   Com IA            → aiHandling 'active'
//   SLA               → awaitingReply (cliente aguardando resposta)
//   Etiqueta ▾        → tagId (TagFilterMenu)
// Status (Todas/Abertas/Pendentes/Resolvidas), período, IA pausada, Equipe,
// sem etiqueta e verificação foram para o menu do funil (QuickFiltersMenu).
// Contagem por segmento (Minhas 7 / Fila 12) e por chip NÃO existe na API —
// só `statusCounts` — então os números do mock ficam de fora, não inventados.

const SEGMENTS = [
  { label: 'Minhas', value: 'me' },
  { label: 'Fila',   value: 'unassigned' },
  { label: 'Todas',  value: 'all' },
] as const

const STATUS_LABEL: Record<string, string> = { open: 'Abertas', pending: 'Pendentes', resolved: 'Resolvidas' }
const PERIOD_LABEL: Record<string, string> = {
  today: 'Hoje', yesterday: 'Ontem', last7: 'Últimos 7 dias', custom: 'Período personalizado',
}

interface ConversationFiltersBarProps {
  filters: ConversationFilters
  onFiltersChange: (f: ConversationFilters) => void
  counts?: Partial<Record<string, number>>
  allTags?: Tag[]
  /** Team roster — label do filtro "Equipe" ativo e lista do menu. */
  allUsers?: User[]
  /** Contador âmbar de "Precisam de verificação" dentro do menu do funil. */
  needsReviewCount?: number
}

function Chip({
  active, onClick, children, title,
}: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        'inline-flex items-center h-6 px-2 rounded-sm border text-[11.5px] font-semibold whitespace-nowrap transition-colors flex-shrink-0',
        active
          ? 'border-brand-500 bg-accent-soft text-accent-dark'
          : 'border-[var(--bd2)] bg-surface-800 text-surface-300 hover:text-surface-100',
      )}
    >
      {children}
    </button>
  )
}

export function ConversationFiltersBar({
  filters, onFiltersChange, counts = {}, allTags = [], allUsers = [], needsReviewCount = 0,
}: ConversationFiltersBarProps) {
  const set = (patch: Partial<ConversationFilters>) => onFiltersChange({ ...filters, ...patch })

  const handlingValue = resolveHandlingValue(filters)
  const activePeriod = resolveActivePreset(filters.startDate)
  const activeStatus = filters.status && filters.status !== 'all' ? filters.status : null
  const teamPicked = handlingValue === 'team' && filters.assignedTo !== 'unassigned'
  const aiPaused = handlingValue === 'paused'

  const teamLabel = (() => {
    if (!teamPicked) return ''
    const u = allUsers.find((x) => x.id === filters.assignedTo)
    return u ? `Equipe: ${`${u.firstName} ${u.lastName ?? ''}`.trim()}` : 'Equipe'
  })()

  // Pílulas dos filtros que moram no menu do funil — ficam visíveis (e
  // removíveis) aqui pra o operador sempre ver o que está estreitando a lista.
  const pills: { key: string; label: string; onRemove: () => void }[] = []
  if (activeStatus) pills.push({ key: 'status', label: STATUS_LABEL[activeStatus] ?? activeStatus, onRemove: () => set({ status: 'all' }) })
  if (activePeriod) pills.push({ key: 'period', label: PERIOD_LABEL[activePeriod] ?? 'Período', onRemove: () => set({ startDate: undefined, endDate: undefined }) })
  if (aiPaused) pills.push({ key: 'paused', label: 'IA pausada', onRemove: () => set({ aiHandling: 'all' }) })
  if (teamPicked) pills.push({ key: 'team', label: teamLabel, onRemove: () => set({ assignedTo: 'all' }) })
  if (filters.untagged) pills.push({ key: 'untagged', label: 'Sem etiqueta', onRemove: () => set({ untagged: undefined }) })
  if (filters.needsReview) pills.push({ key: 'review', label: 'Precisam de verificação', onRemove: () => set({ needsReview: undefined }) })

  const clearAll = () =>
    onFiltersChange({
      ...filters,
      assignedTo: 'all',
      aiHandling: 'all',
      tagId: undefined,
      unreadOnly: undefined,
      awaitingReply: undefined,
      untagged: undefined,
      needsReview: undefined,
      status: 'all',
      startDate: undefined,
      endDate: undefined,
    })

  const anyActive = pills.length > 0 || !!filters.tagId || !!filters.unreadOnly || !!filters.awaitingReply
    || filters.assignedTo === 'me' || filters.assignedTo === 'unassigned' || filters.aiHandling === 'active'

  const segmentValue = filters.assignedTo === 'me' || filters.assignedTo === 'unassigned' ? filters.assignedTo
    : (!filters.assignedTo || filters.assignedTo === 'all') ? 'all' : null

  return (
    <div className="px-3 pt-2.5 pb-2 space-y-2">
      {/* Segmentado + funil */}
      <div className="flex items-center gap-2">
        <div role="group" aria-label="Atendimento" className="inline-flex h-7 rounded-sm border border-surface-700 p-0.5 gap-0.5">
          {SEGMENTS.map(({ label, value }) => {
            const active = segmentValue === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => set({ assignedTo: value })}
                className={cn(
                  'px-2.5 rounded-[5px] text-xs font-semibold transition-colors',
                  active ? 'bg-surface-900 text-surface-100' : 'text-surface-400 hover:text-surface-100',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="ml-auto">
          <QuickFiltersMenu
            filters={filters}
            onFiltersChange={onFiltersChange}
            allUsers={allUsers}
            needsReviewCount={needsReviewCount}
            counts={counts}
          />
        </div>
      </div>

      {/* Chips rápidos */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Chip active={!!filters.unreadOnly} onClick={() => set({ unreadOnly: filters.unreadOnly ? undefined : true })}>
          Não lidas
        </Chip>
        <Chip
          active={filters.aiHandling === 'active'}
          onClick={() => set({ aiHandling: filters.aiHandling === 'active' ? 'all' : 'active' })}
        >
          Com IA
        </Chip>
        <Chip
          active={!!filters.awaitingReply}
          onClick={() => set({ awaitingReply: filters.awaitingReply ? undefined : true })}
          title="Cliente aguardando resposta"
        >
          SLA
        </Chip>
        <TagFilterMenu filters={filters} onFiltersChange={onFiltersChange} allTags={allTags} />
      </div>

      {pills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {pills.map((p) => (
            <span
              key={p.key}
              className="inline-flex items-center gap-1 h-5 pl-2 pr-1.5 rounded-sm border border-surface-700 bg-surface-900 text-[11px] font-semibold text-surface-200"
            >
              {p.label}
              <button type="button" onClick={p.onRemove} aria-label={`Remover ${p.label}`} className="text-surface-400 hover:text-surface-100">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {anyActive && (
        <button
          type="button"
          onClick={clearAll}
          className="text-[11px] font-semibold text-surface-400 hover:text-surface-100 transition-colors inline-flex items-center gap-1"
        >
          <X className="w-2.5 h-2.5" />
          Limpar filtros
        </button>
      )}
    </div>
  )
}
