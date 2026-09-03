import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, CheckCircle2, XCircle, Clock, TrendingUp,
  DollarSign, AlertTriangle, Send, ChevronDown, ChevronUp,
  Loader2,
} from 'lucide-react'
import { conversionApi } from '@/services/api'
import { Banner } from '@/components/ui/Banner'
import type { ConversationAnalysisResult, ConversionOutcome, Contact } from '@/types'
import { cn } from '@/lib/utils'

// ── Outcome config ────────────────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<ConversionOutcome, {
  label: string; color: string; bg: string; icon: React.ReactNode; description: string
}> = {
  converted: {
    label: 'Convertido',
    color: 'var(--color-accent-green)',
    bg: 'color-mix(in srgb, var(--color-accent-green) 10%, transparent)',
    icon: <CheckCircle2 className="w-4 h-4" />,
    description: 'Sinais claros de compra ou contratação detectados',
  },
  interested: {
    label: 'Interessado',
    color: 'var(--color-accent-amber)',
    bg: 'color-mix(in srgb, var(--color-accent-amber) 10%, transparent)',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'Alto interesse, mas sem confirmação de compra',
  },
  follow_up: {
    label: 'Follow-up',
    color: 'var(--color-accent-blue)',
    bg: 'color-mix(in srgb, var(--color-accent-blue) 10%, transparent)',
    icon: <Clock className="w-4 h-4" />,
    description: 'Requer acompanhamento proativo',
  },
  not_interested: {
    label: 'Sem interesse',
    color: 'var(--color-danger)',
    bg: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
    icon: <XCircle className="w-4 h-4" />,
    description: 'Intenção de cancelamento ou desinteresse claro',
  },
}

// ── Loading steps simulation ──────────────────────────────────────────────────

const ANALYSIS_STEPS = [
  'Carregando histórico de mensagens...',
  'Identificando sinais de intenção...',
  'Avaliando objeções e bloqueadores...',
  'Correlacionando com campanha de origem...',
  'Calculando probabilidade de conversão...',
  'Gerando recomendação de próxima ação...',
]

function AnalyzingState() {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1))
    }, 480)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" />
        <span className="text-xs font-medium text-surface-200">Analisando conversa com IA...</span>
      </div>
      <div className="h-1 bg-surface-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-colors duration-500"
          style={{ width: `${((stepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
        />
      </div>
      <p className="text-2xs text-surface-500 min-h-[16px] transition-colors">
        {ANALYSIS_STEPS[stepIndex]}
      </p>
    </div>
  )
}

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-colors"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-2xs font-bold tabular-nums text-surface-300">{pct}%</span>
    </div>
  )
}

// ── CAPI Status badge ─────────────────────────────────────────────────────────

function CapiStatusBadge({
  analysis, contact,
}: {
  analysis: ConversationAnalysisResult
  contact: Contact
}) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const hasCawi = !!(contact.metaAdsReferral?.ctwaClickId)
  if (!hasCawi || analysis.outcome !== 'converted' || analysis.status !== 'confirmed') return null

  const handleSend = async () => {
    setSending(true)
    try {
      await conversionApi.sendCapiEvent({
        contactId: contact.id,
        conversationId: analysis.conversationId,
        value: analysis.dealValue ?? analysis.conversionValue,
      })
      setSent(true)
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  if (sent) {
    return (
      <Banner variant="success">
        <p className="font-semibold">Evento enviado para Meta CAPI</p>
        <p className="text-3xs text-surface-500">
          Conversão de R$ {(analysis.dealValue ?? analysis.conversionValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} reportada
        </p>
      </Banner>
    )
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg">
      <Send className="w-3.5 h-3.5 text-[#1877f2] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-200">Reportar ao Meta CAPI</p>
        <p className="text-3xs text-surface-500 mt-0.5">
          Fechar o loop: enviar evento de Purchase para o Meta usando o CTWA Click ID capturado no webhook.
        </p>
        <button
          onClick={handleSend}
          disabled={sending}
          className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-semibold text-white transition-colors disabled:opacity-60"
          style={{ backgroundColor: '#1877f2' }}
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          {sending ? 'Enviando...' : 'Enviar para Meta'}
        </button>
      </div>
    </div>
  )
}

// ── Feedback message (auto-dismiss after 6s) ────────────────────────────────

function FeedbackMessage({ type }: { type: 'confirmed' | 'rejected' }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="flex items-center gap-1.5 text-2xs -mt-1">
      {type === 'confirmed' ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-online" />
          <span className="text-online">Estágio confirmado e aplicado ao contato</span>
        </>
      ) : (
        <>
          <XCircle className="w-3.5 h-3.5 text-surface-500" />
          <span className="text-surface-500">Análise rejeitada</span>
        </>
      )}
    </div>
  )
}

// ── Analysis Result View ──────────────────────────────────────────────────────

function AnalysisResult({
  analysis, contact, onConfirm, onReject, onReanalyze, setPhase, setAnalysis,
}: {
  analysis: ConversationAnalysisResult
  contact: Contact
  onConfirm: (dealValue?: number) => void
  onReject: () => void
  onReanalyze: () => void
  setPhase?: (phase: string) => void
  setAnalysis?: (analysis: ConversationAnalysisResult | null) => void
}) {
  const cfg = OUTCOME_CONFIG[analysis.outcome] ?? OUTCOME_CONFIG.follow_up
  const [showSignals, setShowSignals] = useState(true)
  const [justActioned, setJustActioned] = useState(false)
  const [dealInput, setDealInput] = useState(
    analysis.dealValue?.toString() ?? analysis.conversionValue?.toString() ?? ''
  )
  const [confirming, setConfirming] = useState(false)

  const reviewStatus = (analysis as unknown as Record<string, unknown>).reviewStatus ?? analysis.status ?? 'auto'
  const isPending = reviewStatus === 'pending_review' || reviewStatus === 'auto'
  const isConfirmed = reviewStatus === 'confirmed'
  const isRejected = reviewStatus === 'rejected'

  const handleConfirm = async () => {
    setConfirming(true)
    await onConfirm(dealInput ? parseFloat(dealInput.replace(',', '.')) : undefined)
    setConfirming(false)
    setJustActioned(true)
  }

  return (
    <div className="space-y-3">
      {/* Outcome badge + confidence */}
      <div className="flex items-start gap-2.5">
        <div
          className="color-chip border flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
          style={{ ['--chip']: cfg.color } as React.CSSProperties}
        >
          {cfg.icon}
          {cfg.label}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <ConfidenceBar value={analysis.confidence} color={cfg.color} />
          <p className="text-3xs text-surface-500 mt-0.5">confiança da análise</p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-2xs text-surface-400 leading-relaxed">{analysis.summary}</p>

      {/* Signals toggle */}
      <div>
        <button
          onClick={() => setShowSignals((v) => !v)}
          className="flex items-center gap-1 text-2xs text-surface-500 hover:text-surface-300 transition-colors mb-1.5"
        >
          {showSignals ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {analysis.signals.length} sinal(is) detectado(s)
        </button>
        {showSignals && (
          <div className="space-y-1">
            {analysis.signals.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-online mt-1.5 flex-shrink-0" />
                <span className="text-2xs text-surface-300">{s}</span>
              </div>
            ))}
            {analysis.objections?.map((o, i) => (
              <div key={`obj-${i}`} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                <span className="text-2xs text-surface-400">{o}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next action */}
      {analysis.nextAction && (
        <div className="flex items-start gap-2 px-2.5 py-2 bg-brand-500/8 border border-brand-500/20 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-brand-300">{analysis.nextAction}</p>
        </div>
      )}

      {/* Deal value + suggested stage */}
      <div className="flex gap-2">
        {(analysis.conversionValue || analysis.outcome === 'converted') && (
          <div className="flex-1 bg-surface-800 rounded-lg px-2.5 py-2">
            <p className="text-[9px] text-surface-500 uppercase tracking-wide mb-0.5">Valor detectado</p>
            {isPending ? (
              <div className="flex items-center gap-1">
                <span className="text-3xs text-surface-500">R$</span>
                <input
                  type="text"
                  value={dealInput}
                  onChange={(e) => setDealInput(e.target.value)}
                  placeholder="0,00"
                  className="flex-1 bg-transparent text-sm font-bold text-surface-100 outline-none min-w-0 w-full"
                />
              </div>
            ) : (
              <p className="text-sm font-bold text-online tabular-nums">
                R$ {(analysis.dealValue ?? analysis.conversionValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stage suggestion + action buttons (hidden after confirm/reject) */}
      {isPending && analysis.suggestedStage && (
        <div className="flex-1 bg-surface-800 rounded-lg px-2.5 py-2">
          <p className="text-[9px] text-surface-500 uppercase tracking-wide mb-0.5">Estágio sugerido</p>
          <p className="text-sm font-bold text-surface-100 capitalize">{analysis.suggestedStage}</p>
        </div>
      )}

      {isPending && (
        <div className="flex gap-2 pt-1 relative z-10">
          <button
            type="button"
            onClick={() => handleConfirm()}
            disabled={confirming}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-online text-white rounded-lg text-xs font-semibold transition-colors hover:bg-online/90 disabled:opacity-60 cursor-pointer"
          >
            {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => { onReject(); setJustActioned(true) }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-800 text-surface-300 rounded-lg text-xs font-medium hover:bg-surface-700 transition-colors cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            Rejeitar
          </button>
        </div>
      )}

      {/* Temporary feedback after action (only shows immediately after clicking, not on re-mount) */}
      {justActioned && isConfirmed && <FeedbackMessage type="confirmed" />}
      {justActioned && isRejected && <FeedbackMessage type="rejected" />}

      {/* Reanalyze button (always visible after action) */}
      {(isConfirmed || isRejected) && (
        <button
          onClick={onReanalyze}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-surface-950 transition-opacity hover:opacity-90 mt-1"
          style={{ background: 'linear-gradient(40deg, var(--color-surface-50), var(--color-surface-300))' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Reanalisar conversa
        </button>
      )}

      {/* CAPI */}
      <CapiStatusBadge analysis={analysis} contact={contact} />
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface ConversionAnalysisPanelProps {
  conversationId: string
  contact: Contact
}

export function ConversionAnalysisPanel({ conversationId, contact }: ConversionAnalysisPanelProps) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'analyzing' | 'done'>('loading')
  const [analysis, setAnalysis] = useState<ConversationAnalysisResult | null>(null)

  // Try to load existing analysis on mount
  const mapAnalysis = (raw: Record<string, unknown>) => ({
    ...raw,
    conversationId,
    signals: raw.conversionSignals ?? raw.signals ?? raw.keyTopics ?? [],
    objections: raw.objections ?? [],
    nextAction: raw.nextAction ?? raw.next_action ?? null,
    status: raw.status ?? raw.reviewStatus ?? 'pending_review',
    confidence: Number(raw.confidence ?? 0.5),
    outcome: raw.outcome ?? 'follow_up',
    summary: raw.summary ?? 'Análise concluída.',
    suggestedStage: raw.suggestedStage ?? raw.suggested_stage ?? null,
    sentiment: raw.sentiment ?? 'neutral',
  } as unknown as ConversationAnalysisResult)

  const fetchExisting = useCallback(async () => {
    try {
      const res = await conversionApi.getAnalysis(conversationId)
      if (res.data && typeof res.data === 'object' && (res.data as unknown as Record<string, unknown>).summary) {
        setAnalysis(mapAnalysis(res.data as unknown as Record<string, unknown>))
        setPhase('done')
      } else {
        setPhase('idle')
      }
    } catch {
      setPhase('idle')
    }
  }, [conversationId])

  useEffect(() => { void fetchExisting() }, [fetchExisting])

  const handleAnalyze = async () => {
    setPhase('analyzing')
    try {
      const res = await conversionApi.triggerAnalysis(conversationId)
      setAnalysis(mapAnalysis(res.data as unknown as Record<string, unknown>))
      setPhase('done')
    } catch {
      setPhase('idle')
    }
  }

  const handleConfirm = async (dealValue?: number) => {
    if (!analysis) { console.warn('[Analysis] No analysis to confirm'); return }
    try {
      console.log('[Analysis] Confirming:', { conversationId, stageKey: analysis.suggestedStage, dealValue })
      await conversionApi.confirmAnalysis(conversationId, {
        status: 'confirmed',
        dealValue,
        stageKey: analysis.suggestedStage,
      })
      setAnalysis({ ...analysis, status: 'confirmed', dealValue } as ConversationAnalysisResult)
      console.log('[Analysis] Confirmed successfully')
    } catch (err) {
      console.error('[Analysis] Confirm failed:', err)
    }
  }

  const handleReject = async () => {
    if (!analysis) { console.warn('[Analysis] No analysis to reject'); return }
    try {
      console.log('[Analysis] Rejecting:', { conversationId })
      await conversionApi.confirmAnalysis(conversationId, { status: 'rejected' })
      setAnalysis({ ...analysis, status: 'rejected' } as ConversationAnalysisResult)
      console.log('[Analysis] Rejected successfully')
    } catch (err) {
      console.error('[Analysis] Reject failed:', err)
    }
  }

  const hasAttribution = !!(contact.metaAdsReferral || contact.googleAdsAttribution)
  const platformColor = contact.metaAdsReferral ? '#1877f2' : contact.googleAdsAttribution ? '#EA4335' : 'var(--color-accent-blue)'
  const platformName = contact.metaAdsReferral ? 'Meta Ads' : contact.googleAdsAttribution ? 'Google Ads' : null
  const campaignName = contact.metaAdsReferral?.campaignName ?? contact.googleAdsAttribution?.utmCampaign

  return (
    <div className="px-4 py-3 border-t border-surface-800">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
        </div>
        <div>
          <p className="text-3xs text-surface-500 uppercase tracking-wide font-semibold">Análise de Conversão IA</p>
          {hasAttribution && platformName && (
            <p className="text-3xs mt-0.5" style={{ color: platformColor }}>
              {platformName}{campaignName ? ` · ${campaignName}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* States */}
      {phase === 'loading' && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3.5 h-3.5 text-surface-500 animate-spin" />
          <span className="text-xs text-surface-500">Verificando análises anteriores...</span>
        </div>
      )}

      {phase === 'idle' && (
        <div className="space-y-2.5">
          {hasAttribution && (
            <div className="flex items-start gap-2 px-2.5 py-2 bg-surface-800/60 rounded-lg border border-surface-700/50">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: platformColor }} />
              <p className="text-2xs text-surface-400">
                Lead com atribuição de anúncio detectada. Analise a conversa para fechar o ciclo de atribuição e calcular o ROAS real.
              </p>
            </div>
          )}
          <button
            onClick={handleAnalyze}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-surface-950 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(40deg, var(--color-surface-50), var(--color-surface-300))' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analisar conversa com IA
          </button>
        </div>
      )}

      {phase === 'analyzing' && <AnalyzingState />}

      {phase === 'done' && analysis && (
        <AnalysisResult
          analysis={analysis}
          contact={contact}
          onConfirm={handleConfirm}
          onReject={handleReject}
          onReanalyze={handleAnalyze}
          setPhase={(p) => setPhase(p as 'done' | 'loading' | 'idle' | 'analyzing')}
          setAnalysis={setAnalysis}
        />
      )}
    </div>
  )
}
