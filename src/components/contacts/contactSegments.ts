import type { ContactFilters } from '@/types'

/**
 * Segmentos da lista de Leads/Contatos — SCRUM-1097, Direção A (decisão #33).
 *
 * Só entra como `available: true` o que a API de contatos sustenta HOJE
 * (ACHADOS-API-CONTATOS-SEGMENTOS.md): "nada fingido" — uma aba que mostra a
 * lista inteira com outro nome mente. Os demais ficam declarados aqui, com o
 * motivo, para a tela renderizá-los como card "em breve" (ou omiti-los) e
 * para não se perder a definição quando o backend chegar.
 */
export type SegmentKey = 'all' | 'hot' | 'mine' | 'unanswered' | 'newToday'

export interface ContactSegment {
  key: SegmentKey
  label: string
  /** Filtros/ordenação que o segmento aplica sobre `GET /contacts`. Vazio quando indisponível. */
  params: Pick<ContactFilters, 'intent' | 'sortBy' | 'sortDir'>
  available: boolean
  /** Por que não dá hoje e o que destrava (só quando `available === false`). */
  unavailableReason?: string
}

export const CONTACT_SEGMENTS: readonly ContactSegment[] = [
  {
    key: 'all',
    label: 'Todos',
    // "Ordenado por última interação". ATENÇÃO: no Postgres, ORDER BY ... DESC
    // põe lastContactedAt NULL primeiro (o service não passa NULLS LAST) —
    // contatos sem conversa sobem ao topo. Pendência de backend registrada no
    // doc de achados; até lá o topo da lista pode trazer contatos sem interação.
    params: { sortBy: 'lastContactedAt', sortDir: 'desc' },
    available: true,
  },
  {
    key: 'hot',
    label: 'Quentes',
    // Definição: intenção alta (`intent=high`). Faixa por lead score (≥ X) não
    // existe no servidor — o front manda `leadScoreBand` e o backend ignora.
    params: { intent: 'high', sortBy: 'leadScore', sortDir: 'desc' },
    available: true,
  },
  {
    key: 'mine',
    label: 'Meus',
    params: {},
    available: false,
    unavailableReason:
      'Contato não tem responsável: ele vive na conversa (assignedUserId) e no negócio. Precisa do filtro assignedTo em GET /contacts e do lastConversation enriquecido.',
  },
  {
    key: 'unanswered',
    label: 'Sem resposta',
    params: {},
    available: false,
    unavailableReason:
      'Precisa de awaitingReply em GET /contacts com critério fiel (última mensagem do cliente). O filtro de conversas só conta resposta de humano e trataria conversa respondida pela IA como sem resposta.',
  },
  {
    key: 'newToday',
    label: 'Novos hoje',
    params: {},
    available: false,
    unavailableReason:
      'Não há filtro de data no servidor; contar no cliente só é exato até 99 por dia. Espera o param createdFrom em GET /contacts.',
  },
]

export function getSegment(key: SegmentKey): ContactSegment {
  const seg = CONTACT_SEGMENTS.find((s) => s.key === key)
  if (!seg) throw new Error(`Segmento desconhecido: "${String(key)}"`)
  return seg
}

/** Segmentos que a API sustenta hoje — as abas de verdade. */
export function availableSegments(): ContactSegment[] {
  return CONTACT_SEGMENTS.filter((s) => s.available)
}

/**
 * Filtros de `contactsApi.list` para um segmento, sobre os filtros que o
 * usuário já tem (busca, etapa, etiquetas…).
 *
 * - Chaves de FILTRO do segmento (`intent`) mandam: a aba "Quentes" com um
 *   filtro manual de intenção "baixa" não pode devolver uma lista que
 *   contradiz a aba.
 * - Ordenação do segmento é PADRÃO: se o usuário escolheu uma ordenação
 *   (`sortBy`), a dele vale — e `sortDir` acompanha a `sortBy` de quem a
 *   definiu, para nunca misturar a coluna de um com a direção do outro.
 * - Segmento indisponível LANÇA: devolver os filtros do usuário sem o
 *   segmento mostraria "Todos" sob o rótulo "Meus" — exatamente o fingido
 *   que a decisão #33 proíbe. Quem monta abas usa `availableSegments()`.
 */
export function buildSegmentQuery(key: SegmentKey, base: ContactFilters = {}): ContactFilters {
  const seg = getSegment(key)
  if (!seg.available) {
    throw new Error(`Segmento "${seg.label}" indisponível: ${seg.unavailableReason ?? 'sem suporte na API'}`)
  }
  const { intent, sortBy, sortDir } = seg.params
  const merged: ContactFilters = { ...base }
  if (intent !== undefined) merged.intent = intent
  if (base.sortBy === undefined) {
    if (sortBy !== undefined) merged.sortBy = sortBy
    if (sortDir !== undefined) merged.sortDir = sortDir
  }
  return merged
}

/** Argumentos de `contactsApi.list` só para o `total` da aba (1 registro). */
export function buildSegmentCountArgs(
  key: SegmentKey,
  base: ContactFilters = {},
): { filters: ContactFilters; page: 1; limit: 1 } {
  return { filters: buildSegmentQuery(key, base), page: 1, limit: 1 }
}
