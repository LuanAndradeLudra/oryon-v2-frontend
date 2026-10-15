import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { PrioridadeParaEmpresa } from '@/types/support'
import './suporte.css'
import { PRIORIDADE_PARA_EMPRESA, STATUS, type StatusChamado } from './supportModel'

type Tom = 'neutral' | 'info' | 'amber' | 'accent' | 'success' | 'danger' | 'warning'

/** O fundo é o tom a 12%; o texto vem dos tokens do suporte, medidos ≥ 4,5:1 nos dois temas (SCRUM-1394). */
const TONS: Record<Tom, string> = {
  neutral: 'bg-[var(--rowhover)] text-surface-300',
  info: 'bg-info/[.12] text-[var(--sup-selo-info)]',
  amber: 'bg-accent-amber/[.12] text-[var(--sup-selo-amber)]',
  accent: 'sup-selo-acento',
  success: 'bg-success/[.12] text-[var(--sup-selo-success)]',
  danger: 'bg-danger/[.12] text-[var(--sup-selo-danger)]',
  warning: 'bg-warning/[.12] text-[var(--sup-selo-warning)]',
}

/** Selo de 22px da régua (chips 6px), no mesmo desenho do EstadoDaIAChip. */
export function SupportChip({ tom = 'neutral', children, className, title }: { tom?: Tom; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 h-[22px] px-2 rounded-[6px] text-[11px] font-semibold whitespace-nowrap', TONS[tom], className)}>
      {children}
    </span>
  )
}

export function StatusChip({ status }: { status: StatusChamado }) {
  const s = STATUS[status]
  return <SupportChip tom={s.tom}>{s.nome}</SupportChip>
}

/**
 * Prioridade como a EMPRESA vê: em palavras e só quando alta. O backend já
 * manda `null` para quem não é da gestão (e para P2/P3) — aqui nada aparece.
 * A escala P0–P3 com motivos é da fila da equipe Oryon (SCRUM-1384).
 */
export function PrioridadeDaEmpresaChip({ prioridade }: { prioridade: PrioridadeParaEmpresa }) {
  if (!prioridade) return null
  return <SupportChip tom={prioridade === 'P0' ? 'danger' : 'warning'}>{PRIORIDADE_PARA_EMPRESA[prioridade]}</SupportChip>
}
