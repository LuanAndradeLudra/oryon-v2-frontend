import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowRightLeft, UserRound, MoveRight, X, Handshake } from 'lucide-react'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, getActivePipelines, getInitials } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { dealProbability } from '@/lib/dealProbability'
import { originInfo, timeInStage, stuckDaysInStage } from '@/lib/dealCard'
import type { Deal, Pipeline, PipelineStage, User } from '@/types'

export type ListSort = 'etapa' | 'valor' | 'previsao' | 'parado'

interface DealsListProps {
  stages: PipelineStage[]
  deals: Deal[]
  users: User[]
  pipeline: Pipeline
  pipelines: Pipeline[]
  loading?: boolean
  sort: ListSort
  sortDesc: boolean
  onSort: (sort: ListSort) => void
  onOpenDeal: (dealId: string) => void
  onOpenContact?: (contactId: string) => void
  selectedDealId?: string | null
  /** Ações em lote — cada uma recebe os selecionados e devolve quando terminar. */
  onBulkOwner: (deals: Deal[], ownerUserId: string | null) => Promise<void>
  onBulkStage: (deals: Deal[], stageId: string) => Promise<void>
  onBulkPipeline: (deals: Deal[], pipelineId: string) => Promise<void>
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const fullName = (u: User) => `${u.firstName} ${u.lastName ?? ''}`.trim()

/**
 * Lista de negócios do funil (direção C · C2). Mesmos dados e os mesmos
 * recortes do Quadro — a lente, o responsável e a janela dos fechados vêm de
 * quem chama —, só que em linhas: dá para comparar valores, ordenar e agir em
 * vários de uma vez. Nenhum dado novo: tudo sai da listagem do quadro.
 */
export function DealsList({
  stages, deals, users, pipeline, pipelines, loading, sort, sortDesc, onSort, onOpenDeal, onOpenContact, selectedDealId,
  onBulkOwner, onBulkStage, onBulkPipeline,
}: DealsListProps) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<null | 'owner' | 'stage' | 'pipeline'>(null)
  const [ocupado, setOcupado] = useState(false)
  const movel = useIsMobile()

  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s] as const)), [stages])
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u] as const)), [users])
  const outrosFunis = getActivePipelines(pipelines).filter((p) => p.id !== pipeline.id)
  const etapasAbertas = stages.filter((s) => !s.isWon && !s.isLost)

  const linhas = useMemo(() => {
    const ordem = new Map(stages.map((s, i) => [s.id, i] as const))
    const chave = (d: Deal): number => {
      switch (sort) {
        case 'valor': return d.amountCents ?? 0
        case 'previsao': return d.expectedCloseAt ? new Date(d.expectedCloseAt).getTime() : Number.POSITIVE_INFINITY
        case 'parado': {
          const raw = d.stageEnteredAt ?? d.updatedAt ?? d.createdAt
          return raw ? -new Date(raw).getTime() : 0
        }
        default: return ordem.get(d.stageId) ?? 0
      }
    }
    const out = [...deals].sort((a, b) => chave(a) - chave(b))
    return sortDesc ? out.reverse() : out
  }, [deals, stages, sort, sortDesc])

  // Seleção só do que está na lista agora: trocar de lente não deixa
  // selecionado escondido que a ação em lote atingiria sem ninguém ver.
  const visiveis = new Set(linhas.map((d) => d.id))
  const marcados = linhas.filter((d) => selecionados.has(d.id))
  const todosMarcados = linhas.length > 0 && marcados.length === linhas.length
  const alternar = (id: string) => setSelecionados((prev) => {
    const next = new Set([...prev].filter((x) => visiveis.has(x)))
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const alternarTodos = () => setSelecionados(todosMarcados ? new Set() : new Set(linhas.map((d) => d.id)))

  const agir = async (fn: () => Promise<void>) => {
    setMenu(null)
    setOcupado(true)
    try {
      await fn()
      setSelecionados(new Set())
    } finally {
      setOcupado(false)
    }
  }

  const total = linhas.reduce((s, d) => s + (d.amountCents ?? 0), 0)
  const ponderado = linhas.reduce((s, d) => s + dealProbability(d, stageById.get(d.stageId)).weightedAmountCents, 0)

  const cabeca = (id: ListSort, children: string, alinhar: 'left' | 'right' = 'left') => (
    <th key={id} scope="col" aria-sort={sort === id ? (sortDesc ? 'descending' : 'ascending') : 'none'} className={cn('px-3 font-bold', alinhar === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(id)}
        className={cn('inline-flex items-center gap-1 uppercase tracking-[.1em] hover:text-surface-200', sort === id && 'text-surface-200')}
      >
        {children}
        {sort === id && (sortDesc ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </button>
    </th>
  )

  if (!loading && linhas.length === 0) {
    return (
      <div className="p-6">
        <EmptyState icon={Handshake} title="Nenhum negócio neste recorte" hint="Troque a lente ou limpe os filtros para ver os outros negócios." />
      </div>
    )
  }

  // Celular: a tabela de dez colunas deixava etapa e valor fora da tela.
  // Uma linha por negócio com o que decide o toque (o quê, de quem, em que
  // etapa, quanto, se está parado); ações em lote ficam no computador.
  if (movel) {
    return (
      <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-surface-800" data-testid="deals-list">
        {linhas.map((d) => {
          const st = stageById.get(d.stageId)
          const parado = stuckDaysInStage(d)
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onOpenDeal(d.id)}
                className="w-full min-h-[60px] flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--rowhover)]"
                data-testid="deals-list-row"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-surface-100 truncate">{d.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-surface-400 min-w-0">
                    <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ backgroundColor: st?.color }} aria-hidden />
                    <span className="truncate">{st?.label ?? '—'}{d.contact ? ` · ${d.contact.displayName}` : ''}</span>
                  </span>
                </span>
                <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-sm font-bold tabular-nums text-surface-100">{brl(d.amountCents ?? 0)}</span>
                  <span className={cn('text-2xs', parado !== null ? 'text-status-pending font-semibold' : 'text-surface-500')}>
                    {parado !== null ? `${parado} d parado` : (timeInStage(d) ?? '')}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
        <li className="px-4 py-3 text-xs text-surface-400 tabular-nums">
          {linhas.length} negócio{linhas.length === 1 ? '' : 's'} · {brl(total)}
        </li>
      </ul>
    )
  }

  return (
    <div className="relative flex-1 min-h-0 flex flex-col" data-testid="deals-list">
      {marcados.length > 0 && (
        // Barra FLUTUANTE no rodapé (padrão Gmail/Linear): no topo ela empurrava
        // a tabela ao marcar a primeira linha, e o clique seguinte caía na
        // linha errada.
        <div
          role="toolbar"
          aria-label="Ações nos negócios selecionados"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[2] flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border overlay-frame bg-surface-900 shadow-[var(--shadow-overlay)]"
          data-testid="deals-list-bulk"
        >
          <span className="text-xs font-bold text-surface-100 tabular-nums">{marcados.length} selecionado{marcados.length === 1 ? '' : 's'}</span>
          <Dropdown
            open={menu === 'owner'}
            onClose={() => setMenu(null)}
            align="left"
            className="w-56"
            anchor={<Button size="sm" variant="neutral" disabled={ocupado} leftIcon={<UserRound className="w-3.5 h-3.5" />} onClick={() => setMenu(menu === 'owner' ? null : 'owner')}>Trocar responsável</Button>}
          >
            <div className="px-1 py-1 flex flex-col gap-0.5 max-h-72 overflow-y-auto">
              <DropdownItem onClick={() => void agir(() => onBulkOwner(marcados, null))}>Sem responsável</DropdownItem>
              {users.map((u) => (
                <DropdownItem key={u.id} onClick={() => void agir(() => onBulkOwner(marcados, u.id))}><span className="truncate">{fullName(u)}</span></DropdownItem>
              ))}
            </div>
          </Dropdown>
          <Dropdown
            open={menu === 'stage'}
            onClose={() => setMenu(null)}
            align="left"
            className="w-52"
            anchor={<Button size="sm" variant="neutral" disabled={ocupado} leftIcon={<MoveRight className="w-3.5 h-3.5" />} onClick={() => setMenu(menu === 'stage' ? null : 'stage')}>Mover de etapa</Button>}
          >
            <div className="px-1 py-1 flex flex-col gap-0.5">
              {/* Só etapas abertas: fechar pede motivo, um por negócio (porta única do fechamento). */}
              {etapasAbertas.map((s) => (
                <DropdownItem key={s.id} onClick={() => void agir(() => onBulkStage(marcados, s.id))}>
                  <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </DropdownItem>
              ))}
            </div>
          </Dropdown>
          {outrosFunis.length > 0 && (
            <Dropdown
              open={menu === 'pipeline'}
              onClose={() => setMenu(null)}
              align="left"
              className="w-52"
              anchor={<Button size="sm" variant="neutral" disabled={ocupado} leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />} onClick={() => setMenu(menu === 'pipeline' ? null : 'pipeline')}>Transferir de funil</Button>}
            >
              <div className="px-1 py-1 flex flex-col gap-0.5">
                {outrosFunis.map((p) => (
                  <DropdownItem key={p.id} onClick={() => void agir(() => onBulkPipeline(marcados, p.id))}>
                    <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </DropdownItem>
                ))}
              </div>
            </Dropdown>
          )}
          <Button size="sm" variant="ghost" iconOnly aria-label="Limpar seleção" onClick={() => setSelecionados(new Set())}><X className="w-3.5 h-3.5" /></Button>
        </div>
      )}
      <div className={cn('flex-1 min-h-0 overflow-auto', marcados.length > 0 && 'pb-20')}>
        <table className="w-full min-w-[980px] text-[13px]">
          <caption className="sr-only">Negócios do funil {pipeline.name}</caption>
          <thead className="sticky top-0 z-[1] bg-board-bar text-left text-3xs text-surface-500">
            <tr className="h-9 border-b border-surface-700">
              <th scope="col" className="w-10 px-3">
                <input type="checkbox" aria-label="Selecionar todos" checked={todosMarcados} onChange={alternarTodos} className="accent-[var(--color-brand-500)]" />
              </th>
              <th scope="col" className="px-3 font-bold uppercase tracking-[.1em]">Negócio</th>
              <th scope="col" className="px-3 font-bold uppercase tracking-[.1em]">Contato</th>
              {cabeca('etapa', 'Etapa')}
              {cabeca('valor', 'Valor', 'right')}
              <th scope="col" className="px-3 font-bold uppercase tracking-[.1em] text-right">Ponderado</th>
              {cabeca('previsao', 'Previsão')}
              {cabeca('parado', 'Na etapa')}
              <th scope="col" className="px-3 font-bold uppercase tracking-[.1em]">Responsável</th>
              <th scope="col" className="px-3 font-bold uppercase tracking-[.1em]">Origem</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((d) => {
              const st = stageById.get(d.stageId)
              const dono = d.ownerUserId ? userById.get(d.ownerUserId) : undefined
              const parado = stuckDaysInStage(d)
              const prev = d.expectedCloseAt ? new Date(d.expectedCloseAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'
              return (
                <tr
                  key={d.id}
                  onClick={() => onOpenDeal(d.id)}
                  className={cn(
                    'h-11 border-b border-surface-800 cursor-pointer hover:bg-[var(--rowhover)]',
                    selecionados.has(d.id) && 'bg-accent-soft/30',
                    selectedDealId === d.id && 'shadow-[inset_2px_0_0_var(--color-brand-500)]',
                  )}
                  data-testid="deals-list-row"
                >
                  <td className="px-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Selecionar ${d.title}`} checked={selecionados.has(d.id)} onChange={() => alternar(d.id)} className="accent-[var(--color-brand-500)]" />
                  </td>
                  <td className="px-3 font-semibold text-surface-100 max-w-[240px] truncate">{d.title}</td>
                  <td className="px-3 text-surface-300 max-w-[200px] truncate">
                    {d.contact ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onOpenContact?.(d.contact!.id) }} className="hover:text-brand-400 truncate max-w-full">
                        {d.contact.displayName}
                      </button>
                    ) : '—'}
                  </td>
                  <td className="px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-surface-200">
                      <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: st?.color }} aria-hidden />
                      {st?.label ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 text-right tabular-nums text-surface-100">{brl(d.amountCents ?? 0)}</td>
                  <td className="px-3 text-right tabular-nums text-surface-400">{brl(dealProbability(d, st).weightedAmountCents)}</td>
                  <td className="px-3 tabular-nums text-surface-300">{prev}</td>
                  <td className={cn('px-3 whitespace-nowrap', parado !== null ? 'text-status-pending font-semibold' : 'text-surface-400')}>
                    {parado !== null ? `${parado} d parado` : (timeInStage(d) ?? '—')}
                  </td>
                  <td className="px-3 whitespace-nowrap text-surface-300">
                    {dono ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-[30%] avatar-operador flex items-center justify-center text-[9px] font-bold">{getInitials(fullName(dono))}</span>
                        {dono.firstName}
                      </span>
                    ) : <span className="text-surface-500">Sem dono</span>}
                  </td>
                  <td className="px-3 whitespace-nowrap text-surface-400">{originInfo(d).label}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-board-bar">
            <tr className="h-10 border-t border-surface-700 text-xs">
              <td />
              <td className="px-3 text-surface-400" colSpan={3}>{linhas.length} negócio{linhas.length === 1 ? '' : 's'}</td>
              <td className="px-3 text-right tabular-nums font-bold text-surface-100">{brl(total)}</td>
              <td className="px-3 text-right tabular-nums font-bold text-surface-300">{brl(ponderado)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
