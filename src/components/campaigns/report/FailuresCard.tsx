import { PhoneOff, ShieldOff, TimerOff, AlertCircle } from 'lucide-react'
import type { ComponentType } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { PendingDataCard } from './PendingDataCard'
import type { CampaignFailureReason } from '@/types/campaignsV2'

const ICONE_POR_CODIGO: Record<string, { Icon: ComponentType<{ className?: string }>; tom: string }> = {
  invalid_number: { Icon: PhoneOff, tom: 'text-danger' },
  opt_out: { Icon: ShieldOff, tom: 'text-accent-amber' },
  outside_window: { Icon: TimerOff, tom: 'text-surface-500' },
}

interface FailuresCardProps {
  failures: CampaignFailureReason[]
  total: number
  hasRecipientData: boolean
  /** Leva à aba Contatos filtrada por aquele código de falha. */
  onVerContatos: (code?: string) => void
}

/**
 * Falhas por motivo.
 *
 * O mockup prometia três ações por linha — "Marcar inválidos", "Excluir de
 * listas" e "Reenviar". Nenhuma tem endpoint, e as três são mutações de
 * verdade: mexem em contatos, em listas de exclusão e disparam envio. Foram
 * cortadas (decisão D3-decisoes §1) e a coluna virou "Ver contatos", que
 * filtra a aba ao lado pelo código da linha. Uma tabela que oferece
 * "Marcar inválidos" sem ter o que chamar é pior que uma tabela que não
 * oferece nada — o botão promete uma capacidade que não existe.
 */
export function FailuresCard({ failures, total, hasRecipientData, onVerContatos }: FailuresCardProps) {
  return (
    <Card noPadding className="overflow-hidden">
      <CardHeader
        className="px-4 pt-3.5 mb-3"
        title={`Falhas${total ? ` · ${total.toLocaleString('pt-BR')}` : ''}`}
        action={
          hasRecipientData && failures.length > 0 ? (
            <button
              type="button"
              onClick={() => onVerContatos()}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Ver contatos
            </button>
          ) : null
        }
      />

      {!hasRecipientData ? (
        <div className="px-4 pb-4">
          <PendingDataCard what="A quebra das falhas por motivo" />
        </div>
      ) : failures.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-surface-400">Nenhuma falha neste disparo.</p>
      ) : (
        // `.ctable` do mockup: 13.2px, linhas separadas por surface-800.
        <table className="w-full text-[13.2px]">
          <caption className="sr-only">Falhas do disparo por motivo</caption>
          <tbody>
            {failures.map((f) => {
              const { Icon, tom } = ICONE_POR_CODIGO[f.code] ?? { Icon: AlertCircle, tom: 'text-surface-500' }
              return (
                <tr key={f.code} className="border-t border-surface-800">
                  <td className="px-3.5 py-[11px]">
                    <span className="flex items-center gap-2 text-surface-200">
                      <Icon className={`w-4 h-4 shrink-0 ${tom}`} aria-hidden="true" />
                      {f.reason}
                    </span>
                  </td>
                  <td className="px-2 py-[11px] text-right font-mono text-[12.5px] tabular-nums text-surface-200">
                    {f.count.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3.5 py-[11px] text-right">
                    <button
                      type="button"
                      onClick={() => onVerContatos(f.code)}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Ver contatos
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Card>
  )
}
