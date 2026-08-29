import { useState, useEffect, useMemo } from 'react'
import { KanbanSquare, ChevronDown, ArrowRight } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { dealsApi } from '@/services/api'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { cn, getActivePipelines } from '@/lib/utils'
import { pipelineKindOption, pipelineKindOf, pipelineNoun } from '@/lib/pipelineKinds'
import type { Deal, Pipeline } from '@/types'

interface AddToPipelineMenuProps {
  contactId: string
  contactName: string
  /** Escolha de um funil onde o contato ainda não está. */
  onPick: (pipeline: Pipeline) => void
  /** Registros abertos já conhecidos pelo chamador — evita o fetch ao abrir. */
  openDeals?: Deal[] | null
  size?: 'sm' | 'md'
  className?: string
  align?: 'left' | 'right'
}

/**
 * "Adicionar ao funil ▾" (F9 · SCRUM-876, prancheta 3): lista os funis ativos
 * com o ícone do tipo; os funis em que o contato já tem registro aberto
 * aparecem desabilitados com "já está · <etapa>" (I1: um aberto por funil).
 * Os registros abertos vêm de `GET /deals?contactId=` ao abrir (uma chamada
 * por abertura, ou nenhuma quando o chamador já os passa). Só existe com o
 * flag de múltiplos funis — sem ele o componente não renderiza nada.
 */
export function AddToPipelineMenu({ contactId, contactName, onPick, openDeals: openDealsProp, size = 'md', className, align = 'right' }: AddToPipelineMenuProps) {
  const multiPipeline = useMultiPipeline()
  const { pipelines } = useCRMConfig()
  const [open, setOpen] = useState(false)
  // `fetched === null` enquanto aberto = carregando; fecha → descarta (próxima
  // abertura confere de novo — o contato pode ter entrado num funil por outra via).
  const [fetched, setFetched] = useState<Deal[] | null>(null)
  const close = () => { setOpen(false); setFetched(null) }

  useEffect(() => {
    if (!open || openDealsProp || !multiPipeline) return
    let cancelled = false
    dealsApi.list(contactId)
      .then((res) => { if (!cancelled) setFetched((Array.isArray(res.data) ? res.data : []).filter((d) => d.status === 'open')) })
      .catch(() => { if (!cancelled) setFetched([]) })
    return () => { cancelled = true }
  }, [open, openDealsProp, contactId, multiPipeline])

  const loading = open && !openDealsProp && fetched === null
  const openDeals = useMemo(() => openDealsProp ?? fetched ?? [], [openDealsProp, fetched])
  const rows = useMemo(() => getActivePipelines(pipelines).map((p) => {
    const existing = openDeals.find((d) => d.pipelineId === p.id && d.status === 'open') ?? null
    const stage = existing ? p.stages.find((s) => s.id === existing.stageId) ?? null : null
    return { pipeline: p, existing, stageLabel: stage?.label ?? null }
  }), [pipelines, openDeals])

  if (!multiPipeline || pipelines.length === 0) return null

  const firstName = contactName.split(' ')[0] || contactName

  return (
    <Dropdown
      open={open}
      onClose={close}
      align={align}
      className={cn('w-72', className)}
      anchor={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          data-testid="add-to-pipeline-trigger"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border font-medium transition-all whitespace-nowrap',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-xs',
            open ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-700 bg-surface-800 text-surface-200 hover:text-surface-50 hover:bg-surface-700',
          )}
        >
          <KanbanSquare className="w-3.5 h-3.5" />
          Adicionar ao funil
          <ChevronDown className={cn('w-3.5 h-3.5 opacity-80', open && 'rotate-180')} />
        </button>
      }
    >
      <div className="px-3 py-2 border-b border-surface-700 text-[10px] font-semibold text-surface-500 uppercase tracking-wide flex items-center gap-1.5">
        <KanbanSquare className="w-3 h-3" /> Adicionar {firstName} ao funil
      </div>
      <div className="py-1" role="menu">
        {rows.map(({ pipeline: p, existing, stageLabel }) => {
          const KindIcon = pipelineKindOption(pipelineKindOf(p)).icon
          const disabled = !!existing
          return (
            <button
              key={p.id}
              type="button"
              role="menuitem"
              disabled={disabled || loading}
              aria-disabled={disabled}
              data-testid={`add-to-pipeline-${p.id}`}
              onClick={() => { close(); onPick(p) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors',
                disabled ? 'text-surface-500 cursor-not-allowed' : 'text-surface-200 hover:bg-surface-700',
              )}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              <KindIcon className="w-3 h-3 flex-shrink-0 opacity-80" aria-label={pipelineKindOption(pipelineKindOf(p)).label} />
              <span className="flex-1 truncate">{p.name}</span>
              {disabled ? (
                <span className="text-[10px] whitespace-nowrap">já está{stageLabel ? ` · ${stageLabel}` : ''}</span>
              ) : (
                <ArrowRight className="w-3 h-3 text-surface-500 flex-shrink-0" />
              )}
            </button>
          )
        })}
        {loading && <p className="px-3 py-1.5 text-[11px] text-surface-500">Conferindo onde {firstName} já está…</p>}
      </div>
      <div className="px-3 py-2 border-t border-surface-700 text-[11px] text-surface-500 leading-relaxed">
        {(() => {
          const proc = rows.find((r) => !r.existing && pipelineKindOf(r.pipeline) === 'process')
          const first = proc ? proc.pipeline.stages.slice().sort((a, b) => a.order - b.order).find((s) => !s.isWon && !s.isLost) : null
          return proc
            ? <>Em <span className="text-surface-300">{proc.pipeline.name}</span> o {pipelineNoun(proc.pipeline)} nasce em <span className="text-surface-300">{first?.label ?? 'primeira etapa'}</span>{' '}ligado a esta origem.</>
            : <>Em funil de venda abre o formulário de negócio (valor opcional).</>
        })()}
      </div>
    </Dropdown>
  )
}
