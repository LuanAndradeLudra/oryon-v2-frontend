import { Handshake, TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { MockBadge } from './MockBadge'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import type { Deal, DealStatus } from '@/types/contactProfile'

interface DealsTabMockProps {
  deals: Deal[]
}

// Chips saturados (.color-chip) via tokens theme-aware.
const STATUS_CHIP: Record<DealStatus, { label: string; chip: string }> = {
  open: { label: 'Aberto', chip: 'var(--color-brand-500)' },
  won:  { label: 'Ganho', chip: 'var(--color-accent-green)' },
  lost: { label: 'Perdido', chip: 'var(--color-status-muted)' },
}

function money(value: number, currency: string) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency })
}

/** Aba Negócios — mock; será alimentada por GET /deals?contactId= (SCRUM-117). */
export function DealsTabMock({ deals }: DealsTabMockProps) {
  const { vocab } = useTenantVocab()

  if (deals.length === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title={`Nenhum ${vocab.deal.toLowerCase()} vinculado.`}
        hint={`Os ${vocab.deals.toLowerCase()} deste contato aparecerão aqui quando o módulo for conectado.`}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end"><MockBadge /></div>
      {deals.map((deal) => (
        <div
          key={deal.id}
          className="flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-800 px-4 py-3"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-surface-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-100 truncate">{deal.title}</p>
            <p className="text-xs text-surface-500 mt-0.5">
              {deal.stageLabel}
              {deal.expectedCloseAt && deal.status === 'open'
                ? ` · previsão ${new Date(deal.expectedCloseAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                : ''}
            </p>
          </div>
          <span className="text-sm font-semibold text-surface-100 tabular-nums flex-shrink-0">
            {money(deal.value, deal.currency)}
          </span>
          <span
            className="color-chip inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium flex-shrink-0"
            style={{ ['--chip']: STATUS_CHIP[deal.status].chip } as React.CSSProperties}
          >
            {STATUS_CHIP[deal.status].label}
          </span>
        </div>
      ))}
    </div>
  )
}
