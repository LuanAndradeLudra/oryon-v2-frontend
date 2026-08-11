import type { ReactNode } from 'react'
import { AlertTriangle, ShieldCheck, Quote, Clock, Tag, Wrench, XCircle, Hash } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'
// O motivo do bloqueio vem TODO daqui. Antes este arquivo tinha a sua própria
// cópia do claimLabel e o seu próprio mapa de outcome, nenhum deles com os
// casos `vg_*` — então o selo na bolha dizia "citou um nome" e este modal, um
// clique depois, dizia "afirmou ter concluído a ação". Era a mesma contradição
// que o SCRUM-515 existia para remover, sobrevivendo justamente onde o operador
// vai buscar o detalhe.
import { guardCheckGuidance, guardOutcomeDetail, guardTypeLabel } from '@/lib/guardReason'

type Anomaly = NonNullable<Message['anomaly']>

/** Map the required-skill slug to a friendly operation name. */
function skillLabel(slug: string | null | undefined): string | null {
  if (!slug) return null
  switch (slug) {
    case 'marcar_consulta':   return 'Agendar consulta'
    case 'cancela_consulta':  return 'Cancelar consulta'
    case 'confirma_consulta': return 'Confirmar consulta'
    default:                  return slug
  }
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function Detail({ icon: Icon, label, children }: { icon: typeof Quote; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-surface-500 font-medium">{label}</p>
        <div className="text-sm text-surface-200 break-words">{children}</div>
      </div>
    </div>
  )
}

/**
 * Detail modal opened from the phantom-confirmation flag on a chat bubble.
 * Explains what the anti-claim guard caught on that specific AI turn — what was
 * claimed, which operation should have run, and any skill failures — so the
 * operator can decide whether to act (handoff) or just note it (corrected).
 */
export function AnomalyDetailModal({
  open,
  onClose,
  anomaly,
}: {
  open: boolean
  onClose: () => void
  anomaly: Anomaly | null
}) {
  const isHandoff = anomaly?.kind === 'handoff'
  const when = formatWhen(anomaly?.occurredAt)
  const expectedOp = skillLabel(anomaly?.requiredSkill)
  const failures = anomaly?.skillFailures ?? []

  return (
    <Modal open={open} onClose={onClose} title="Detalhes da verificação">
      {anomaly && (
        <div className="space-y-4">
          {/* Status banner */}
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-lg px-3 py-2.5 border',
              isHandoff ? 'bg-amber-500/10 border-amber-500/30' : 'bg-surface-800/60 border-surface-700',
            )}
          >
            {isHandoff ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-surface-300 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={cn('text-sm font-medium', isHandoff ? 'text-amber-200' : 'text-surface-200')}>
                {isHandoff ? 'Transferido para atendente' : 'Corrigido automaticamente'}
              </p>
              <p className="text-xs text-surface-400 mt-0.5">{guardOutcomeDetail(anomaly.outcome, anomaly.claimType)}</p>
            </div>
          </div>

          {/* Skill failures — the technical "why" when a tool was called and failed */}
          {failures.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-surface-500 font-medium flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400" /> Falha no retorno da skill
              </p>
              {failures.map((f, i) => (
                <div key={i} className="rounded-lg bg-red-500/10 border border-red-500/25 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-red-200 truncate">{f.name}</span>
                    {f.statusCode != null && (
                      <span className="text-[10px] font-mono text-red-300/80 flex-shrink-0">HTTP {f.statusCode}</span>
                    )}
                  </div>
                  {f.message && <p className="text-xs text-surface-300 mt-1 break-words">{f.message}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Actionable guidance (handoff only) */}
          {isHandoff && (
            <div className="rounded-lg bg-surface-800/40 px-3 py-2.5">
              <p className="text-xs font-medium text-surface-200 mb-1">O que verificar</p>
              <p className="text-xs text-surface-400">
                {guardCheckGuidance(anomaly.outcome, anomaly.claimType)}
              </p>
            </div>
          )}

          {/* Structured details */}
          {expectedOp && (
            <Detail icon={Wrench} label="Operação esperada">
              {expectedOp}{anomaly.requiredSkill ? <span className="text-surface-500"> ({anomaly.requiredSkill})</span> : null}
            </Detail>
          )}

          {anomaly.matchedText && (
            <Detail icon={Quote} label="Trecho detectado">
              <span className="italic">“{anomaly.matchedText}”</span>
            </Detail>
          )}

          {/* "Tipo de ação" era o rótulo de quando só existia o anti-claim.
              Com o gateway o bloqueio pode ser de preço, horário ou nome — que
              não são ações. */}
          <Detail icon={Tag} label="Tipo">
            {guardTypeLabel(anomaly.outcome, anomaly.claimType)}
          </Detail>

          {when && (
            <Detail icon={Clock} label="Quando">
              {when}
            </Detail>
          )}

          {anomaly.correlationId && (
            <Detail icon={Hash} label="Referência (logs)">
              <span className="font-mono text-xs break-all">{anomaly.correlationId}</span>
            </Detail>
          )}

          {anomaly.outcome && (
            <p className="text-[10px] text-surface-600">código técnico: {anomaly.outcome}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
