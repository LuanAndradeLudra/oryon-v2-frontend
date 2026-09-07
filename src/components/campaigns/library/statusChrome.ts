// ─── statusChrome ──────────────────────────────────────────────────────────
// Ícone, cor e rótulo de cada situação da Meta, num lugar só. O rail e o card
// mostram a mesma situação em dois tamanhos, e duas tabelas na mesma pasta
// divergiriam na primeira vez que um status mudasse de cor.
//
// VERDE E ÂMBAR SÃO FAMÍLIA DE STATUS, NÃO ACENTO CATEGÓRICO. O mockup pede
// #4ADE80 e #FBBF24, que são `--color-status-active` e
// `--color-status-pending`. `--color-accent-green` é #10B981 — outra cor e
// outro significado: acento categórico é o chip de categoria do rodapé do
// card (Marketing/Utilidade/Autenticação), não a etiqueta de situação.
import type { ComponentType, CSSProperties } from 'react'
import { CheckCircle2, Clock, XCircle, PauseCircle, AlertCircle } from 'lucide-react'
import type { TemplateStatus } from '@/types'

export type ChromeIcon = ComponentType<{ className?: string; style?: CSSProperties }>

export interface StatusChrome {
  icon: ChromeIcon
  /** Sempre custom property — nunca hex cru (CARTA-DE-PADROES.md §7). */
  color: string
  /** Singular, como o card escreve. O rail usa o plural que vem do
   *  `buildRail`, porque lá o rótulo nomeia um conjunto. */
  label: string
}

export const STATUS_CHROME: Record<TemplateStatus, StatusChrome> = {
  APPROVED: { icon: CheckCircle2, color: 'var(--color-status-active)',  label: 'Aprovado' },
  PENDING:  { icon: Clock,        color: 'var(--color-status-pending)', label: 'Em análise' },
  REJECTED: { icon: XCircle,      color: 'var(--color-danger)',         label: 'Rejeitado' },
  PAUSED:   { icon: PauseCircle,  color: 'var(--color-status-muted)',   label: 'Pausado' },
  DISABLED: { icon: AlertCircle,  color: 'var(--color-danger)',         label: 'Desativado' },
}
