// ─── Fatos derivados de uma campanha ───────────────────────────────────────
// Tudo aqui sai do registro que a API já devolve. Nada é estimado, nada é
// preenchido com zero para ocupar espaço: quando o dado não existe, a função
// devolve `null` e quem chama esconde o elemento.
import type { Campaign } from '@/types'
import type { StackedBarSegment } from '@/components/ui/StackedBar'

/** O que falta para um rascunho virar disparo — lido do próprio registro. */
export function missingForDraft(c: Campaign): string[] {
  const missing: string[] = []
  if (!c.templateId) missing.push('template')
  if (!hasAudience(c)) missing.push('público')
  if (!c.scheduledAt) missing.push('horário')
  return missing
}

export const DRAFT_REQUIREMENTS = 3

function hasAudience(c: Campaign): boolean {
  const s = c.segment
  if (!s || !s.type) return false
  // `type: 'all'` é um público válido (toda a base); os demais precisam de
  // pelo menos um critério preenchido, senão o segmento não seleciona nada.
  if (s.type === 'all') return true
  const filled = [
    s.tagIds, s.stages, s.contactIds,
    s.filterStages, s.filterTagIds, s.filterIntent, s.filterSource, s.filterSentiment,
  ].some((v) => Array.isArray(v) && v.length > 0)
  return filled || typeof s.filterOptIn === 'boolean' ||
    typeof s.filterHasConversations === 'boolean' || Boolean(s.filterContactSearch)
}

/**
 * Segmentos DISJUNTOS do funil de uma campanha enviada.
 *
 * `CampaignStats` é cumulativo — `delivered`, `read` e `replied` são subconjuntos
 * encadeados de `sent` (é assim que `CampaignReport.tsx` calcula as taxas:
 * `delivered/sent`, `read/sent`, `replied/read`). Empilhar os três crus numa
 * barra somaria bem mais que 100%. Aqui cada faixa vira a diferença para a
 * seguinte, que é o que a barra do mockup mostra de fato.
 *
 * `null` quando não houve envio — barra vazia não é informação.
 */
export function funnelSegments(c: Campaign): StackedBarSegment[] | null {
  const s = c.stats
  if (!s) return null
  const sent = s.sent ?? 0
  if (sent <= 0) return null

  const delivered = clamp(s.delivered ?? 0, 0, sent)
  const read = clamp(s.read ?? 0, 0, delivered)
  const replied = clamp(s.replied ?? 0, 0, read)
  const failed = Math.max(0, s.failed ?? 0)

  const segments: StackedBarSegment[] = [
    { value: replied,             color: 'blue',   label: 'Respondeu'    },
    { value: read - replied,      color: 'violet', label: 'Lida'         },
    { value: delivered - read,    color: 'brand',  label: 'Entregue'     },
    { value: sent - delivered,    color: 'muted',  label: 'Não entregue' },
    { value: failed,              color: 'rose',   label: 'Falhou'       },
  ]
  return segments.filter((seg) => seg.value > 0)
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/** Progresso de uma campanha em envio. `null` quando o total ainda não existe. */
export function sendingProgress(c: Campaign): { sent: number; total: number; pct: number } | null {
  const total = c.stats?.total ?? 0
  if (total <= 0) return null
  const sent = clamp(c.stats?.sent ?? 0, 0, total)
  return { sent, total, pct: (sent / total) * 100 }
}
