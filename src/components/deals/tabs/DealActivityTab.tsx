// B2 (SCRUM-928) — aba "Atividade": `GET /deals/:id/history` com ator
// (humano/IA/automação/campanha) e motivo de fechamento, mais as decisões
// do CRM Judge sobre este negócio (B6/SCRUM-941, `crm_judge_decisions`,
// incluindo o que ele decidiu NÃO fazer — "IA visível e simétrica").
import { useEffect, useState } from 'react'
import { Loader2, ArrowRight, CheckCircle2, XCircle, Gavel } from 'lucide-react'
import { movedByLabel } from '@/lib/contactPipelines'
import { cn, formatRelativeTime } from '@/lib/utils'
import { terminalLabelsOf } from '@/lib/pipelineKinds'
import { fetchJudgeDecisions, type JudgeDecision } from '@/services/agentActivityApi'
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
  const terminalLabels = terminalLabelsOf(pipeline)

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
              {deal.status === 'won' ? terminalLabels.won : terminalLabels.lost}{closeReasonLabel ? ` · ${closeReasonLabel}` : ''}
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

      <JudgeDecisionsSection conversationId={deal.originConversationId ?? null} />
    </div>
  )
}

const JUDGE_ACTION_LABELS: Record<string, string> = {
  apply_tag: 'Aplicar etiqueta',
  set_status: 'Mudar status da conversa',
  update_contact: 'Atualizar contato',
  move_pipeline: 'Mover fase do contato',
  assign_to_user: 'Atribuir a atendente',
  move_deal_stage: 'Mover etapa do registro-alvo',
  close_deal: 'Fechar registro',
  enter_pipeline: 'Colocar em outro funil',
  move_deal: 'Mover registro',
  no_action: 'Nenhuma ação',
}

const JUDGE_SKIP_REASON_LABELS: Record<string, string> = {
  already_done_recently: 'já feito recentemente',
  close_not_allowed: 'fechamento não permitido para este agente',
  enter_not_allowed: 'entrar em funil não permitido para este agente',
  low_confidence: 'confiança baixa',
  no_action: 'nenhuma ação a fazer',
  pipeline_not_allowed: 'funil fora da allowlist do agente',
  exec_failed: 'falha ao executar',
  shadow_mode: 'modo sombra (não executa)',
  already_in_crm_state: 'já estava neste estado',
  stage_not_available: 'etapa não disponível para a IA',
  no_target: 'sem registro-alvo nesta conversa',
  already_done_by_agent_a: 'já feito pelo agente conversacional neste turno',
}

/**
 * B6 (SCRUM-941) — decisões do CRM Judge sobre a conversa de origem deste
 * negócio, incluindo o que ele decidiu NÃO fazer (skip_reason). Fetch
 * próprio (mount-time, sem realtime v1) — mesmo padrão de AgentActivitySection.
 * `deal.originConversationId` é o escopo hoje disponível; um negócio tocado
 * pelo Judge em MAIS de uma conversa só mostra a de origem (limitação
 * conhecida — a rota do agent-server é por conversa, não por negócio).
 */
function JudgeDecisionsSection({ conversationId }: { conversationId: string | null }) {
  const [decisions, setDecisions] = useState<JudgeDecision[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conversationId) { setDecisions([]); return }
    let alive = true
    setDecisions(null)
    setError(null)
    fetchJudgeDecisions(conversationId)
      .then((rows) => { if (alive) setDecisions(rows) })
      .catch((err) => { if (alive) setError(err instanceof Error ? err.message : 'Erro ao carregar') })
    return () => { alive = false }
  }, [conversationId])

  if (!conversationId || (decisions !== null && decisions.length === 0 && !error)) return null

  return (
    <div className="border-t border-surface-800 pt-4">
      <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold flex items-center gap-1.5 mb-2">
        <Gavel className="w-3 h-3" />
        Decisões do CRM Judge
      </p>
      {decisions === null && !error && (
        <div className="flex items-center gap-2 text-xs text-surface-500 py-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando decisões da IA…
        </div>
      )}
      {error && <p className="text-xs text-status-error-400">{error}</p>}
      {decisions && decisions.length > 0 && (
        <ul className="space-y-2">
          {decisions.map((d) => (
            <li key={d.id} className={cn(
              'flex items-start gap-2.5 px-2 py-1.5 rounded-md',
              d.executed ? 'bg-surface-900/40' : 'bg-surface-900/20',
            )}>
              <span className={cn(
                'mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0',
                d.executed ? 'bg-surface-800 text-brand-300' : 'bg-surface-800 text-surface-500',
              )}>
                <Gavel className="w-3 h-3" />
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs leading-snug', d.executed ? 'text-surface-200' : 'text-surface-500')}>
                  {d.type ? (JUDGE_ACTION_LABELS[d.type] ?? d.type) : 'Decisão'}
                  {d.rationale ? ` — ${d.rationale}` : ''}
                </p>
                <p className="text-[10px] text-surface-500 mt-0.5">
                  {formatRelativeTime(d.createdAt)}
                  {d.executed
                    ? ' · executado'
                    : ` · não executado${d.skipReason ? ` (${JUDGE_SKIP_REASON_LABELS[d.skipReason] ?? d.skipReason})` : ''}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
