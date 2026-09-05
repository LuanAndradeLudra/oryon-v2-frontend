import { STATUS_CONFIG } from './campaignStatus'
import type { CampaignStatus } from '@/types'

export function CampaignStatusChip({ status }: { status: CampaignStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  const StatusIcon = cfg.icon
  return (
    <span
      className="color-chip border flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ ['--chip']: cfg.chip } as React.CSSProperties}
    >
      <StatusIcon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}
