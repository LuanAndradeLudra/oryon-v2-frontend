import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProximoPrazo } from '@/types/support'
import { SupportChip } from '../SupportChip'
import { STATUS, type StatusChamado } from '../supportModel'
import { PRIORIDADES, RELOGIOS, STATUS_NA_FILA, relativo, type Prioridade } from './modeloDaFila'

/** Status com o nome da EQUIPE (triado ≠ investigando), no tom da página da empresa. */
export function StatusNaFila({ status }: { status: StatusChamado }) {
  return <SupportChip tom={STATUS[status].tom}>{STATUS_NA_FILA[status]}</SupportChip>
}

export function PrioridadeNaFila({ prioridade, className }: { prioridade: Prioridade; className?: string }) {
  return (
    <b className={cn('text-[11px] font-bold tabular-nums', PRIORIDADES[prioridade].cor, className)} title={`Prioridade ${PRIORIDADES[prioridade].nome.toLowerCase()}`}>
      {prioridade}
    </b>
  )
}

/** O prazo aberto que vence primeiro: vermelho vencido, amarelo perto. `agora` vem do relógio do minuto. */
export function PrazoNaFila({ prazo, agora, sempre = false }: { prazo: ProximoPrazo | null; agora: number; sempre?: boolean }) {
  if (!prazo || (!sempre && !prazo.perto)) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold min-w-0 truncate',
      prazo.vencido ? 'text-danger' : prazo.perto ? 'text-warning' : 'text-surface-300')}>
      <Clock className="w-3 h-3 flex-shrink-0" aria-hidden />
      {RELOGIOS[prazo.relogio]} {prazo.vencido ? `${prazo.relogio === 'contorno' ? 'vencido' : 'vencida'} ${relativo(prazo.ate, agora)}` : relativo(prazo.ate, agora)}
    </span>
  )
}
