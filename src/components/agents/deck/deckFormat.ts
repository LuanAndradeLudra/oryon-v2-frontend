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

/** 58s · 1m42 · 2h — mesma leitura da métrica de duração do mockup.
 *
 *  O arredondamento acontece UMA vez, no total de segundos, antes de decompor
 *  em minutos e segundos. Arredondar o resto depois da divisão produzia
 *  carimbos impossíveis quando o valor chega fracionado do backend
 *  (`avgTimeToHumanResponseSec` é média, então vem float): 59.6 virava "60s", 119.6
 *  virava "1m60" e 3599.8 virava "59m60". */
export function formatDuration(seconds: number | null | undefined): MetricParts {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return { value: '—' }
  const total = Math.round(seconds)
  if (total < 60) return { value: String(total), unit: 's' }
  if (total < 3600) {
    const m = Math.floor(total / 60)
    const s = total % 60
    return { value: s > 0 ? `${m}m${String(s).padStart(2, '0')}` : String(m), unit: s > 0 ? undefined : 'm' }
  }
  return { value: String(Math.floor(total / 3600)), unit: 'h' }
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

/** As etapas do wizard que têm critério objetivo de "preenchida" — as mesmas
 *  cinco que `useStudioDraft.validate()` exige para avançar. O wizard tem oito
 *  telas, mas três delas (passar para humano, base de conhecimento, revisão)
 *  não têm campo obrigatório: contá-las exigiria inventar um critério, e um
 *  denominador de 8 com três etapas que ninguém sabe medir daria um número
 *  bonito e falso. Por isso a barra conta 5, e o card diz "de 5". */
const DRAFT_STEPS = [
  'identidade',
  'personalidade',
  'escopo',
  'negócio',
  'prompt',
] as const

export const WIZARD_STEPS = DRAFT_STEPS.length

export interface DraftProgress {
  done: number
  total: number
}

/** Estrutura que o wizard grava em `agent_configs.wizard_config` — aninhada
 *  por seção (`useStudioDraft`), não plana. */
interface WizardConfigShape {
  identity?: { name?: unknown; sector?: unknown; objective?: unknown }
  personality?: { tone?: unknown }
  scope?: { can_do?: unknown }
  business?: { company_name?: unknown; company_description?: unknown }
}

const preenchido = (v: unknown): boolean =>
  typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : false

/**
 * Progresso do rascunho, contado por ETAPA com o mesmo critério que o wizard
 * usa para deixar o usuário avançar. `null` quando o `wizard_config` não tem
 * nenhuma das seções conhecidas — aí o card aparece sem barra, em vez de
 * afirmar um progresso que ninguém consegue verificar.
 *
 * A versão anterior contava CAMPOS sobre um denominador de ETAPAS e tratava
 * qualquer valor não-vazio como preenchido, inclusive `false`. Como o
 * `wizard_config` real é aninhado em cinco seções, um rascunho recém-criado
 * contava as seções como cinco campos preenchidos e a barra nascia quase
 * cheia — no estado inicial, que é justamente onde o card de rascunho vive.
 *
 * `businessHubFilled` reproduz o caminho alternativo que o `validate()` do
 * `useStudioDraft` aceita na etapa de negócio (case 4): o Company Context Hub
 * substitui nome e descrição da empresa. Sem ele, quem preencheu o negócio pelo
 * hub fica parado em "4 de 5" para sempre, porque não há como fechar a etapa
 * pelo formulário — a barra afirmaria um estado inalcançável.
 */
export function draftProgress(
  wizardConfig: Record<string, unknown> | undefined,
  systemPrompt?: string | null,
  businessHubFilled = false,
): DraftProgress | null {
  if (!wizardConfig || typeof wizardConfig !== 'object') return null
  const cfg = wizardConfig as WizardConfigShape
  const conhecido = ['identity', 'personality', 'scope', 'business'].some((k) => k in cfg)
  if (!conhecido) return null

  let done = 0
  const id = cfg.identity
  if (id && preenchido(id.name) && preenchido(id.sector) && preenchido(id.objective)) done++
  if (cfg.personality && preenchido(cfg.personality.tone)) done++
  if (cfg.scope && preenchido(cfg.scope.can_do)) done++
  if (businessHubFilled
    || (cfg.business && preenchido(cfg.business.company_name) && preenchido(cfg.business.company_description))) done++
  if (preenchido(systemPrompt)) done++

  return { done, total: WIZARD_STEPS }
}
