import { useMemo } from 'react'
import { HeartPulse, Clock, MessageSquare, Repeat, Smile } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { Contact } from '@/types'
import type { ContactStats } from '@/hooks/useContactProfile'

interface RelationshipHealthPanelProps {
  contact: Contact
  stats: ContactStats | null
}

interface Factor {
  key: string
  label: string
  icon: typeof Clock
  score: number // 0–100
  hint: string
}

function daysSince(iso?: string): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/** Termômetro de relacionamento — índice 0–100 combinando recência, frequência,
 *  responsividade e sentimento. Heurística client-side sobre dados reais já
 *  carregados na página (contact + getStats); a fórmula migra para o backend
 *  numa fase futura. */
export function RelationshipHealthPanel({ contact, stats }: RelationshipHealthPanelProps) {
  const { score, band, factors } = useMemo(() => {
    // Recência — quanto mais recente o último contato, mais saudável.
    const d = daysSince(contact.lastContactedAt)
    const recency = d === null ? 40 : d <= 3 ? 100 : d <= 14 ? 75 : d <= 30 ? 50 : d <= 90 ? 25 : 8
    const recencyHint = d === null ? 'sem registro' : d === 0 ? 'hoje' : `há ${d}d`

    // Frequência — volume de conversas acumuladas.
    const n = contact.conversationCount ?? 0
    const frequency = n >= 10 ? 100 : n >= 5 ? 75 : n >= 2 ? 45 : n === 1 ? 20 : 0
    const frequencyHint = `${n} conversa${n === 1 ? '' : 's'}`

    // Responsividade — tempo médio de resposta (menor = melhor).
    const rt = stats?.avgResponseTimeSeconds ?? null
    const responsiveness = rt === null ? 50 : rt <= 300 ? 100 : rt <= 1800 ? 80 : rt <= 7200 ? 55 : rt <= 43200 ? 30 : 15
    const responsivenessHint = rt === null ? 'sem dados'
      : rt < 60 ? `${Math.round(rt)}s` : rt < 3600 ? `${Math.round(rt / 60)}min` : `${(rt / 3600).toFixed(1)}h`

    // Sentimento — do perfil de IA (ou da última análise).
    const sent = contact.aiSentiment ?? (stats?.lastAnalysis?.sentiment as Contact['aiSentiment']) ?? 'unknown'
    const sentiment = sent === 'positive' ? 100 : sent === 'neutral' ? 60 : sent === 'negative' ? 20 : 50
    const sentimentHint = sent === 'positive' ? 'positivo' : sent === 'neutral' ? 'neutro' : sent === 'negative' ? 'negativo' : 'indefinido'

    const factors: Factor[] = [
      { key: 'recency', label: 'Recência', icon: Clock, score: recency, hint: recencyHint },
      { key: 'frequency', label: 'Frequência', icon: Repeat, score: frequency, hint: frequencyHint },
      { key: 'responsiveness', label: 'Resposta', icon: MessageSquare, score: responsiveness, hint: responsivenessHint },
      { key: 'sentiment', label: 'Sentimento', icon: Smile, score: sentiment, hint: sentimentHint },
    ]

    const score = Math.round(recency * 0.35 + frequency * 0.2 + responsiveness * 0.2 + sentiment * 0.25)
    const band = score >= 75
      ? { label: 'Engajado', color: 'var(--color-status-active)' }
      : score >= 50
        ? { label: 'Estável', color: 'var(--color-brand-500)' }
        : score >= 30
          ? { label: 'Esfriando', color: 'var(--color-warning)' }
          : { label: 'Em risco', color: 'var(--color-danger)' }

    return { score, band, factors }
  }, [contact, stats])

  return (
    <Card noPadding className="overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
        <h3 className="text-sm font-semibold text-surface-100 inline-flex items-center gap-1.5">
          <HeartPulse className="w-4 h-4 text-surface-400" />
          Relacionamento
        </h3>
        <span
          title="Índice de saúde do relacionamento: combina recência do último contato, frequência de conversas, tempo de resposta e sentimento. Prévia calculada no cliente a partir dos dados do contato."
          className="color-chip inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
          style={{ ['--chip']: band.color } as React.CSSProperties}
        >
          {band.label}
        </span>
      </div>

      <div className="px-4 pb-4 flex-1 flex flex-col">
        {/* Barra de índice */}
        <div className="flex items-end gap-2 mb-3 shrink-0">
          <span className="text-2xl font-display font-semibold text-surface-50 tabular-nums leading-none">{score}</span>
          <span className="text-[11px] text-surface-400 mb-0.5">/100</span>
          <span className="text-[10px] text-surface-500 uppercase tracking-wide mb-0.5 ml-1">prévia</span>
          <div className="flex-1 h-1.5 rounded-full bg-surface-700 overflow-hidden ml-1 mb-1">
            <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: band.color }} />
          </div>
        </div>

        {/* Fatores — espalham verticalmente para preencher a altura do card */}
        <div className="flex flex-col gap-1.5 flex-1 justify-around">
          {factors.map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <f.icon className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
              <span className="text-xs text-surface-400 w-20 flex-shrink-0">{f.label}</span>
              <div className="flex-1 h-1 rounded-full bg-surface-700/70 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${f.score}%`, backgroundColor: `color-mix(in srgb, ${band.color} 70%, var(--color-surface-600))` }}
                />
              </div>
              <span className="text-[11px] text-surface-400 tabular-nums w-14 text-right flex-shrink-0">{f.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
