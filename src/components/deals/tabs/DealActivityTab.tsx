// B2 (SCRUM-928) — aba "Atividade": `GET /deals/:id/history` com ator
// (humano/IA/automação/campanha) e motivo de fechamento. A leitura de
// `crm_judge_decisions` (B6/SCRUM-941) NÃO existe ainda — o espaço fica
// reservado (comentário abaixo), mas esta aba não espera por ela.
import { Loader2, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { movedByLabel } from '@/lib/contactPipelines'
import { formatRelativeTime } from '@/lib/utils'
import type { Deal, DealStageHistoryEntry, Pipeline } from '@/types'

interface DealActivityTabProps {
  deal: Deal
  pipeline: Pipeline
  history: DealStageHistoryEntry[] | 'loading' | 'error'
}

export function DealActivityTab({ deal, pipeline, history }: DealActivityTabProps) {
  const closeReasonLabel = deal.closeReason
    ? (pipeline.closeReasons?.find((r) => r.key === deal.closeReason)?.label ?? deal.closeReason)
    : null

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      {deal.status !== 'open' && (
        <div
          className="flex items-start gap-2 rounded-xl border px-3.5 py-3"
          style={deal.status === 'won'
            ? { borderColor: 'var(--color-status-active-border, #16a34a55)', backgroundColor: 'var(--color-status-active-bg, #16a34a14)' }
            : { borderColor: 'var(--color-surface-700)', backgroundColor: 'var(--color-surface-900)' }}
          data-testid="deal-close-reason"
        >
          {deal.status === 'won' ? <CheckCircle2 className="w-4 h-4 text-status-active flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-100">
              {deal.status === 'won' ? 'Ganho' : 'Perdido'}{closeReasonLabel ? ` · ${closeReasonLabel}` : ''}
            </p>
            {deal.closeNote && <p className="text-xs text-surface-400 mt-0.5">{deal.closeNote}</p>}
            {deal.closedAt && <p className="text-[11px] text-surface-500 mt-0.5">{formatRelativeTime(deal.closedAt)}</p>}
          </div>
        </div>
      )}

      {history === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-surface-500 py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando histórico…
        </div>
      )}
      {history === 'error' && (
        <p className="text-sm text-danger text-center py-6">Não foi possível carregar o histórico.</p>
      )}
      {Array.isArray(history) && (
        history.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-6">Sem passagens registradas.</p>
        ) : (
          <ol className="flex flex-col gap-3" data-testid="deal-history-list">
            {history.map((e) => (
              <li key={e.id} className="flex items-start gap-2.5 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-surface-600 flex-shrink-0 mt-1.5" aria-hidden />
                <div className="min-w-0">
                  <p className="text-surface-200 flex items-center gap-1 flex-wrap">
                    {e.fromStageLabel
                      ? <><span>{e.fromStageLabel}</span><ArrowRight className="w-3 h-3 text-surface-600" /></>
                      : <span className="text-surface-500">entrou em</span>}
                    <span className="font-medium text-surface-100">{e.toStageLabel ?? '?'}</span>
                  </p>
                  <p className="text-[11px] text-surface-500">
                    {movedByLabel({ lastMovedByKind: e.movedByKind, lastMovedByActorName: e.movedByActorName }) ?? 'sistema'}
                    {' · '}{formatRelativeTime(e.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )
      )}

      {/* B6/SCRUM-941 (ainda não implementada): decisões da IA sobre este
          negócio (crm_judge_decisions) entrariam aqui, intercaladas por data
          com as passagens acima. Espaço reservado — não bloqueia esta aba. */}
    </div>
  )
}
