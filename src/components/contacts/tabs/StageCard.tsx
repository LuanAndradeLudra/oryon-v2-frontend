import { useState } from 'react'
import { KanbanSquare, ChevronLeft, ChevronRight, Flag, Loader2 } from 'lucide-react'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { contactsApi } from '@/services/api'
import { hexToRgba, cn } from '@/lib/utils'
import { MoveStageModal } from '../MoveStageModal'
import type { Contact } from '@/types'

interface StageCardProps {
  contact: Contact
  /** Parent updates the loaded Contact so the badge + timeline re-render
   *  without a full refetch after the operator moves the contact. */
  onStageChanged?: (next: string) => void
}

/**
 * Detailed stage view + manager for the CRM contact panel. Surfaces:
 *   - the current stage as a large colored panel,
 *   - the position within the full funnel (e.g. "3 de 7"),
 *   - a horizontal mini-timeline of every stage with the current one
 *     highlighted (helps the operator picture where the lead is),
 *   - quick "previous / next" buttons for the adjacent stages,
 *   - a primary "Mover para outro estágio" CTA that opens the mini-kanban
 *     modal (same component used in the conversations panel).
 *
 * If the tenant has no stages configured yet, we show a clear CTA explaining
 * where to set them up — the operator shouldn't see a dead card.
 */
export function StageCard({ contact, onStageChanged }: StageCardProps) {
  const { stages, loadingStages } = useCRMConfig()
  const [modalOpen, setModalOpen] = useState(false)
  const [quickMovePending, setQuickMovePending] = useState<string | null>(null)

  const currentIndex = stages.findIndex((s) => s.key === contact.stage)
  const current = currentIndex >= 0 ? stages[currentIndex] : null
  const previous = currentIndex > 0 ? stages[currentIndex - 1] : null
  const next = currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null

  const isFirst = currentIndex === 0
  const isTerminal = current?.isTerminal === true

  const quickMove = async (stageKey: string) => {
    if (quickMovePending) return
    setQuickMovePending(stageKey)
    try {
      await contactsApi.bulkUpdateStage([contact.id], stageKey)
      onStageChanged?.(stageKey)
    } catch (err) {
      console.error('[StageCard] quick-move failed', err)
    } finally {
      setQuickMovePending(null)
    }
  }

  return (
    <>
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 flex flex-col gap-4">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KanbanSquare className="w-4 h-4 text-surface-500" />
            <h3 className="text-sm font-semibold text-surface-100">Estágio no funil</h3>
            {stages.length > 0 && currentIndex >= 0 && (
              <span className="text-[11px] text-surface-500">
                {currentIndex + 1} de {stages.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={stages.length === 0}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors',
              stages.length === 0
                ? 'text-surface-600 cursor-not-allowed'
                : 'text-brand-400 hover:text-brand-300 hover:bg-brand-500/10',
            )}
          >
            <KanbanSquare className="w-3.5 h-3.5" />
            Mover
          </button>
        </div>

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {loadingStages ? (
          <div className="flex items-center gap-2 text-xs text-surface-500 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando estágios…
          </div>
        ) : stages.length === 0 ? (
          <p className="text-xs text-surface-500 italic">
            Nenhum estágio configurado. Crie estágios em Configurações → CRM
            para começar a posicionar contatos no funil.
          </p>
        ) : !current ? (
          /* Contact has no stage — likely a new lead. Make the empty state
             actionable instead of just "—". */
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-surface-700 bg-surface-800/40 p-4">
            <p className="text-xs text-surface-400">
              Este contato ainda não está em nenhum estágio do funil.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200 bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Flag className="w-3 h-3" />
              Definir estágio inicial
            </button>
          </div>
        ) : (
          <>
            {/* ── Current stage spotlight ─────────────────────────────── */}
            <div
              className="rounded-xl border p-4 flex items-start gap-3"
              style={{
                backgroundColor: hexToRgba(current.color, 0.08),
                borderColor: hexToRgba(current.color, 0.35),
              }}
            >
              <div
                className="w-2 self-stretch rounded-full flex-shrink-0"
                style={{ backgroundColor: current.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className="text-sm font-semibold leading-tight"
                    style={{ color: current.color }}
                  >
                    {current.label}
                  </p>
                  {isTerminal && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-800 text-surface-400 border border-surface-700">
                      <Flag className="w-2.5 h-2.5" />
                      Estágio final
                    </span>
                  )}
                  {isFirst && !isTerminal && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-800 text-surface-400 border border-surface-700">
                      Início do funil
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-surface-400 mt-1.5 leading-relaxed">
                  Posição <strong className="text-surface-200">{currentIndex + 1}</strong> de{' '}
                  <strong className="text-surface-200">{stages.length}</strong> no funil.
                  {isTerminal && ' Este é um estágio terminal — contatos aqui não devem avançar.'}
                </p>
              </div>
            </div>

            {/* ── Mini horizontal timeline ────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold">
                Funil
              </p>
              <div
                className="flex gap-1 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'thin' }}
              >
                {stages.map((s, idx) => {
                  const isCurr = idx === currentIndex
                  const passed = idx < currentIndex
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => !isCurr && quickMove(s.key)}
                      disabled={isCurr || !!quickMovePending}
                      title={s.label}
                      className={cn(
                        'flex-shrink-0 min-w-0 flex flex-col items-stretch gap-1 transition-all rounded-md',
                        !isCurr && !quickMovePending && 'hover:opacity-100 cursor-pointer',
                        isCurr ? 'cursor-default' : 'opacity-70 hover:opacity-100',
                      )}
                    >
                      <div
                        className={cn('h-1.5 rounded-full transition-all', isCurr && 'h-2')}
                        style={{
                          backgroundColor: isCurr || passed ? s.color : hexToRgba(s.color, 0.25),
                          width: '32px',
                        }}
                      />
                      <span
                        className={cn(
                          'text-[9px] truncate px-0.5',
                          isCurr ? 'font-semibold' : 'text-surface-500',
                        )}
                        style={isCurr ? { color: s.color, maxWidth: '60px' } : { maxWidth: '60px' }}
                      >
                        {s.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Quick adjacent navigation ───────────────────────────── */}
            {(previous || next) && (
              <div className="flex items-center gap-2 pt-1 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => previous && quickMove(previous.key)}
                  disabled={!previous || !!quickMovePending}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors',
                    !previous
                      ? 'text-surface-600 cursor-not-allowed bg-surface-800/30'
                      : 'text-surface-300 bg-surface-800 hover:bg-surface-700',
                  )}
                  title={previous ? `Voltar para ${previous.label}` : 'Já está no início do funil'}
                >
                  {quickMovePending === previous?.key ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChevronLeft className="w-3 h-3" />
                  )}
                  <span className="truncate">
                    {previous ? previous.label : 'Início'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => next && quickMove(next.key)}
                  disabled={!next || !!quickMovePending}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors',
                    !next
                      ? 'text-surface-600 cursor-not-allowed bg-surface-800/30'
                      : 'text-surface-300 bg-surface-800 hover:bg-surface-700',
                  )}
                  title={next ? `Avançar para ${next.label}` : 'Já está no fim do funil'}
                >
                  <span className="truncate">
                    {next ? next.label : 'Fim'}
                  </span>
                  {quickMovePending === next?.key ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <MoveStageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contactId={contact.id}
        contactName={contact.displayName}
        currentStage={contact.stage}
        onStageChanged={(next) => onStageChanged?.(next)}
      />
    </>
  )
}
