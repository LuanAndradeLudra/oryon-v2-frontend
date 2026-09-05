import { FileText, Clock, Send, CheckCircle2, XCircle, AlertCircle, PauseCircle } from 'lucide-react'
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
  // 7º status, da BE.2/SCRUM-1001 (`POST /campaigns/:id/pause`). Âmbar próprio
  // — e não o `--color-accent-amber` da família categórica, que no tema claro
  // resolve para o mesmo #B45309 do `sending` e deixava os dois chips idênticos
  // justamente onde eles aparecem lado a lado oferecendo ações opostas.
  // Uma pausada é uma enviando interrompida, não um estado inerte como
  // `cancelled`/`draft`, então também não recebe o cinza deles.
  // Adicionado pela D1/SCRUM-1018, primeira consumidora, como exceção ao
  // congelamento autorizada pelo Maestro (coord/D1-decisoes.md, decisão 1);
  // o token `--color-status-paused` é a segunda metade da mesma exceção.
  paused:    { label: 'Pausada',    chip: 'var(--color-status-paused)', icon: PauseCircle },
}
