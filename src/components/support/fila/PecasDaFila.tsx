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

/** Vencido há mais que isto já não é novidade: a cor fica só no ícone (revisão de UX de 27/10). */
const VENCIDO_ANTIGO_MS = 24 * 60 * 60 * 1000

/**
 * O prazo aberto que vence primeiro: vermelho o que venceu nas últimas 24 h,
 * amarelo o que está perto. Vencido há mais tempo fica com o texto neutro e o
 * ícone vermelho — com a fila inteira em vermelho, a cor deixava de dizer o
 * que pede ação agora. `agora` vem do relógio do minuto.
 */
export function PrazoNaFila({ prazo, agora, sempre = false }: { prazo: ProximoPrazo | null; agora: number; sempre?: boolean }) {
  if (!prazo || (!sempre && !prazo.perto)) return null
  const antigo = prazo.vencido && agora - Date.parse(prazo.ate) > VENCIDO_ANTIGO_MS
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs min-w-0 truncate',
      antigo ? 'text-surface-300' : prazo.vencido ? 'font-semibold text-danger' : prazo.perto ? 'font-semibold text-warning' : 'text-surface-300')}>
      <Clock className={cn('w-3 h-3 flex-shrink-0', antigo && 'text-danger')} aria-hidden />
      {RELOGIOS[prazo.relogio]} {prazo.vencido ? `${prazo.relogio === 'contorno' ? 'vencido' : 'vencida'} ${relativo(prazo.ate, agora)}` : relativo(prazo.ate, agora)}
    </span>
  )
}
