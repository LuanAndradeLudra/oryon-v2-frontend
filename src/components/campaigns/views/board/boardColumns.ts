// ─── As colunas do quadro (D1b · SCRUM-1019) ───────────────────────────────
// A regra pura da tela: qual campanha cai em qual coluna, em que ordem, e
// onde a coluna corta. Sem React aqui.
//
// A frase do mockup que manda em tudo: "Gargalos ficam visíveis pela altura
// das colunas." É por isso que as colunas CORTAM (`+ N anteriores`) em vez de
// rolar por dentro — coluna que rola tem sempre a mesma altura, e a tela
// perderia a única coisa que ela faz e a Lista não faz.
import type { Campaign, CampaignStatus } from '@/types'
import { statusRank } from '../agenda/agendaStatus'

export type BoardColumnId = 'draft' | 'scheduled' | 'sending' | 'sent' | 'unfinished'

export interface BoardColumnDef {
  id: BoardColumnId
  label: string
  /** Os status que caem aqui. */
  statuses: readonly CampaignStatus[]
  /** De qual status sai a cor do ponto do cabeçalho. */
  dot: CampaignStatus
  /** Colunas tintadas no mockup: Enviando âmbar, a última vermelha. */
  accent?: 'sending' | 'danger'
  /**
   * `asc` = o próximo a acontecer primeiro; `desc` = o mais recente primeiro.
   * Colunas de futuro sobem, colunas de passado descem.
   */
  order: 'asc' | 'desc'
  /**
   * Desempata pelo status ANTES da data. Só faz sentido onde os status
   * misturados são estados ATIVOS e a diferença entre eles é operacional:
   * uma fila correndo precisa do olho, uma parada já parou.
   *
   * Achado do Nível: isto era inferido de `statuses.length > 1`, e a inferência
   * alcançava também a coluna "Não concluída" — que o comentário não
   * justificava e nenhum teste via. Lá os dois status são TERMINAIS: uma falha
   * de três dias atrás não tem por que passar na frente de um cancelamento de
   * hoje, e a coluna promete `desc` (mais recente primeiro). A regra passa a
   * ser declarada por coluna em vez de deduzida da forma do dado.
   */
  tiebreakByStatus?: true
}

/**
 * Cinco colunas, sete status. O mockup foi desenhado antes da BE.2 e não tem
 * onde pôr `paused` nem `cancelled`:
 *
 * - `paused` vai com `sending` porque é um envio INTERROMPIDO, não um estado
 *   inerte. O cartão já se separa sozinho (borda âmbar tracejada, barra parada
 *   e "fila parada" — #136), e a contagem do cabeçalho conta os dois.
 * - `cancelled` vai com `failed` na última coluna. Omiti-lo faria um disparo
 *   cancelado no meio do envio DESAPARECER da coluna Enviando sem deixar
 *   rastro — o mesmo motivo pelo qual ele continua aparecendo na Agenda.
 *
 * O rótulo da última coluna não é "Falhou" nem "Não saiu": uma campanha
 * cancelada no meio do envio JÁ ENTREGOU parte dos destinatários, e os dois
 * rótulos afirmariam que nada saiu justamente quando algo saiu. "Não
 * concluída" é verdadeiro para a que falhou e para a cancelada parcial, sem
 * afirmar o que não aconteceu. (Decisão do Maestro, 2026-09-06.)
 */
export const BOARD_COLUMNS: readonly BoardColumnDef[] = [
  { id: 'draft',      label: 'Rascunho',       statuses: ['draft'],                dot: 'draft',     order: 'desc' },
  { id: 'scheduled',  label: 'Agendada',       statuses: ['scheduled'],            dot: 'scheduled', order: 'asc'  },
  { id: 'sending',    label: 'Enviando',       statuses: ['sending', 'paused'],    dot: 'sending',   order: 'asc',  accent: 'sending', tiebreakByStatus: true },
  { id: 'sent',       label: 'Enviada',        statuses: ['sent'],                 dot: 'sent',      order: 'desc' },
  { id: 'unfinished', label: 'Não concluída',  statuses: ['failed', 'cancelled'],  dot: 'failed',    order: 'desc', accent: 'danger' },
] as const

/**
 * Quantos cartões uma coluna mostra antes de cortar. A janela traz até 300
 * campanhas e a maioria delas está em `sent`; sem corte, a coluna Enviada
 * seria uma tira de 200 cartões e a altura pararia de significar gargalo.
 */
export const COLUMN_CAP = 8

export interface BoardColumn {
  def: BoardColumnDef
  /** Todas as campanhas da coluna, já ordenadas. A contagem do cabeçalho é o tamanho disto. */
  cards: Campaign[]
}

/**
 * O instante pelo qual a campanha se ordena dentro da coluna. `sentAt` quando
 * aconteceu, `scheduledAt` quando vai acontecer, e `createdAt` para o rascunho,
 * que não tem nem uma coisa nem outra.
 */
function sortTime(c: Campaign): number | null {
  const raw = c.sentAt ?? c.scheduledAt ?? c.createdAt
  if (!raw) return null
  const t = Date.parse(raw)
  return Number.isNaN(t) ? null : t
}

/**
 * Campanha sem data nenhuma AFUNDA, nos dois sentidos de ordenação: ela não é
 * compromisso para momento nenhum, e pô-la no topo de uma coluna que ascende
 * faria a próxima coisa a acontecer ser uma que não tem quando.
 */
function compareIn(def: BoardColumnDef, a: Campaign, b: Campaign): number {
  // Só onde a coluna DECLARA o desempate: enviando antes de pausada, porque
  // uma fila correndo é o que precisa de olho. Na coluna do que não concluiu,
  // os dois status são terminais e quem manda é a data.
  if (def.tiebreakByStatus) {
    const r = statusRank(a.status) - statusRank(b.status)
    if (r !== 0) return r
  }
  const ta = sortTime(a)
  const tb = sortTime(b)
  if (ta === null && tb === null) return 0
  if (ta === null) return 1
  if (tb === null) return -1
  return def.order === 'asc' ? ta - tb : tb - ta
}

/** Agrupa a janela nas cinco colunas e ordena cada uma. Não corta — ver `capped`. */
export function buildBoard(campaigns: Campaign[]): BoardColumn[] {
  const byId = new Map<BoardColumnId, Campaign[]>(BOARD_COLUMNS.map((d) => [d.id, []]))
  const columnOf = new Map<CampaignStatus, BoardColumnId>()
  for (const def of BOARD_COLUMNS) {
    for (const s of def.statuses) columnOf.set(s, def.id)
  }

  for (const c of campaigns) {
    const id = columnOf.get(c.status)
    // Status que o quadro não conhece não some em silêncio: ele cai na coluna
    // que existe para o que não terminou bem, que é a leitura menos errada.
    byId.get(id ?? 'unfinished')!.push(c)
  }

  return BOARD_COLUMNS.map((def) => ({
    def,
    cards: byId.get(def.id)!.sort((a, b) => compareIn(def, a, b)),
  }))
}

/** Os cartões que a coluna mostra, e quantos ficaram de fora. */
export function capped(cards: Campaign[], expanded: boolean): { shown: Campaign[]; hidden: number } {
  if (expanded || cards.length <= COLUMN_CAP) return { shown: cards, hidden: 0 }
  return { shown: cards.slice(0, COLUMN_CAP), hidden: cards.length - COLUMN_CAP }
}
