// ─── Command Deck · formatação compartilhada ───────────────────────────────
// Helpers usados por PersonaCard, DeckAttention e LiveFeed. Ficam aqui (e não
// dentro de um componente) porque os três precisam da MESMA regra de tempo
// relativo — o mockup mistura "há 40s", "há 3 min" e "2d" na mesma tela, e
// duas implementações divergiriam na primeira mudança.

import type { Accent } from '@/components/ui/accentColor'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Milissegundos decorridos desde `iso`; `null` quando a data não existe ou
 *  não parseia (não assume "agora" nem 0 — quem chama decide o que mostrar). */
export function elapsedSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Date.now() - t)
}

/** Dias inteiros desde `iso` (`null` se a data não existe). */
export function daysSince(iso: string | null | undefined): number | null {
  const ms = elapsedSince(iso)
  return ms === null ? null : Math.floor(ms / DAY)
}

/** "agora" · "há 40s" · "há 3 min" · "há 2h" · "há 5d" — formato do feed e da
 *  linha ao vivo do mockup (`.ft`/`.dim`). */
export function relativeTime(iso: string | null | undefined): string {
  const ms = elapsedSince(iso)
  if (ms === null) return '—'
  if (ms < 10_000) return 'agora'
  if (ms < MINUTE) return `há ${Math.floor(ms / 1000)}s`
  if (ms < HOUR) return `há ${Math.floor(ms / MINUTE)} min`
  if (ms < DAY) return `há ${Math.floor(ms / HOUR)}h`
  return `há ${Math.floor(ms / DAY)}d`
}

/** Valor + unidade separados para o rodapé da persona, onde a unidade vai num
 *  `<small>` menor (`.foot .v small` do mockup). */
export interface MetricParts {
  value: string
  unit?: string
}

/** 58s · 1m42 · 2h — mesma leitura de "Resposta" no mockup. */
export function formatDuration(seconds: number | null | undefined): MetricParts {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return { value: '—' }
  if (seconds < 60) return { value: String(Math.round(seconds)), unit: 's' }
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return { value: s > 0 ? `${m}m${String(s).padStart(2, '0')}` : String(m), unit: s > 0 ? undefined : 'm' }
  }
  return { value: String(Math.floor(seconds / 3600)), unit: 'h' }
}

/** Percentual inteiro, ou "—" quando o denominador é 0 (uma taxa sem base não
 *  é 0%, é desconhecida — mostrar 0% mentiria sobre o agente). */
export function formatPct(numerator: number, denominator: number): MetricParts {
  if (!denominator) return { value: '—' }
  return { value: String(Math.round((numerator / denominator) * 100)), unit: '%' }
}

/** Acento categórico estável por agente — o mockup dá uma cor diferente a cada
 *  persona (`--tc`) sem que exista campo de cor no `AgentConfig`. Derivar do id
 *  mantém a cor constante entre reloads sem inventar persistência nova. */
const PERSONA_ACCENTS: Accent[] = ['blue', 'violet', 'green', 'amber', 'rose', 'cyan']

export function personaAccent(agentId: string): Accent {
  let hash = 0
  for (let i = 0; i < agentId.length; i++) hash = (hash * 31 + agentId.charCodeAt(i)) >>> 0
  return PERSONA_ACCENTS[hash % PERSONA_ACCENTS.length]
}

/** Inicial exibida no avatar tingido (`.av.tint` do mockup). */
export function personaInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed[0].toUpperCase() : '?'
}

// ── Rascunho ──────────────────────────────────────────────────────────────

/** Etapas do wizard de criação (AgentBuilderWizard) — denominador da barra de
 *  progresso do card de rascunho. */
export const WIZARD_STEPS = 8

/** Quantas etapas do rascunho já têm valor em `wizard_config`. `null` quando o
 *  agente não tem `wizard_config` nenhum: aí o card mostra o rascunho sem
 *  barra, em vez de afirmar "0 de 8" sobre um progresso desconhecido. */
export function draftProgress(wizardConfig: Record<string, unknown> | undefined): number | null {
  if (!wizardConfig || typeof wizardConfig !== 'object') return null
  const filled = Object.values(wizardConfig).filter((v) => {
    if (v === null || v === undefined || v === '') return false
    if (Array.isArray(v)) return v.length > 0
    return true
  }).length
  return Math.min(WIZARD_STEPS, filled)
}
