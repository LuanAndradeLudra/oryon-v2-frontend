// Compact line-identifier chip for resource cards (templates, campaigns,
// automations). Always visible — removes the guesswork of "which line is
// this `boas_vindas` from?" that the old flat listing left behind.
//
// When the resource has no whatsappNumberId (pre-migration rows) the chip
// degrades into a subtle "sem linha" indicator — distinct from the
// actionable `WabaAssignmentBadge`, which is the clickable call-to-fix.

import { Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { formatPhone } from '@/lib/phone'


export function WhatsappLineChip({
  whatsappNumberId,
  className,
  size = 'sm',
}: {
  whatsappNumberId?: string | null
  className?: string
  /** 'sm' for dense lists, 'md' for card headers. */
  size?: 'sm' | 'md'
}) {
  const { numbers } = useWorkspaceNumber()
  // Chip stays out of the way in single-line tenants — the line is implied.
  if (numbers.length < 2) return null

  const line = whatsappNumberId ? numbers.find((n) => n.id === whatsappNumberId) : null

  // Achado ao vivo (Fase D, CampaignsTab): o chip solid verde-marca gritava
  // mais que o chip de status ao lado e não existe no mock — vira neutro
  // suave, mesmo vocabulário do chip "Rascunho" (--sf2/--bd/--tx2), só com
  // o conteúdo (telefone × "sem linha") mudando.
  const base = size === 'sm'
    ? 'h-5 text-[11px] font-semibold px-1.5 gap-1'
    : 'text-xs px-2 py-1 gap-1.5'
  const neutral = 'bg-[var(--sf2)] border-surface-700 text-surface-400'

  if (!line) {
    return (
      <span
        className={cn('inline-flex items-center rounded-md border', neutral, base, className)}
        title="Recurso sem linha WhatsApp atribuída"
      >
        <Phone className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3 h-3')} />
        <span className="uppercase tracking-wide">sem linha</span>
      </span>
    )
  }

  const label = line.label || formatPhone(line.displayPhoneNumber)
  return (
    <span
      className={cn('inline-flex items-center rounded-md border', neutral, base, className)}
      title={line.label ? formatPhone(line.displayPhoneNumber) : label}
    >
      <Phone className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3 h-3')} />
      <span className="truncate max-w-[140px] font-medium">{label}</span>
    </span>
  )
}
