// Eventos da IA e da equipe entre as mensagens da conversa (T4, fase 1 — só
// front; release 2026-09-29). Fontes: o activity-feed da conversa (o que a
// equipe e o sistema fizeram) e `/conversations/:id/actions` (ações da IA no
// CRM, no agent-server). Nada aqui chama rede: classifica, agrupa e intercala.
//
// D10: transferências, falhas, bloqueios da verificação e "IA passou para a
// equipe" ficam SEMPRE visíveis; o resto é rotina, com o botão
// de "Ocultar eventos" (visível por padrão; `eventos-ocultos=1` na URL esconde).
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
  /** Rotina = some com "Ocultar eventos" (D10). */
  rotina: boolean
  /** Pausa manual da IA: o sentido, para fundir pausou+retomou (SCRUM-1253). */
  variante?: 'pausou' | 'retomou'
  /** Evento fundido: início da série (o `at` é o do último). */
  inicio?: string
  /** Evento fundido: os passos originais, para a auditoria ao abrir. */
  fundidos?: EventoDaConversa[]
  /** Ação da IA no CRM: a ferramenta do agent-server (para juntar duplicados). */
  ferramenta?: string
}

const SEMPRE_VISIVEIS: ReadonlySet<TipoDeEvento> = new Set(['transferencia', 'ia_para_equipe', 'verificacao', 'falha'])

/**
 * SCRUM-1253 (PO, 06/10) — MARCOS mudam quem responde ou o estado da conversa
 * e ficam sempre em linha própria; o resto (atribuição, etiqueta, ações da IA
 * no CRM…) colapsa num bloco "N eventos" quando vem seguido, sem mensagem no
 * meio. Modelo: Respond.io e Linear deixam os marcos fora do grupo.
 */
const MARCOS: ReadonlySet<TipoDeEvento> = new Set([...SEMPRE_VISIVEIS, 'pausa_ia', 'status'])
export const ehMarco = (e: EventoDaConversa) => MARCOS.has(e.tipo)

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
    case 'conversation_ai_pause_updated': {
      const retomou = md.pauseUntil === null || md.paused === false
      return { ...base('pausa_ia', retomou ? 'retomou a IA' : 'pausou a IA'), variante: retomou ? 'retomou' : 'pausou' }
    }
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
    ferramenta: x.toolName,
  }
}

/**
 * Homologação 06/10 (SCRUM-1253): a mesma ação da IA chega por DUAS fontes — o
 * registro do backend ("mudou o status da conversa", "atribuiu a conversa a
 * João") e o resumo da ferramenta no agent-server ("Conversa movida para a fila
 * pelo agente", "Atribuiu a conversa para João"). Viravam duas linhas.
 */
const FERRAMENTA_PARA_TIPO: Record<string, TipoDeEvento> = {
  set_conversation_status: 'status',
  assign_conversation: 'atribuicao',
  transfer_conversation: 'transferencia',
  add_tag_to_conversation: 'etiqueta',
  remove_tag_from_conversation: 'etiqueta',
}
const JANELA_DUPLICADO_MS = 5_000

/**
 * Junta cada ação da IA com o registro do backend da MESMA ação (mesmo tipo,
 * até 5 s de distância). Fica uma linha: o tipo e a importância do registro do
 * backend (status continua marco) com a frase da IA, que é a mais rica.
 *
 * Revisão 11/10: o par do backend precisa ter sido feito PELA IA (ator "IA",
 * que vem de `actorType: 'agent'`) — antes casava com qualquer registro do
 * mesmo tipo, e um "Assumir" do operador 3 s depois da IA virava "IA atribuiu"
 * e sumia. Entre os candidatos, fica o mais próximo no tempo (não o primeiro).
 */
export function juntarDuplicados(eventos: EventoDaConversa[]): EventoDaConversa[] {
  const usados = new Set<string>()
  const textoDaIa = new Map<string, EventoDaConversa>()
  const doBackend = eventos.filter((e) => !e.ferramenta)
  for (const ia of eventos) {
    const tipo = ia.ferramenta ? FERRAMENTA_PARA_TIPO[ia.ferramenta] : undefined
    if (!tipo || ia.tipo === 'falha') continue
    const t = new Date(ia.at).getTime()
    let par: EventoDaConversa | undefined
    let menor = Infinity
    for (const e of doBackend) {
      if (e.tipo !== tipo || e.ator !== ia.ator || textoDaIa.has(e.id)) continue
      const d = Math.abs(new Date(e.at).getTime() - t)
      if (d <= JANELA_DUPLICADO_MS && d < menor) { par = e; menor = d }
    }
    if (!par) continue
    usados.add(ia.id)
    textoDaIa.set(par.id, ia)
  }
  return eventos
    .filter((e) => !usados.has(e.id))
    .map((e) => {
      const ia = textoDaIa.get(e.id)
      return ia ? { ...e, ator: 'IA', texto: ia.texto } : e
    })
}

/** Uma linha do chat: um marco, um evento solto ou um bloco de rotina. */
export interface GrupoDeEventos {
  id: string
  eventos: EventoDaConversa[]
}

/** Séries que se substituem ou se anulam (só a pausa MANUAL tem sentido claro). */
function chaveDeFusao(e: EventoDaConversa): string | null {
  if (e.tipo === 'pausa_ia') return e.variante ? 'pausa_ia' : null
  if (e.tipo === 'atribuicao' || e.tipo === 'status') return e.tipo
  return null
}

function fundirSerie(serie: EventoDaConversa[]): EventoDaConversa {
  const primeiro = serie[0]
  const ultimo = serie[serie.length - 1]
  const n = serie.length
  let t: string
  if (ultimo.tipo === 'pausa_ia') {
    const variantes = new Set(serie.map((e) => e.variante))
    t = variantes.size === 1 ? `${ultimo.texto} (${n} vezes)`
      // pausou → retomou (ou o contrário): as duas pontas dizem tudo.
      : n === 2 ? `${primeiro.variante} e ${ultimo.variante} a IA`
      // vai-e-volta mais longo: o estado final manda; os passos abrem ao clicar.
      : `${ultimo.texto} (${n} mudanças)`
  } else {
    t = `${ultimo.texto} (${n} mudanças)`
  }
  return {
    ...ultimo,
    id: `f:${primeiro.id}`,
    ator: [...new Set(serie.map((e) => e.ator))].join(' e '),
    texto: t,
    inicio: primeiro.at,
    fundidos: serie,
    rotina: serie.every((e) => e.rotina),
  }
}

/**
 * Dentro de um trecho SEM mensagem, atribuições viram só a última, status só o
 * final, e pausar/retomar viram uma linha. O fundido fica no lugar do último
 * da série e guarda os passos (`fundidos`) — quem pausou e quando continua a
 * um clique. Nenhum concorrente pesquisado faz isso (06/10).
 */
export function fundirEventos(bloco: EventoDaConversa[]): EventoDaConversa[] {
  const series = new Map<string, EventoDaConversa[]>()
  for (const e of bloco) {
    const k = chaveDeFusao(e)
    if (k) series.set(k, [...(series.get(k) ?? []), e])
  }
  const saida: EventoDaConversa[] = []
  for (const e of bloco) {
    const k = chaveDeFusao(e)
    const serie = k ? series.get(k)! : null
    if (!serie || serie.length < 2) saida.push(e)
    else if (e === serie[serie.length - 1]) saida.push(fundirSerie(serie))
  }
  return saida
}

/** Funde e separa: cada marco numa linha; a rotina seguida entre eles num bloco. */
export function agruparBloco(bloco: EventoDaConversa[]): GrupoDeEventos[] {
  const grupos: GrupoDeEventos[] = []
  let rotina: EventoDaConversa[] = []
  const fechar = () => {
    if (rotina.length) grupos.push({ id: rotina[0].id, eventos: rotina })
    rotina = []
  }
  for (const e of fundirEventos(bloco)) {
    if (ehMarco(e)) {
      fechar()
      grupos.push({ id: e.id, eventos: [e] })
    } else {
      rotina.push(e)
    }
  }
  fechar()
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
    if (bloco.length) itens.push({ kind: 'eventos', grupos: agruparBloco(bloco), id: `ev:${bloco[0].id}` })
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
