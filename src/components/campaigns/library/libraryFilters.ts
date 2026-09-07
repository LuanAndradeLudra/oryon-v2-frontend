// ─── libraryFilters ────────────────────────────────────────────────────────
// Modelo de filtros da Biblioteca de templates (D4/SCRUM-1023): o que o rail
// da esquerda oferece, quantos há em cada opção, e o que a grade mostra.
// Puro, sem I/O — a tela só monta o que sai daqui.
//
// A regra que governa o arquivo inteiro é a do épico: não inventar dado. Um
// grupo cujo dado não existe (uso, sem BE.8) não aparece; uma opção sem
// nenhum template (situação nunca usada pela conta) não aparece. Número que
// mente é pior que número ausente.
import type { TemplateCategoryType, TemplateStatus, WhatsAppTemplate } from '@/types'
import { lineMatches, type LineFilterValue } from '@/components/common/LineFilterChip'

export type UsageFilter = 'all' | 'never_used' | 'used_by_automation'

export interface LibraryFilters {
  search: string
  status: TemplateStatus | 'all'
  category: TemplateCategoryType | 'all'
  language: string | 'all'
  usage: UsageFilter
  line: LineFilterValue
}

export const EMPTY_FILTERS: LibraryFilters = {
  search: '',
  status: 'all',
  category: 'all',
  language: 'all',
  usage: 'all',
  line: 'all',
}

/** Uso por template, vindo de `GET /templates?withUsage=1` (BE.8). O mapa
 *  INTEIRO ausente significa "BE.8 não está no ar" — diferente de um mapa
 *  vazio, que significaria "nenhum template foi usado". A diferença decide
 *  se o grupo "Uso" existe no rail. */
export type UsageMap = Map<string, { usageCount: number; lastUsedAt: string | null }>

export interface LibraryContext {
  usage?: UsageMap
  /** Ids de template citados por alguma automação (`send_message`). É o
   *  único vínculo real que existe hoje: agente não referencia template em
   *  lugar nenhum do produto. */
  automationTemplateIds: Set<string>
}

export const EMPTY_CONTEXT: LibraryContext = { automationTemplateIds: new Set() }

// ── Predicados por eixo ────────────────────────────────────────────────────

/** Busca sem acento e sem caixa: quem procura "promocao" precisa achar
 *  "promoção", senão a busca só serve para quem digita igual ao banco. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** O nome do template é `snake_case` técnico (`novo_lancamento_v2`), então
 *  procurar só nele obriga a pessoa a lembrar do identificador. Casar o corpo
 *  também é o que ela espera quando lembra do texto da mensagem. */
function matchesSearch(template: WhatsAppTemplate, search: string): boolean {
  const term = fold(search.trim())
  if (!term) return true
  return fold(template.name).includes(term) || fold(template.body).includes(term)
}

function matchesUsage(template: WhatsAppTemplate, usage: UsageFilter, ctx: LibraryContext): boolean {
  if (usage === 'all') return true
  if (usage === 'used_by_automation') return ctx.automationTemplateIds.has(template.id)
  // `never_used` sem dado de uso não é "todos": é uma pergunta que não dá
  // para responder. O grupo nem aparece no rail nesse caso (ver `buildRail`),
  // e aqui a resposta honesta é não afirmar nada.
  if (!ctx.usage) return false
  return (ctx.usage.get(template.id)?.usageCount ?? 0) === 0
}

type Axis = 'search' | 'status' | 'category' | 'language' | 'usage' | 'line'

/** Casa o template com todos os eixos MENOS o indicado. É o que permite as
 *  contagens do rail baterem com a grade: o grupo "Situação" precisa dizer
 *  quantos há em cada situação DENTRO do resto do filtro corrente, não na
 *  base inteira. Contar sem excluir o próprio eixo é o erro clássico de rail
 *  de faceta — os números somam mais do que a grade mostra. */
function matchesExcept(
  template: WhatsAppTemplate,
  filters: LibraryFilters,
  ctx: LibraryContext,
  except?: Axis,
): boolean {
  if (except !== 'search' && !matchesSearch(template, filters.search)) return false
  if (except !== 'status' && filters.status !== 'all' && template.status !== filters.status) return false
  if (except !== 'category' && filters.category !== 'all' && template.category !== filters.category) return false
  if (except !== 'language' && filters.language !== 'all' && template.language !== filters.language) return false
  if (except !== 'usage' && !matchesUsage(template, filters.usage, ctx)) return false
  if (except !== 'line' && !lineMatches(filters.line, { whatsappNumberId: template.whatsappNumberId })) return false
  return true
}

export function applyFilters(
  templates: WhatsAppTemplate[],
  filters: LibraryFilters,
  ctx: LibraryContext = EMPTY_CONTEXT,
): WhatsAppTemplate[] {
  return templates.filter((t) => matchesExcept(t, filters, ctx))
}

// ── Ordenação ──────────────────────────────────────────────────────────────

export type SortKey = 'usage' | 'updated'

/** Sem BE.8 não existe uso, então ordenar "por uso" seria inventar um
 *  critério. A tela rotula o que está fazendo de verdade. */
export function sortKeyFor(ctx: LibraryContext): SortKey {
  return ctx.usage ? 'usage' : 'updated'
}

export function sortTemplates(
  templates: WhatsAppTemplate[],
  ctx: LibraryContext = EMPTY_CONTEXT,
): WhatsAppTemplate[] {
  const byUpdated = (a: WhatsAppTemplate, b: WhatsAppTemplate) => b.updatedAt.localeCompare(a.updatedAt)
  if (!ctx.usage) return [...templates].sort(byUpdated)
  return [...templates].sort((a, b) => {
    const ua = ctx.usage?.get(a.id)?.usageCount ?? 0
    const ub = ctx.usage?.get(b.id)?.usageCount ?? 0
    // Empate em zero é o caso comum numa conta nova: cair para a atualização
    // deixa a ordem estável e útil em vez de arbitrária.
    return ub - ua || byUpdated(a, b)
  })
}

// ── Rail ───────────────────────────────────────────────────────────────────

export interface RailOption<T extends string = string> {
  value: T
  label: string
  count: number
}

export interface RailGroup {
  /** Eixo que o grupo controla — a tela usa para saber o que despachar. */
  axis: Exclude<Axis, 'search'>
  title: string
  options: RailOption[]
}

const STATUS_LABELS: Record<TemplateStatus, string> = {
  APPROVED: 'Aprovados',
  PENDING:  'Em análise',
  REJECTED: 'Rejeitados',
  PAUSED:   'Pausados',
  DISABLED: 'Desativados',
}

/** Ordem do mockup. `PAUSED`/`DISABLED` não estão desenhados lá porque a
 *  conta do mockup não tem nenhum — aqui eles entram só quando existem. */
const STATUS_ORDER: TemplateStatus[] = ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED']

const CATEGORY_ORDER: TemplateCategoryType[] = ['MARKETING', 'UTILITY', 'AUTHENTICATION']

const CATEGORY_LABELS: Record<TemplateCategoryType, string> = {
  MARKETING:      'Marketing',
  UTILITY:        'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

export interface BuildRailOptions {
  /** Rótulo legível de um código de idioma (`pt_BR` → "Português (Brasil)"). */
  languageLabel: (code: string) => string
  /** Conta com mais de uma linha WhatsApp: só aí o grupo "Linha" faz sentido.
   *  Mesma regra do `LineFilterChip`, que se esconde sozinho abaixo de 2. */
  lines?: { id: string; label: string }[]
}

/** Monta os grupos do rail já com as contagens certas. Cada opção conta os
 *  templates que casam com o filtro corrente MENOS o próprio eixo. */
export function buildRail(
  templates: WhatsAppTemplate[],
  filters: LibraryFilters,
  ctx: LibraryContext,
  { languageLabel, lines = [] }: BuildRailOptions,
): RailGroup[] {
  const countWhere = (axis: Axis, predicate: (t: WhatsAppTemplate) => boolean) =>
    templates.filter((t) => matchesExcept(t, filters, ctx, axis) && predicate(t)).length

  const groups: RailGroup[] = []

  // ── Status ──
  const statusOptions: RailOption[] = [
    { value: 'all', label: 'Todos', count: countWhere('status', () => true) },
  ]
  for (const status of STATUS_ORDER) {
    const count = countWhere('status', (t) => t.status === status)
    // Pausado e desativado só aparecem quando a conta tem algum — some numa
    // conta saudável, e não esconde de quem tem.
    const alwaysVisible = status === 'APPROVED' || status === 'PENDING' || status === 'REJECTED'
    if (count > 0 || alwaysVisible) {
      statusOptions.push({ value: status, label: STATUS_LABELS[status], count })
    }
  }
  groups.push({ axis: 'status', title: 'Status Meta', options: statusOptions })

  // ── Categoria ── só as que a conta usa
  const categoryOptions = CATEGORY_ORDER
    .map((category) => ({
      value: category,
      label: CATEGORY_LABELS[category],
      count: countWhere('category', (t) => t.category === category),
    }))
    .filter((o) => o.count > 0)
  if (categoryOptions.length > 0) {
    groups.push({ axis: 'category', title: 'Categoria', options: categoryOptions })
  }

  // ── Idioma ── só os presentes, em ordem de volume
  const languages = [...new Set(templates.map((t) => t.language))]
  const languageOptions = languages
    .map((code) => ({
      value: code,
      label: languageLabel(code),
      count: countWhere('language', (t) => t.language === code),
    }))
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  // Um idioma só não é filtro: não há o que escolher.
  if (languageOptions.length > 1) {
    groups.push({ axis: 'language', title: 'Idioma', options: languageOptions })
  }

  // ── Uso ──
  const usageOptions: RailOption[] = []
  const automationCount = countWhere('usage', (t) => ctx.automationTemplateIds.has(t.id))
  if (automationCount > 0) {
    // "Usados por agentes" do mockup não tem dado: nenhum agente referencia
    // template no produto. Automação referencia, então é o que a tela oferece.
    usageOptions.push({ value: 'used_by_automation', label: 'Usados em automações', count: automationCount })
  }
  if (ctx.usage) {
    usageOptions.push({
      value: 'never_used',
      label: 'Nunca usados',
      count: countWhere('usage', (t) => (ctx.usage?.get(t.id)?.usageCount ?? 0) === 0),
    })
  }
  if (usageOptions.length > 0) {
    groups.push({ axis: 'usage', title: 'Uso', options: usageOptions })
  }

  // ── Linha ── só em conta multilinha
  if (lines.length > 1) {
    const lineOptions: RailOption[] = [
      { value: 'all', label: 'Todas as linhas', count: countWhere('line', () => true) },
      ...lines.map((line) => ({
        value: line.id,
        label: line.label,
        count: countWhere('line', (t) => lineMatches(line.id, { whatsappNumberId: t.whatsappNumberId })),
      })),
    ]
    groups.push({ axis: 'line', title: 'Linha', options: lineOptions })
  }

  return groups
}

/** Um valor de filtro pode deixar de existir enquanto está selecionado — a
 *  sincronização com a Meta apaga o último rejeitado, e o rail perde a opção.
 *  Sem isto a grade fica vazia com um filtro invisível ligado. */
export function reconcileFilters(filters: LibraryFilters, rail: RailGroup[]): LibraryFilters {
  const next = { ...filters }
  for (const group of rail) {
    const current = next[group.axis]
    if (current === 'all') continue
    if (!group.options.some((o) => o.value === current)) {
      next[group.axis] = 'all'
    }
  }
  // Um eixo que sumiu do rail inteiro (grupo "Uso" some quando o BE.8 cai)
  // também precisa voltar para "all".
  const axes = new Set(rail.map((g) => g.axis))
  for (const axis of ['status', 'category', 'language', 'usage', 'line'] as const) {
    if (!axes.has(axis) && next[axis] !== 'all') next[axis] = 'all'
  }
  return next
}
