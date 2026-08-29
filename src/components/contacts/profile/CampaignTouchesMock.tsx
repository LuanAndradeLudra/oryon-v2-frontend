import { Megaphone } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { MockBadge } from './MockBadge'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import type { CampaignTouch, CampaignTouchStatus } from '@/types/contactProfile'

interface CampaignTouchesMockProps {
  touches: CampaignTouch[]
}

// Chips saturados (.color-chip) via tokens theme-aware.
const STATUS_CHIP: Record<CampaignTouchStatus, { label: string; chip: string }> = {
  sent:      { label: 'Enviada', chip: 'var(--color-status-muted)' },
  delivered: { label: 'Entregue', chip: 'var(--color-accent-blue)' },
  read:      { label: 'Lida', chip: 'var(--color-brand-500)' },
  replied:   { label: 'Respondida', chip: 'var(--color-accent-green)' },
  failed:    { label: 'Falhou', chip: 'var(--color-danger)' },
}

/** Aba Campanhas — mock; será alimentada por GET /contacts/:id/campaigns
 *  (exige persistir campaign_recipients no backend). */
export function CampaignTouchesMock({ touches }: CampaignTouchesMockProps) {
  if (touches.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Nenhuma campanha recebida."
        hint="Os disparos de campanha que incluíram este contato aparecerão aqui."
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end"><MockBadge /></div>
      {touches.map((touch) => (
        <div
          key={touch.id}
          className="flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-800 px-4 py-3"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
            <WhatsAppIcon className="w-4 h-4 text-surface-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-100 truncate">{touch.campaignName}</p>
            <p className="text-xs text-surface-500 mt-0.5">
              {new Date(touch.sentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <span
            className="color-chip inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium flex-shrink-0"
            style={{ ['--chip']: STATUS_CHIP[touch.status].chip } as React.CSSProperties}
          >
            {STATUS_CHIP[touch.status].label}
          </span>
        </div>
      ))}
    </div>
  )
}
