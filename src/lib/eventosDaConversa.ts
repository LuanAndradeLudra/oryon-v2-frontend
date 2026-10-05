// Eventos da IA e da equipe entre as mensagens da conversa (T4, fase 1 — só
// front; release 2026-09-29). Fontes: o activity-feed da conversa (o que a
// equipe e o sistema fizeram) e `/conversations/:id/actions` (ações da IA no
// CRM, no agent-server). Nada aqui chama rede: classifica, agrupa e intercala.
//
// D10: transferências, falhas, bloqueios da verificação e "IA passou para a
// equipe" ficam SEMPRE visíveis; o resto é rotina, escondida por padrão atrás
// de "Mostrar eventos" (`eventos=1` na URL).
import type { UserActivity } from '@/services/userActivityApi'
import type { AgentAction } from '@/services/agentActivityApi'
import type { Message } from '@/types'

export type TipoDeEvento =
  | 'transferencia' | 'ia_para_equipe' | 'verificacao' | 'falha'
  | 'pausa_ia' | 'atribuicao' | 'status' | 'etiqueta' | 'crm_ia' | 'outro'

export interface EventoDaConversa {
  id: string
  at: string
  tipo: TipoDeEvento
  /** Quem fez, escrito: "IA", "Você" ou o nome. */
  ator: string
  texto: string
  /** Rotina = escondido por padrão (D10). */
  rotina: boolean
}

const SEMPRE_VISIVEIS: ReadonlySet<TipoDeEvento> = new Set(['transferencia', 'ia_para_equipe', 'verificacao', 'falha'])

/** Ações que já aparecem como mensagem na conversa — viram ruído como evento. */
const IGNORADAS = new Set(['message_sent', 'automated_message_sent', 'auto_reply', 'interactive_reply_received', 'conversation_created'])

function texto(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/** Linha do activity-feed → evento (ou null quando já é uma mensagem). */
export function eventoDaAtividade(a: UserActivity, meuNome?: string | null): EventoDaConversa | null {
  if (IGNORADAS.has(a.type)) return null
  const md = a.metadata ?? {}
  const actorType = texto(md.actorType)
  const ator = actorType === 'agent' ? 'IA'
    : meuNome && a.actor === meuNome ? 'Você'
    : a.actor || 'Sistema'
  // `summary` é a `description` do log: frase legível nos logs do serviço,
  // código cru ("conversation_assigned conversation") nos do @AuditLog.
  const descricao = a.summary && !a.summary.startsWith(a.type) ? a.summary : ''
  const base = (tipo: TipoDeEvento, t: string): EventoDaConversa => ({
    id: `a:${a.id}`, at: a.timestamp, tipo, ator, texto: t, rotina: !SEMPRE_VISIVEIS.has(tipo),
  })
  switch (a.type) {
    case 'conversation_transferred':
      return base('transferencia', texto(md.userName) ? `transferiu a conversa para ${texto(md.userName)}` : 'transferiu a conversa')
    case 'human_handoff':
    case 'agent_requested_handoff':
    case 'external_redirect':
      return { ...base('ia_para_equipe', descricao || 'passou a conversa para a equipe'), ator: 'IA' }
    case 'agent_phantom_confirmation_handoff':
      return { ...base('verificacao', 'a verificação bloqueou uma resposta da IA e chamou a equipe'), ator: 'IA' }
    case 'agent_phantom_confirmation_corrected':
      return { ...base('verificacao', 'a verificação corrigiu uma resposta da IA antes do envio'), ator: 'IA' }
    case 'conversation_auto_resolved_send_failed':
      return base('falha', 'uma mensagem automática não foi enviada')
    case 'conversation_ai_pause_updated':
      return base('pausa_ia', md.pauseUntil === null || md.paused === false ? 'retomou a IA' : 'pausou a IA')
    case 'conversation_ai_auto_paused':
      return base('pausa_ia', 'assumiu a conversa — a IA pausou')
    case 'agent_reply_discarded_paused':
      return { ...base('pausa_ia', 'teve uma resposta descartada porque estava pausada'), ator: 'IA' }
    case 'conversation_assigned':
      return base('atribuicao', texto(md.userName) ? `atribuiu a conversa a ${texto(md.userName)}` : 'atribuiu a conversa')
    case 'conversation_status_updated':
      return base('status', texto(md.status) === 'resolved' ? 'resolveu a conversa' : 'mudou o status da conversa')
    case 'conversation_reopened':
      return base('status', 'a conversa foi reaberta')
    case 'conversation_tag_added':
      return base('etiqueta', texto(md.tagName) ? `adicionou a etiqueta ${texto(md.tagName)}` : 'adicionou uma etiqueta')
    case 'conversation_tag_removed':
      return base('etiqueta', texto(md.tagName) ? `removeu a etiqueta ${texto(md.tagName)}` : 'removeu uma etiqueta')
    default:
      return base('outro', descricao || 'registrou uma atividade')
  }
}

/** Ação da IA no CRM → evento. Falha é sempre visível (D10). */
export function eventoDaAcaoDaIa(x: AgentAction): EventoDaConversa {
  const tipo: TipoDeEvento = x.success ? 'crm_ia' : 'falha'
  return {
    id: `ia:${x.id}`,
    at: x.createdAt,
    tipo,
    ator: 'IA',
    texto: x.success ? x.humanSummary : `não conseguiu: ${x.humanSummary}${x.errorMessage ? ` (${x.errorMessage})` : ''}`,
    rotina: x.success,
  }
}

/** Um bloco de eventos seguidos do mesmo tipo e ator vira uma linha só. */
export interface GrupoDeEventos {
  id: string
  eventos: EventoDaConversa[]
}

export function agruparSeguidos(eventos: EventoDaConversa[]): GrupoDeEventos[] {
  const grupos: GrupoDeEventos[] = []
  for (const e of eventos) {
    const ultimo = grupos[grupos.length - 1]
    const par = ultimo?.eventos[0]
    if (par && par.tipo === e.tipo && par.ator === e.ator && par.rotina && e.rotina) ultimo.eventos.push(e)
    else grupos.push({ id: e.id, eventos: [e] })
  }
  return grupos
}

export type ItemDaConversa =
  | { kind: 'mensagem'; mensagem: Message }
  | { kind: 'eventos'; grupos: GrupoDeEventos[]; id: string }

/**
 * Intercala os eventos entre as mensagens pela ordem do tempo. Com mais
 * mensagens antigas por carregar (`temMais`), eventos anteriores à primeira
 * mensagem carregada ficam de fora (apareceriam fora do lugar).
 */
/** Início da janela carregada; data inválida não esconde nada (antes virava NaN e sumia tudo). */
function inicioDaJanela(mensagens: Message[], temMais: boolean): number {
  if (!temMais || !mensagens[0]) return -Infinity
  const t = new Date(mensagens[0].sentAt).getTime()
  return Number.isFinite(t) ? t : -Infinity
}

function naJanela(eventos: EventoDaConversa[], mensagens: Message[], temMais: boolean): EventoDaConversa[] {
  const inicio = inicioDaJanela(mensagens, temMais)
  return eventos.filter((e) => {
    const t = new Date(e.at).getTime()
    return Number.isFinite(t) && t >= inicio
  })
}

export function intercalar(
  mensagens: Message[],
  eventos: EventoDaConversa[],
  { mostrarRotina, temMais }: { mostrarRotina: boolean; temMais: boolean },
): ItemDaConversa[] {
  const visiveis = naJanela(eventos, mensagens, temMais)
    .filter((e) => mostrarRotina || !e.rotina)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  const itens: ItemDaConversa[] = []
  let i = 0
  const soltar = (ate: number) => {
    const bloco: EventoDaConversa[] = []
    while (i < visiveis.length && new Date(visiveis[i].at).getTime() <= ate) bloco.push(visiveis[i++])
    if (bloco.length) itens.push({ kind: 'eventos', grupos: agruparSeguidos(bloco), id: `ev:${bloco[0].id}` })
  }
  for (const m of mensagens) {
    soltar(new Date(m.sentAt).getTime())
    itens.push({ kind: 'mensagem', mensagem: m })
  }
  soltar(Infinity)
  return itens
}

/** Eventos de rotina que APARECEM ao ligar "Mostrar eventos" (mesma janela da lista). */
export function contarRotina(eventos: EventoDaConversa[], mensagens: Message[] = [], temMais = false): number {
  return naJanela(eventos, mensagens, temMais).filter((e) => e.rotina).length
}
