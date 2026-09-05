import { FileText, Clock, Send, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import type { CampaignStatus } from '@/types'

export const STATUS_CONFIG: Record<CampaignStatus, {
  label: string
  chip: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  draft:     { label: 'Rascunho',   chip: 'var(--color-status-muted)', icon: FileText },
  scheduled: { label: 'Agendada',   chip: 'var(--color-status-open)',       icon: Clock },
  sending:   { label: 'Enviando',   chip: 'var(--color-status-pending)',       icon: Send },
  sent:      { label: 'Enviada',    chip: 'var(--color-status-active)', icon: CheckCircle2 },
  failed:    { label: 'Falhou',     chip: 'var(--color-danger)',                icon: XCircle },
  cancelled: { label: 'Cancelada',  chip: 'var(--color-status-muted)', icon: AlertCircle },
}
