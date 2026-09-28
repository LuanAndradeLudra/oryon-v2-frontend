import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { cn } from '@/lib/utils'
import { CLOSE_FILTER_LABELS, type BoardSummary, type CloseFilter, type OwnerFilter } from '@/lib/boardFilters'
import type { User } from '@/types'

interface BoardFilterBarProps {
  /** Filtros + resumo só existem na aba do quadro; nos relatórios a barra é só lead/trail. */
  users?: User[]
  owner?: OwnerFilter
  onOwnerChange?: (o: OwnerFilter) => void
  close?: CloseFilter
  onCloseChange?: (c: CloseFilter) => void
  summary?: BoardSummary
  /** Funil de processo não tem valor — o resumo mostra só a contagem. */
  isProcess?: boolean
  noun?: string
  /** Tooltip do resumo — contexto do funil (abertos/ganhos hoje/perdidos/entradas). */
  summaryTitle?: string
  /** Início da barra: segmentado de visão + busca (R2-1E-BAR-05: uma barra só). */
  lead?: ReactNode
  /** Fim da barra, depois do resumo: "Etapas". */
  trail?: ReactNode
  /** Chips extras (ex.: "Com mais de um aberto"), depois dos filtros. */
  children?: ReactNode
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fullName(u: User): string {
  return `${u.firstName} ${u.lastName ?? ''}`.trim()
}

/** Chip-gatilho do canvas 1e (`Responsável ▾`): 28px, padding 0/9, gap 5,
 *  raio 7, borda --bd2, 12/600, SEM fundo (cor --tx) em repouso; ativo = borda
 *  de acento + fundo acento suave. */
function FilterChip({
  label, active, open, onClick, testId, ariaLabel,
}: {
  label: string
  active: boolean
  open: boolean
  onClick: () => void
  testId: string
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn(
        'inline-flex items-center gap-[5px] h-7 px-[9px] rounded-sm border text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0',
        active || open
          ? 'border-brand-500 bg-accent-soft text-accent-dark'
          : 'border-[var(--bd2)] text-surface-100 hover:bg-[var(--rowhover)]',
      )}
    >
      {label}
      <ChevronDown className="w-3 h-3 flex-shrink-0" />
    </button>
  )
}

/**
 * Barra do board (README 3.4, R2-1E-BAR): filtros à esquerda, resumo à direita.
 * Só Responsável e Fechamento previsto — Etiqueta fica de fora porque o negócio
 * não tem etiquetas (GAPS [!]); Lista/Previsão idem, só o Kanban existe.
 */
export function BoardFilterBar({
  users = [], owner = 'all', onOwnerChange, close = 'all', onCloseChange, summary, isProcess = false, noun = 'negócio',
  summaryTitle, lead, trail, children,
}: BoardFilterBarProps) {
  const withOwner = !!onOwnerChange
  const withClose = !!onCloseChange
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)

  const ownerUser = owner !== 'all' && owner !== 'none' ? users.find((u) => u.id === owner) : null
  const ownerLabel =
    owner === 'all' ? 'Responsável' : owner === 'none' ? 'Sem responsável' : ownerUser ? fullName(ownerUser) : 'Responsável'
  const closeLabel = close === 'all' ? 'Fechamento previsto' : CLOSE_FILTER_LABELS[close]

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 min-h-11 px-4 py-1.5 border-b border-surface-700 bg-board-bar flex-shrink-0"
      data-testid="board-filter-bar"
    >
      {lead}
      {withOwner && (
      <Dropdown
        open={ownerOpen}
        onClose={() => setOwnerOpen(false)}
        align="left"
        className="w-56"
        anchor={
          <FilterChip
            label={ownerLabel}
            active={owner !== 'all'}
            open={ownerOpen}
            onClick={() => setOwnerOpen((v) => !v)}
            testId="board-filter-owner"
            ariaLabel="Filtrar por responsável"
          />
        }
      >
        <div className="px-1 py-1 flex flex-col gap-0.5 max-h-72 overflow-y-auto">
          {([{ id: 'all', label: 'Todos' }, { id: 'none', label: 'Sem responsável' }] as const).map((o) => (
            <DropdownItem key={o.id} active={owner === o.id} onClick={() => { onOwnerChange?.(o.id); setOwnerOpen(false) }}>
              {o.label}
            </DropdownItem>
          ))}
          {users.map((u) => (
            <DropdownItem key={u.id} active={owner === u.id} onClick={() => { onOwnerChange?.(u.id); setOwnerOpen(false) }}>
              <span className="truncate">{fullName(u)}</span>
            </DropdownItem>
          ))}
        </div>
      </Dropdown>
      )}

      {withClose && (
      // No celular este chip some: as lentes "Sem previsão" e "Previsão
      // vencida" cobrem o uso comum e a barra já ocupava meia tela.
      <div className="hidden md:contents">
      <Dropdown
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        align="left"
        className="w-52"
        anchor={
          <FilterChip
            label={closeLabel}
            active={close !== 'all'}
            open={closeOpen}
            onClick={() => setCloseOpen((v) => !v)}
            testId="board-filter-close"
            ariaLabel="Filtrar por fechamento previsto"
          />
        }
      >
        <div className="px-1 py-1 flex flex-col gap-0.5">
          {(Object.keys(CLOSE_FILTER_LABELS) as CloseFilter[]).map((c) => (
            <DropdownItem key={c} active={close === c} onClick={() => { onCloseChange?.(c); setCloseOpen(false) }}>
              {CLOSE_FILTER_LABELS[c]}
            </DropdownItem>
          ))}
        </div>
      </Dropdown>
      </div>
      )}

      {children}

      <div className="flex-1" />

      {summary && (
      <p className="text-xs text-surface-400 tabular-nums" data-testid="board-summary" title={summaryTitle}>
        <span className="font-bold text-surface-100">
          {summary.total} {noun}{summary.total === 1 ? '' : 's'}
        </span>
        {!isProcess && (
          <>
            {' · '}{brl(summary.openCents)} em aberto
            {' · '}
            <span className="font-semibold text-success">{brl(summary.wonMonthCents)} ganhos no mês</span>
          </>
        )}
      </p>
      )}
      {trail}
    </div>
  )
}
