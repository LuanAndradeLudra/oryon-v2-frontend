// ─── O que a agenda acrescenta ao status ───────────────────────────────────
// Rótulo, cor e ícone vivem em `campaigns/shared/campaignStatus.ts` (W0.4) e
// são consumidos de lá — este arquivo guarda só o que é específico da agenda:
// a ordem de urgência que decide QUAIS 3 status o mini-calendário mostra
// quando o dia tem mais que isso.
import { STATUS_CONFIG } from '@/components/campaigns/shared/campaignStatus'
import type { CampaignStatus } from '@/types'

/** Token CSS da cor do status — mesma fonte do chip. */
export function statusColor(status: CampaignStatus): string {
  return (STATUS_CONFIG[status] ?? STATUS_CONFIG.draft).chip
}

export function statusLabel(status: CampaignStatus): string {
  return (STATUS_CONFIG[status] ?? STATUS_CONFIG.draft).label
}

// Ordem de urgência: o que uma pessoa precisa ver primeiro quando o dia tem
// mais de 3 status distintos e só cabem 3 pontos. Falha e envio em curso
// ganham de qualquer coisa agendada; rascunho e cancelada perdem de tudo,
// porque não são compromisso nem acontecimento.
export const STATUS_URGENCY: readonly CampaignStatus[] = [
  'failed', 'sending', 'paused', 'scheduled', 'sent', 'draft', 'cancelled',
] as const

export function statusRank(status: CampaignStatus): number {
  const i = STATUS_URGENCY.indexOf(status)
  return i === -1 ? STATUS_URGENCY.length : i
}
