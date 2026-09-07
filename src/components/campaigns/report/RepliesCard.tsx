import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { PendingDataCard } from './PendingDataCard'
import type { CampaignReply } from '@/types/campaignsV2'

type Filtro = 'todas' | 'detratores'

/** Classe → variável de cor categórica. Nunca hex literal (Carta de Padrões). */
const COR_POR_CLASSE: Record<string, string> = {
  promoter: 'var(--color-status-active)',
  detractor: 'var(--color-danger)',
  neutral: 'var(--color-surface-400)',
  question: 'var(--color-accent-cyan)',
  optout: 'var(--color-accent-amber)',
  other: 'var(--color-surface-400)',
}

interface RepliesCardProps {
  replies: CampaignReply[]
  total: number
  detractorCount: number
  hasRecipientData: boolean
  onVerTodas: () => void
}

export function RepliesCard({ replies, total, detractorCount, hasRecipientData, onVerTodas }: RepliesCardProps) {
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const visiveis = useMemo(
    () => (filtro === 'detratores' ? replies.filter((r) => r.class === 'detractor') : replies),
    [replies, filtro],
  )

  return (
    <Card>
      <CardHeader
        title={`Respostas${total ? ` · ${total.toLocaleString('pt-BR')}` : ''}`}
        description="Classificadas pela IA"
        action={
          hasRecipientData && detractorCount > 0 ? (
            <SegmentedControl<Filtro>
              label="Filtrar respostas"
              value={filtro}
              onChange={setFiltro}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'detratores', label: 'Detratores', count: detractorCount },
              ]}
            />
          ) : null
        }
      />

      {!hasRecipientData ? (
        <PendingDataCard what="A lista de respostas classificadas" />
      ) : visiveis.length === 0 ? (
        <p className="text-xs text-surface-400">
          {filtro === 'detratores' ? 'Nenhum detrator neste disparo.' : 'Nenhuma resposta ainda.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visiveis.slice(0, 3).map((r) => (
            <li key={`${r.contactId}-${r.at}`} className="flex items-start gap-2.5">
              {/* Sem classificação da BE.9 o chip simplesmente não aparece —
                  a resposta continua legível, que é o que importa. */}
              {r.score != null && (
                <span
                  className="shrink-0 inline-flex items-center justify-center min-w-7 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${COR_POR_CLASSE[r.class ?? 'other']} 18%, transparent)`,
                    color: COR_POR_CLASSE[r.class ?? 'other'],
                  }}
                >
                  {r.score}
                </span>
              )}
              <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-surface-700/60 px-3 py-2">
                <p className="text-[12.5px] text-surface-100 break-words">{r.text}</p>
                <p className="text-[11px] text-surface-500 mt-1">
                  {r.name}
                  {r.at ? ` · ${formatarHora(r.at)}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasRecipientData && total > 3 && (
        <button
          type="button"
          onClick={onVerTodas}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          Ver as {total.toLocaleString('pt-BR')}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </Card>
  )
}

function formatarHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
