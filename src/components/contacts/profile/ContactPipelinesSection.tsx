import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, KanbanSquare, CheckCircle2, XCircle, History, RotateCcw } from 'lucide-react'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { CloseDealReasonModal } from '@/components/deals/CloseDealReasonModal'
import { cn, formatRelativeTime } from '@/lib/utils'
import { pipelineKindOption, pipelineKindOf, terminalLabelsOf } from '@/lib/pipelineKinds'
import { originInfo, timeInStage } from '@/lib/dealCard'
import { stepperFor, movedByLabel, moveTargets, type StepperStep } from '@/lib/contactPipelines'
import type { Deal, Pipeline, PipelineStage } from '@/types'

interface Props {
  contactId: string
  contactName: string
  className?: string
}

/** Stepper horizontal: feitas preenchidas, atual com anel, a fazer apagadas; terminal com ícone. */
function Stepper({ steps, color }: { steps: StepperStep[]; color: string }) {
  return (
    <ol className="flex items-center gap-1 flex-wrap" aria-label="Etapas do funil" data-testid="pipeline-stepper">
      {steps.map((s, i) => {
        const done = s.state === 'done' || s.state === 'won' || s.state === 'lost'
        const current = s.state === 'current'
        return (
          <li key={s.id} className="flex items-center gap-1" title={s.label} aria-current={current ? 'step' : undefined}>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap',
                current ? 'ring-2 ring-offset-1 ring-offset-surface-900' : '',
                s.state === 'todo' && 'text-surface-500 border-surface-700',
              )}
              style={done || current
                ? { color: s.color, borderColor: `${s.color}55`, backgroundColor: `${s.color}${current ? '26' : '14'}`, ...(current ? { ['--tw-ring-color' as string]: `${color}66` } : {}) }
                : undefined}
              data-state={s.state}
            >
              {s.state === 'won' && <CheckCircle2 className="w-2.5 h-2.5" />}
              {s.state === 'lost' && <XCircle className="w-2.5 h-2.5" />}
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="w-2 h-px bg-surface-700" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * F11 (SCRUM-885/886, prancheta 7) — seção "Funis · N abertos" da ficha do
 * contato: um stepper por registro aberto (etapas, atual, quem moveu e quando,
 * origem) com "Mover ▾" e "Ver no board"; passagens fechadas numa linha
 * compacta com "ver histórico" (`GET /deals/:id/history`). A lista vem de
 * `GET /deals?contactId=` já enriquecida como o board (backend F11). Recarrega
 * no evento local `oryon:deals-invalidate` e no socket `deal:changed`.
 */
export function ContactPipelinesSection({ contactId, contactName, className }: Props) {
  const navigate = useNavigate()
  // Carga, tempo real, mover, fechar e histórico vêm do hook compartilhado —
  // o painel do contato nas conversas usa o mesmo. Aqui fica só a densidade
  // "card com stepper", que é a da ficha.
  const {
    enabled, deals, open, closed, error, busyId,
    closeTarget, setCloseTarget, history,
    pipelineOf, moveTo, closeWithReason, reopen, toggleHistory,
  } = useContactPipelines(contactId, contactName)
  const [moveOpenFor, setMoveOpenFor] = useState<string | null>(null)

  if (!enabled) return null

  const handleMove = (deal: Deal, stage: PipelineStage, pipeline: Pipeline) => {
    setMoveOpenFor(null)
    void moveTo(deal, stage, pipeline)
  }

  return (
    <section
      className={cn('rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden', className)}
      aria-label="Funis do contato"
      data-testid="contact-pipelines-section"
    >
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-surface-800">
        <h3 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
          <KanbanSquare className="w-4 h-4 text-surface-400" />
          Funis
          <span className="text-[11px] font-medium text-surface-400" data-testid="pipelines-open-count">
            · {deals === null ? '…' : `${open.length} ${open.length === 1 ? 'aberto' : 'abertos'}`}
          </span>
        </h3>
      </header>

      <div className="flex flex-col divide-y divide-surface-800">
        {error && <p className="px-4 py-3 text-xs text-danger" role="alert">{error}</p>}
        {deals !== null && open.length === 0 && !error && (
          <p className="px-4 py-3 text-xs text-surface-500">Nenhum registro aberto. Use "Adicionar ao funil" no cabeçalho.</p>
        )}

        {open.map((deal) => {
          const pipeline = pipelineOf(deal)
          if (!pipeline) return null
          const kind = pipelineKindOption(pipelineKindOf(pipeline))
          const KindIcon = kind.icon
          const stage = pipeline.stages.find((s) => s.id === deal.stageId)
          const steps = stepperFor(pipeline, deal)
          const targets = moveTargets(pipeline, deal.stageId)
          const labels = terminalLabelsOf(pipeline)
          const time = timeInStage(deal)
          const who = movedByLabel(deal)
          const origin = originInfo(deal)
          return (
            <article key={deal.id} className="px-4 py-3 flex flex-col gap-2" data-testid={`pipeline-open-${pipeline.id}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />
                <span className="text-sm font-medium text-surface-100 truncate">{pipeline.name}</span>
                <KindIcon className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" aria-label={kind.label} />
                {stage && <span className="ml-auto text-[11px] text-surface-300 whitespace-nowrap">{stage.label}</span>}
              </div>
              <Stepper steps={steps} color={pipeline.color} />
              <p className="text-[11px] text-surface-500 truncate" data-testid="pipeline-meta">
                {[time, who ? `movido por ${who}` : null, `origem ${origin.label}`].filter(Boolean).join(' · ')}
              </p>
              <div className="flex items-center gap-1.5">
                <Dropdown
                  open={moveOpenFor === deal.id}
                  onClose={() => setMoveOpenFor(null)}
                  align="left"
                  className="w-56"
                  anchor={
                    <button
                      type="button"
                      onClick={() => setMoveOpenFor((v) => (v === deal.id ? null : deal.id))}
                      disabled={busyId === deal.id}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-200 hover:bg-surface-700 disabled:opacity-50 transition-colors"
                      data-testid={`pipeline-move-${pipeline.id}`}
                      aria-haspopup="menu"
                      aria-expanded={moveOpenFor === deal.id}
                    >
                      Mover <ChevronDown className="w-3 h-3" />
                    </button>
                  }
                >
                  <div className="px-1 py-1 flex flex-col gap-0.5">
                    {targets.normal.map((s) => (
                      <DropdownItem key={s.id} onClick={() => handleMove(deal, s, pipeline)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </DropdownItem>
                    ))}
                    {targets.normal.length > 0 && targets.terminal.length > 0 && <DropdownSeparator />}
                    {targets.terminal.map((s) => (
                      <DropdownItem key={s.id} onClick={() => handleMove(deal, s, pipeline)} danger={s.isLost}>
                        {s.isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {s.isWon ? labels.won : labels.lost} (com motivo)
                      </DropdownItem>
                    ))}
                  </div>
                </Dropdown>
                <button
                  type="button"
                  onClick={() => navigate(`/contacts?pipeline=${pipeline.id}`)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                  data-testid={`pipeline-board-${pipeline.id}`}
                >
                  <KanbanSquare className="w-3.5 h-3.5" /> Ver no board
                </button>
              </div>
            </article>
          )
        })}

        {closed.length > 0 && (
          <div className="px-4 py-2 flex flex-col gap-1" data-testid="pipelines-closed">
            {closed.map((deal) => {
              const pipeline = pipelineOf(deal)
              const stage = pipeline?.stages.find((s) => s.id === deal.stageId)
              const won = deal.status === 'won'
              const reasonLabel = pipeline?.closeReasons?.find((r) => r.key === deal.closeReason)?.label ?? deal.closeReason ?? null
              const h = history[deal.id]
              return (
                <div key={deal.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-surface-400 min-w-0">
                    {won ? <CheckCircle2 className="w-3 h-3 text-status-active flex-shrink-0" /> : <XCircle className="w-3 h-3 text-surface-500 flex-shrink-0" />}
                    <span className="truncate">
                      <span className="text-surface-300">{pipeline?.name ?? 'Funil'}</span> · {stage?.label ?? (won ? 'Ganho' : 'Perdido')}
                      {deal.closedAt && <> · {formatRelativeTime(deal.closedAt)}</>}
                      {reasonLabel && <> · {reasonLabel}</>}
                    </span>
                    {/* A4 (SCRUM-926): reabrir mora aqui — era o seletor de
                        Status do DealModal, que saiu com o fechamento virando
                        ação própria. Depois dos 5 s do "Desfazer", é esta a saída. */}
                    <button
                      type="button"
                      onClick={() => void reopen(deal)}
                      disabled={busyId === deal.id}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] text-surface-300 hover:text-surface-100 disabled:opacity-50 whitespace-nowrap"
                      data-testid={`pipeline-reopen-${deal.id}`}
                    >
                      <RotateCcw className="w-3 h-3" /> Reabrir
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleHistory(deal.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200 whitespace-nowrap"
                      data-testid={`pipeline-history-${deal.id}`}
                    >
                      <History className="w-3 h-3" /> {h && h !== 'loading' ? 'ocultar' : 'ver histórico'}
                    </button>
                  </div>
                  {h === 'loading' && <p className="text-[11px] text-surface-600 pl-4">Carregando…</p>}
                  {Array.isArray(h) && (
                    <ol className="pl-4 flex flex-col gap-0.5" data-testid={`pipeline-history-list-${deal.id}`}>
                      {h.length === 0 && <li className="text-[11px] text-surface-600">Sem passagens registradas.</li>}
                      {h.map((e) => (
                        <li key={e.id} className="text-[11px] text-surface-500">
                          {e.fromStageLabel ? `${e.fromStageLabel} → ` : 'entrou em '}<span className="text-surface-300">{e.toStageLabel ?? '?'}</span>
                          {' · '}{movedByLabel({ lastMovedByKind: e.movedByKind, lastMovedByActorName: e.movedByActorName }) ?? 'sistema'}
                          {' · '}{formatRelativeTime(e.createdAt)}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CloseDealReasonModal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        deal={closeTarget?.deal ?? null}
        stage={closeTarget?.stage ?? null}
        pipeline={closeTarget?.pipeline ?? null}
        onConfirm={closeWithReason}
      />
    </section>
  )
}
