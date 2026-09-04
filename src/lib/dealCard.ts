import { Megaphone, Zap, Sparkles, UserRound, Upload, Workflow, type LucideIcon } from 'lucide-react'
import type { Deal, DealOriginKind, DealMovedByKind } from '@/types'

/**
 * Texto do card do board por registro (F8 · SCRUM-870, prancheta 2, Modelo B
 * §4.2): de onde o registro veio, quem o moveu por último e há quanto tempo
 * está na etapa. Funções puras sobre o `Deal` que `GET /deals?pipelineId=`
 * devolve (backend F8-870) — sem React, testáveis direto.
 */

export interface OriginInfo {
  kind: DealOriginKind
  /** Rótulo curto do chip ("Campanha · Confirmação 28/08", "Evento", "IA"…). */
  label: string
  icon: LucideIcon
}

const ORIGIN_BASE: Record<DealOriginKind, { label: string; icon: LucideIcon }> = {
  campaign: { label: 'Campanha', icon: Megaphone },
  event: { label: 'Evento', icon: Zap },
  journey: { label: 'Automação', icon: Workflow },
  ai: { label: 'IA', icon: Sparkles },
  manual: { label: 'Manual', icon: UserRound },
  import: { label: 'Importação', icon: Upload },
}

/** Origem do registro. Backend anterior ao épico (sem `originKind`) → deriva de `createdByKind`. */
export function originInfo(deal: Pick<Deal, 'originKind' | 'originLabel' | 'createdByKind'>): OriginInfo {
  const kind: DealOriginKind = deal.originKind
    ?? (deal.createdByKind === 'ai' ? 'ai' : deal.createdByKind === 'automation' ? 'event' : 'manual')
  const base = ORIGIN_BASE[kind] ?? ORIGIN_BASE.manual
  const label = kind === 'campaign' && deal.originLabel ? `Campanha · ${deal.originLabel}` : base.label
  return { kind, label, icon: base.icon }
}

/** Selo de quem moveu por último: `IA` (Judge/tool) · `auto` (evento, automação, jornada, campanha, sistema) · nada (humano). */
export function movedByChip(deal: Pick<Deal, 'lastMovedByKind' | 'createdByKind'>): 'ia' | 'auto' | null {
  const kind: DealMovedByKind | null | undefined = deal.lastMovedByKind
  if (kind === undefined || kind === null) {
    // Backend anterior à F8: só sabemos quem CRIOU.
    if (deal.createdByKind === 'ai') return 'ia'
    if (deal.createdByKind === 'automation') return 'auto'
    return null
  }
  if (kind === 'ai') return 'ia'
  if (kind === 'user') return null
  return 'auto'
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** "há 40 min" · "há 3 h" · "há 2 dias" — duração humana curta, em PT-BR. */
export function humanDuration(ms: number): string {
  if (ms < MIN) return 'agora'
  if (ms < HOUR) return `${Math.floor(ms / MIN)} min`
  if (ms < DAY) return `${Math.floor(ms / HOUR)} h`
  const days = Math.floor(ms / DAY)
  return `${days} ${days === 1 ? 'dia' : 'dias'}`
}

/**
 * Tempo na etapa atual — "3 h na etapa"; para registro fechado, "fechado há
 * 2 h" (a partir de `closedAt`). Sem dado (`stageEnteredAt` ausente e sem
 * `updatedAt`) → `null` e o card não mostra o relógio.
 */
export function timeInStage(
  deal: Pick<Deal, 'status' | 'stageEnteredAt' | 'closedAt' | 'updatedAt' | 'createdAt'>,
  now: number = Date.now(),
): string | null {
  if (deal.status !== 'open') {
    const closed = deal.closedAt ? new Date(deal.closedAt).getTime() : NaN
    if (Number.isFinite(closed)) return `fechado há ${humanDuration(Math.max(0, now - closed))}`
  }
  const raw = deal.stageEnteredAt ?? deal.updatedAt ?? deal.createdAt
  const entered = raw ? new Date(raw).getTime() : NaN
  if (!Number.isFinite(entered)) return null
  const d = humanDuration(Math.max(0, now - entered))
  return d === 'agora' ? 'agora na etapa' : `${d} na etapa`
}

/** Contagens do strip do funil: abertos · concluídos hoje · cancelados/perdidos (F8-871). */
export function boardStats(
  deals: ReadonlyArray<Pick<Deal, 'status' | 'closedAt'>>,
  now: Date = new Date(),
): { open: number; wonToday: number; lost: number } {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  let open = 0
  let wonToday = 0
  let lost = 0
  for (const d of deals) {
    if (d.status === 'open') open += 1
    else if (d.status === 'lost') lost += 1
    else if (d.status === 'won') {
      const t = d.closedAt ? new Date(d.closedAt).getTime() : NaN
      if (Number.isFinite(t) && t >= dayStart) wonToday += 1
    }
  }
  return { open, wonToday, lost }
}

/** Origens presentes no board, para o strip ("Entradas: campanha Confirmação, manual"). Ordem de aparição, sem repetição. */
export function entrySources(deals: ReadonlyArray<Pick<Deal, 'originKind' | 'originLabel' | 'createdByKind'>>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const d of deals) {
    const info = originInfo(d)
    const label = info.kind === 'campaign' ? info.label.replace('Campanha · ', 'campanha ') : info.label.toLowerCase()
    if (!seen.has(label)) { seen.add(label); out.push(label) }
  }
  return out
}
