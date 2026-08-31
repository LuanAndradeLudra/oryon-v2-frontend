import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { AlertTriangle, ShieldCheck, Quote, Clock, Tag, Wrench, XCircle, Hash, MessageSquareOff, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { conversationsApi } from '@/services/api'
import type { Message } from '@/types'
// O motivo do bloqueio vem TODO daqui. Antes este arquivo tinha a sua própria
// cópia do claimLabel e o seu próprio mapa de outcome, nenhum deles com os
// casos `vg_*` — então o selo na bolha dizia "citou um nome" e este modal, um
// clique depois, dizia "afirmou ter concluído a ação". Era a mesma contradição
// que o SCRUM-515 existia para remover, sobrevivendo justamente onde o operador
// vai buscar o detalhe.
import { guardCheckGuidance, guardOutcomeDetail, guardTypeLabel, findingReasonLabel } from '@/lib/guardReason'

type Anomaly = NonNullable<Message['anomaly']>
type AnomalyFinding = NonNullable<Anomaly['findings']>[number]

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

/** Cabeçalho de bloco — uma linha, ícone + rótulo em caixa alta. */
function BlockTitle({ icon: Icon, children, tone = 'default' }: {
  icon: typeof Quote; children: ReactNode; tone?: 'default' | 'warn' | 'ok'
}) {
  return (
    <p className="text-[11px] uppercase tracking-wide text-surface-500 font-medium flex items-center gap-1.5 mb-2">
      <Icon className={cn('w-3.5 h-3.5',
        tone === 'warn' ? 'text-amber-400' : tone === 'ok' ? 'text-emerald-400' : 'text-surface-500')} />
      {children}
    </p>
  )
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
 * A mensagem retida com os trechos sem lastro MARCADOS pelos spans do sinal
 * v2. Os spans já chegam validados contra o texto (backend revalida no write e
 * no read), mas a renderização ainda se defende: ordena, funde sobreposição e
 * descarta qualquer par fora do texto — degradar para texto sem marcação é
 * sempre melhor que marcar o trecho errado. Texto puro, nunca HTML: isto é
 * saída de modelo.
 */
function renderHighlighted(text: string, findings: AnomalyFinding[]): ReactNode {
  const spans = findings
    .map((f) => f.span)
    .filter((s): s is [number, number] =>
      Array.isArray(s) && s.length === 2
      && Number.isInteger(s[0]) && Number.isInteger(s[1])
      && s[0] >= 0 && s[1] > s[0] && s[1] <= text.length)
    .sort((a, b) => a[0] - b[0])

  const merged: Array<{ start: number; end: number }> = []
  for (const [start, end] of spans) {
    const last = merged[merged.length - 1]
    if (last && start <= last.end) last.end = Math.max(last.end, end)
    else merged.push({ start, end })
  }
  if (merged.length === 0) return text

  const out: ReactNode[] = []
  let pos = 0
  merged.forEach(({ start, end }, i) => {
    if (start > pos) out.push(text.slice(pos, start))
    out.push(
      <mark key={i} className="bg-amber-500/25 text-amber-100 rounded-sm px-0.5 border-b-2 border-amber-500/70">
        {text.slice(start, end)}
      </mark>,
    )
    pos = end
  })
  if (pos < text.length) out.push(text.slice(pos))
  return out
}

/**
 * Detail modal opened from the phantom-confirmation flag on a chat bubble.
 * Explains what the gateway caught on that specific AI turn — the message it
 * withheld and which facts had no grounding, so ele julga o bloqueio sem
 * reconstruir a conversa.
 *
 * LAYOUT: duas colunas quando o sinal v2 está presente, uma coluna quando não
 * está. `fillHeight` + scroll POR PAINEL em vez de scroll do modal inteiro: a
 * mensagem retida pode ser longa, e rolar o modal todo tirava de vista os
 * trechos sinalizados e a orientação.
 *
 * O bloco "o que o sistema sabia" (evidência do lastro) foi removido a pedido
 * — poluía mais do que ajudava. Os campos continuam chegando no sinal e
 * persistidos em activity_logs; reexibi-los é só voltar a lê-los.
 *
 * SCRUM-806 — rodapé "Marcar como verificada" (só para handoff e quando o
 * chamador informa `conversationId`): reconhece a verificação pendente da
 * CONVERSA depois de tratado o caso. A resolução é relativa à anomalia mais
 * recente — uma nova anomalia volta a sinalizar. O badge da lista e a
 * contagem do cabeçalho limpam via socket (ai-pause-updated com
 * hasRecentAnomaly:false); nenhum refetch manual aqui. O marcador desta bolha
 * permanece: ele é histórico da mensagem, não estado da conversa.
 */
export function AnomalyDetailModal({
  open,
  onClose,
  anomaly,
  conversationId,
  onResolved,
}: {
  open: boolean
  onClose: () => void
  anomaly: Anomaly | null
  /** Habilita o rodapé "Marcar como verificada" (SCRUM-806). */
  conversationId?: string | null
  onResolved?: () => void
}) {
  const isHandoff = anomaly?.kind === 'handoff'
  const when = formatWhen(anomaly?.occurredAt)
  const expectedOp = skillLabel(anomaly?.requiredSkill)
  const failures = anomaly?.skillFailures ?? []
  const findings = anomaly?.findings ?? []
  // Marcador anterior ao sinal v2 não tem a mensagem retida — sem ela não há
  // o que colocar na coluna da esquerda, e o modal volta ao formato estreito.
  const hasV2 = Boolean(anomaly?.blockedText)

  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  // Erro de uma abertura anterior não pertence à próxima.
  useEffect(() => { if (open) setResolveError(null) }, [open])

  const handleResolve = async () => {
    if (!conversationId || resolving) return
    setResolving(true)
    setResolveError(null)
    try {
      await conversationsApi.resolveReview(conversationId)
      onResolved?.()
      onClose()
    } catch {
      setResolveError('Não foi possível marcar como verificada. Tente novamente.')
    } finally {
      setResolving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalhes da verificação"
      fillHeight={hasV2}
      className={hasV2 ? 'max-w-3xl h-[85vh]' : 'max-w-lg'}
      footer={isHandoff && conversationId ? (
        <div className="flex items-center justify-end gap-3">
          {resolveError && <p className="text-xs text-red-400 mr-auto">{resolveError}</p>}
          <button
            type="button"
            onClick={handleResolve}
            disabled={resolving}
            style={{ ['--chip']: 'var(--color-brand-600)' } as CSSProperties}
            className="color-chip inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border hover:brightness-110 disabled:opacity-60 transition"
          >
            {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {resolving ? 'Marcando…' : 'Marcar como verificada'}
          </button>
        </div>
      ) : undefined}
    >
      {anomaly && (
        <div className={cn('flex flex-col gap-4', hasV2 && 'h-full min-h-0')}>
          {/* Banner — largura total, sempre no topo */}
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-lg px-3 py-2.5 border flex-shrink-0',
              isHandoff ? 'bg-amber-500/10 border-amber-500/30' : 'bg-surface-800/60 border-surface-700',
            )}
          >
            {isHandoff ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-surface-300 flex-shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', isHandoff ? 'text-amber-200' : 'text-surface-200')}>
                {isHandoff ? 'Transferido para atendente' : 'Corrigido automaticamente'}
              </p>
              <p className="text-xs text-surface-400 mt-0.5">{guardOutcomeDetail(anomaly.outcome, anomaly.claimType)}</p>
              {isHandoff && (anomaly.repair?.llmCalls ?? 0) > 0 && (
                <p className="text-[11px] text-surface-500 mt-1">
                  A IA tentou se corrigir {anomaly.repair!.llmCalls}× antes da transferência, sem sucesso.
                </p>
              )}
            </div>
          </div>

          <div className={cn(
            hasV2
              ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 flex-1 min-h-0'
              : 'flex flex-col gap-4',
          )}>
            {/* ── Coluna esquerda: a mensagem retida ──────────────────── */}
            {hasV2 && (
              <div className="flex flex-col min-h-0 gap-2">
                <BlockTitle icon={MessageSquareOff} tone="warn">
                  Mensagem retida (não enviada ao cliente)
                </BlockTitle>
                <div className="flex-1 min-h-0 overflow-y-auto rounded-lg bg-surface-800/60 border border-surface-700 px-3 py-2.5">
                  <p className="text-sm text-surface-200 whitespace-pre-wrap break-words leading-relaxed">
                    {renderHighlighted(anomaly.blockedText!, findings)}
                  </p>
                </div>
                {findings.length > 0 && (
                  <ul className="space-y-1 flex-shrink-0 max-h-32 overflow-y-auto pr-1">
                    {findings.map((f, i) => (
                      <li key={i} className="text-xs text-surface-400 leading-snug">
                        <span className="font-medium text-amber-300/90">“{f.raw}”</span>
                        {' — '}{findingReasonLabel(f.type, f.reason)}
                        {f.suggested && (
                          <> · correto: <span className="font-medium text-surface-300">{f.suggested}</span></>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* ── Coluna direita: o que fazer + o que o sistema sabia ─── */}
            <div className={cn('flex flex-col gap-4', hasV2 && 'min-h-0 overflow-y-auto pr-1')}>
              {isHandoff && (
                <div className="rounded-lg bg-surface-800/40 px-3 py-2.5 flex-shrink-0">
                  <p className="text-xs font-medium text-surface-200 mb-1">O que verificar</p>
                  <p className="text-xs text-surface-400">
                    {guardCheckGuidance(anomaly.outcome, anomaly.claimType)}
                  </p>
                </div>
              )}

              {failures.length > 0 && (
                <div className="flex-shrink-0">
                  <BlockTitle icon={XCircle} tone="warn">Falha no retorno da skill</BlockTitle>
                  <div className="space-y-2">
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
                </div>
              )}

              <div className="space-y-3 flex-shrink-0">
                {expectedOp && (
                  <Detail icon={Wrench} label="Operação esperada">
                    {expectedOp}{anomaly.requiredSkill ? <span className="text-surface-500"> ({anomaly.requiredSkill})</span> : null}
                  </Detail>
                )}

                {/* Fragmento legado (v1) — redundante quando a mensagem retida
                    inteira está disponível na coluna ao lado. */}
                {anomaly.matchedText && !hasV2 && (
                  <Detail icon={Quote} label="Trecho detectado">
                    <span className="italic">“{anomaly.matchedText}”</span>
                  </Detail>
                )}

                <Detail icon={Tag} label="Tipo">
                  {guardTypeLabel(anomaly.outcome, anomaly.claimType)}
                </Detail>

                {when && <Detail icon={Clock} label="Quando">{when}</Detail>}

                {anomaly.correlationId && (
                  <Detail icon={Hash} label="Referência (logs)">
                    <span className="font-mono text-xs break-all">{anomaly.correlationId}</span>
                  </Detail>
                )}

                {anomaly.outcome && (
                  <p className="text-[10px] text-surface-600">código técnico: {anomaly.outcome}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
