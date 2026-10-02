import type { Deal } from '@/types'
import { stuckDaysInStage } from './dealCard'
import { diaDaPrevisao } from './previsaoDeFechamento'

/**
 * Lentes do funil (direção C · Quadro + lentes, decisão do PO de 27/09).
 *
 * Recortes prontos que valem para o Quadro e para a Lista — respondem às
 * perguntas de todo dia sem montar filtro: o que está esfriando, o que não tem
 * previsão, o que já passou da previsão, o que é meu. Tudo sobre os negócios
 * que o quadro já carregou; nenhuma chamada nova.
 *
 * "Esfriando" usa o mesmo sinal do card (`stuckDaysInStage`). A regra decidida
 * (limite por etapa, zerado também por mensagem na conversa) depende do backend
 * — itens F4/F5 do SCRUM-1161; até lá vale o limite único de hoje.
 */
export type FunnelLens = 'todos' | 'esfriando' | 'sem-previsao' | 'previsao-vencida' | 'meus'

export const FUNNEL_LENSES: ReadonlyArray<{ id: FunnelLens; label: string; hint: string }> = [
  { id: 'todos', label: 'Todos', hint: 'Todos os negócios deste funil' },
  { id: 'esfriando', label: 'Esfriando', hint: 'Abertos há muitos dias na mesma etapa' },
  { id: 'sem-previsao', label: 'Sem previsão', hint: 'Abertos sem data prevista de fechamento' },
  { id: 'previsao-vencida', label: 'Previsão vencida', hint: 'Abertos cuja data prevista já passou' },
  { id: 'meus', label: 'Meus', hint: 'Negócios em que você é o responsável' },
]

export function isFunnelLens(v: string | null | undefined): v is FunnelLens {
  return !!v && FUNNEL_LENSES.some((l) => l.id === v)
}

type LensDeal = Pick<Deal, 'status' | 'expectedCloseAt' | 'ownerUserId' | 'stageEnteredAt' | 'updatedAt' | 'createdAt'>

/**
 * O negócio entra na lente? As lentes de previsão e de esfriar só olham
 * negócios ABERTOS — o fechado já tem desfecho, e contá-lo como "vencido"
 * ou "esfriando" seria alarme falso. "Todos" e "Meus" valem para qualquer um.
 */
export function matchesLens(deal: LensDeal, lens: FunnelLens, userId: string | null | undefined, now: Date = new Date()): boolean {
  switch (lens) {
    case 'todos':
      return true
    case 'meus':
      return !!userId && deal.ownerUserId === userId
    case 'esfriando':
      return stuckDaysInStage(deal, now.getTime()) !== null
    case 'sem-previsao':
      return deal.status === 'open' && !deal.expectedCloseAt
    case 'previsao-vencida': {
      if (deal.status !== 'open' || !deal.expectedCloseAt) return false
      const t = diaDaPrevisao(deal.expectedCloseAt)?.getTime() ?? NaN
      if (!Number.isFinite(t)) return false
      const inicioDoDia = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      return t < inicioDoDia
    }
  }
}

/** Quantos negócios cada lente mostraria — os números dos chips. */
export function lensCounts(deals: ReadonlyArray<LensDeal>, userId: string | null | undefined, now: Date = new Date()): Record<FunnelLens, number> {
  const out: Record<FunnelLens, number> = { todos: 0, esfriando: 0, 'sem-previsao': 0, 'previsao-vencida': 0, meus: 0 }
  for (const d of deals) {
    for (const l of FUNNEL_LENSES) if (matchesLens(d, l.id, userId, now)) out[l.id] += 1
  }
  return out
}

/** Janela padrão dos fechados no quadro (decisão D4 do PO, 27/09). */
export const CLOSED_WINDOW_DAYS = 30

/**
 * O fechado aparece no quadro? Só os fechados nos últimos 30 dias, a menos que
 * o usuário peça "ver todos". Sem `closedAt` (dado antigo) conta como recente,
 * para nunca sumir um fechado que o quadro não sabe datar.
 */
export function isRecentlyClosed(deal: Pick<Deal, 'status' | 'closedAt'>, now: Date = new Date()): boolean {
  if (deal.status === 'open') return true
  if (!deal.closedAt) return true
  const t = new Date(deal.closedAt).getTime()
  if (!Number.isFinite(t)) return true
  return now.getTime() - t <= CLOSED_WINDOW_DAYS * 86_400_000
}
