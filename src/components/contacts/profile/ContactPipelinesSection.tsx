import { KanbanSquare, Handshake } from 'lucide-react'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { DealSummary, useDealSummaryMove } from '@/components/deals/DealSummary'
import { CloseDealReasonModal } from '@/components/deals/CloseDealReasonModal'
import { Button } from '@/components/ui/Button'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { cn } from '@/lib/utils'
import { defaultSalesPipeline } from '@/lib/pipelineKinds'
import type { Deal, Pipeline, PipelineStage } from '@/types'

interface Props {
  contactId: string
  contactName: string
  className?: string
}

/**
 * F11 (SCRUM-885/886, prancheta 7) — seção "Funis · N abertos" da ficha do
 * contato: densidade `card` do `DealSummary` compartilhado (B3 · SCRUM-929),
 * SEM editar/excluir — isso continua exclusivo do `DealModal` (aba Negócios).
 * Passagens fechadas numa linha compacta com "ver histórico"
 * (`GET /deals/:id/history`). A lista vem de `GET /deals?contactId=` já
 * enriquecida como o board (backend F11). Recarrega no evento local
 * `oryon:deals-invalidate` e no socket `deal:changed`.
 */
export function ContactPipelinesSection({ contactId, contactName, className }: Props) {
  const { openDeal } = useDealPanel()
  // Carga, tempo real, mover, fechar e histórico vêm do hook compartilhado —
  // o painel do contato nas conversas usa o mesmo. Aqui fica só a densidade
  // "card com stepper", que é a da ficha.
  const {
    enabled, deals, open, closed, error, busyId, pipelines,
    closeTarget, setCloseTarget, history,
    pipelineOf, moveTo, closeWithReason, reopen, toggleHistory, reload,
  } = useContactPipelines(contactId, contactName)
  const moveState = useDealSummaryMove()
  const { vocab } = useTenantVocab()
  // A3 (SCRUM-925): o estado vazio ganha AÇÃO, não só um texto mandando o
  // operador procurar o botão no cabeçalho. Passa pelo mesmo fluxo do
  // "Adicionar ao funil" — inclusive o conflito I1 —, então não recria a
  // "segunda porta errada" que a SCRUM-920 tirou do painel.
  const addToPipeline = useAddToPipeline({ onCreated: () => reload() })
  const salesPipeline = defaultSalesPipeline(pipelines)

  if (!enabled) return null

  const handleMove = (deal: Deal, stage: PipelineStage, pipeline: Pipeline) => {
    moveState.close()
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
          <div className="px-4 py-3 flex flex-wrap items-center gap-3">
            <p className="text-xs text-surface-500">Nenhum registro aberto.</p>
            {salesPipeline && (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Handshake className="w-3.5 h-3.5" />}
                onClick={() => addToPipeline.requestAdd({ contactId, contactName, pipeline: salesPipeline })}
              >
                Novo {vocab.deal.toLowerCase()}
              </Button>
            )}
          </div>
        )}

        {open.map((deal) => {
          const pipeline = pipelineOf(deal)
          if (!pipeline) return null
          return (
            <DealSummary
              key={deal.id}
              density="card"
              deal={deal}
              pipeline={pipeline}
              contactName={contactName}
              busy={busyId === deal.id}
              moveOpen={moveState.isOpen(deal.id)}
              onToggleMove={() => moveState.toggle(deal.id)}
              onMove={(stage) => handleMove(deal, stage, pipeline)}
              onOpen={() => openDeal(deal.id)}
              testIdPrefix="pipeline"
              testIdKey={pipeline.id}
            />
          )
        })}

        {closed.length > 0 && (
          <div className="px-4 py-2 flex flex-col gap-1" data-testid="pipelines-closed">
            {closed.map((deal) => (
              <DealSummary
                key={deal.id}
                density="card"
                closed
                deal={deal}
                pipeline={pipelineOf(deal)}
                busy={busyId === deal.id}
                onReopen={() => void reopen(deal)}
                history={history[deal.id]}
                onToggleHistory={() => void toggleHistory(deal.id)}
                testIdPrefix="pipeline"
                testIdKey={deal.id}
              />
            ))}
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
      {addToPipeline.dialogs}
    </section>
  )
}
