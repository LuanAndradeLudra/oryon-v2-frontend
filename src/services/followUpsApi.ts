// Retomadas (06/11): os planos de ação que o gestor da rede manda para a unidade. Aqui, no app da
// unidade, cada caso tem o nome e a conversa (só para os admins da unidade). O painel do gestor vê
// os mesmos casos sem identificação.
import { api } from '@/services/api'

export type TipoDoCaso = 'sem_vaga' | 'interessado' | 'cancelou'
export type SituacaoDoPlano = 'enviado' | 'em_andamento' | 'concluido' | 'vencido' | 'cancelado'
export type DesfechoDaEquipe = 'agendou_por_telefone' | 'contato_sem_agendamento' | 'sem_resposta' | 'nao_quer' | 'numero_invalido'
export type Desfecho = DesfechoDaEquipe | 'agendou' | 'agendou_outra_unidade' | 'nao_trabalhado'

export interface ProgressoDoPlano { total: number; worked: number; booked: number; bookedReported: number; noAnswer: number; open: number }

export interface PlanoDaUnidade {
  id: string
  origin: 'manual' | 'regra'
  title: string
  orientation: string
  dueAt: string
  status: SituacaoDoPlano
  createdAt: string
  firstActionAt: string | null
  version: number
  progress: ProgressoDoPlano
  overdue: boolean
  /** 07/11: a prioridade, a meta (quantos devem marcar) e a ação que o gestor sugere. */
  priority?: 'normal' | 'urgente'
  goalBooked?: number | null
  recommendedAction?: AcaoSugeridaDoGestor | null
}

/** O que o gestor sugere à unidade: um modelo, uma etiqueta ou uma etapa do funil da unidade. */
export interface AcaoSugeridaDoGestor {
  kind: 'template' | 'tag' | 'pipeline'
  label: string
  templateName?: string
  language?: string
  tagId?: string
  pipelineId?: string
  stageId?: string | null
}

export interface ItemDoPlano {
  id: string
  caseId: string
  kind: TipoDoCaso
  specialty: string | null
  caseStatus: 'aberto' | 'resolvido' | 'encerrado' | 'expirado'
  movedToOtherPlan: boolean
  lastAskAt: string | null
  lastCancelAt: string | null
  openedAt: string
  conversationId: string | null
  contact: { id: string; name: string | null } | null
  contactDeleted: boolean
  optedOut: boolean
  outcome: Desfecho | null
  outcomeAt: string | null
  note: string | null
  /** A instrução do gestor para este caso. */
  managerNote?: string | null
  version: number
  /** O último passo neste contato (o que a equipe já fez com ele). */
  lastAction?: UltimoPasso | null
}

/** Cada passo do histórico do plano (equipe, gestor ou sistema). */
export type TipoDoHistorico = 'received' | 'outcome' | 'auto_booked' | 'template' | 'tag' | 'pipeline' | 'campaign_draft' | 'conclude' | 'edit' | 'extend' | 'cancel' | 'expire'
export interface EventoDoHistorico {
  id: string
  at: string
  kind: TipoDoHistorico
  actor: { type: 'user' | 'manager' | 'system'; name: string | null }
  contact: { itemId: string; name: string | null; deleted: boolean; conversationId: string | null } | null
  itemCount: number
  detail: Record<string, unknown>
  resultRef: string | null
}
export interface UltimoPasso { kind: TipoDoHistorico; at: string; actorName: string | null; detail: Record<string, unknown> }

export interface AcoesDisponiveis { tag: 'ok'; pipeline: 'ok' | 'not_configured'; campaign: 'ok' | 'no_line' | 'choose_line' }

export interface DetalheDoPlanoDaUnidade extends PlanoDaUnidade { items: ItemDoPlano[]; actions: AcoesDisponiveis }

export interface ConfiguracaoDasRetomadas {
  pipelineId: string | null
  stageId: string | null
  whatsappNumberId: string | null
  tagId: string | null
  notifyEmail: boolean
  /** A unidade mostra trechos mascarados das conversas dos casos ao gestor da rede. */
  shareExcerpts?: boolean
  actions?: AcoesDisponiveis
}

export interface ResultadoDaAcao { kind: 'tag' | 'pipeline' | 'campaign_draft' | 'template'; done: number; skipped: number; resultRef?: string | null; details?: Record<string, number> }

export const followUpsApi = {
  resumo: () => api.get<{ enabled: boolean; activePlans: number; openItems: number }>('/follow-ups/summary'),
  planos: (status?: SituacaoDoPlano[]) => api.get<PlanoDaUnidade[]>('/follow-ups/plans', { params: status?.length ? { status: status.join(',') } : undefined }),
  plano: (id: string) => api.get<DetalheDoPlanoDaUnidade>(`/follow-ups/plans/${id}`),
  desfecho: (itemId: string, outcome: DesfechoDaEquipe, opts: { note?: string; version?: number } = {}) =>
    api.patch<{ done: number; skipped: Array<{ id: string; reason: string }> }>(`/follow-ups/items/${itemId}`, { outcome, ...opts }),
  desfechoEmLote: (planId: string, itemIds: string[], outcome: DesfechoDaEquipe) =>
    api.post<{ done: number; skipped: Array<{ id: string; reason: string }> }>(`/follow-ups/plans/${planId}/items/bulk`, { itemIds, outcome }),
  acao: (planId: string, kind: ResultadoDaAcao['kind'], itemIds?: string[], params?: Record<string, unknown>) =>
    api.post<ResultadoDaAcao>(`/follow-ups/plans/${planId}/actions`, { kind, ...(itemIds?.length ? { itemIds } : {}), ...(params ? { params } : {}) }),
  concluir: (planId: string) => api.post<{ id: string; status: 'concluido' }>(`/follow-ups/plans/${planId}/conclude`),
  historico: (planId: string) => api.get<{ data: EventoDoHistorico[] }>(`/follow-ups/plans/${planId}/history`),
  /** O modelo para UM contato do plano: o mesmo envio de Contatos, registrado no histórico do plano. */
  enviarModelo: (planId: string, itemId: string, p: { templateName: string; language: string; variables: string[]; idempotencyKey: string }) =>
    api.post<ResultadoDaAcao>(`/follow-ups/plans/${planId}/actions`, { kind: 'template', itemIds: [itemId], params: p }),
  configuracao: () => api.get<ConfiguracaoDasRetomadas>('/follow-ups/settings'),
  salvarConfiguracao: (p: Partial<Omit<ConfiguracaoDasRetomadas, 'actions'>>) => api.put<ConfiguracaoDasRetomadas>('/follow-ups/settings', p),
}

/** O código estável do erro da API (o app decide a frase). */
export function codigoDoErro(e: unknown): string | null {
  const d = (e as { response?: { data?: { code?: unknown } } })?.response?.data
  return typeof d?.code === 'string' ? d.code : null
}
