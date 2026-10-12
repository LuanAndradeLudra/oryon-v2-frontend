import type { Conversation, WhatsAppNumberDetailed } from '@/types'
import type { AgentConfig } from '@/services/agentsApi'
import { computeWhatsAppWindow, type WhatsAppWindow } from '@/lib/whatsappWindow'

/**
 * Fila do Dashboard (direção A · Fila primeiro, decisões do PO de 27/09).
 *
 * "Fila" = as conversas PENDENTES que esperam alguém (`esperaNaFila`): sem
 * dono, ou com dono e sem resposta humana desde a última mensagem. 28/09: a
 * mesma ideia da aba "Fila" da inbox (pendentes sem dono) — antes o Dashboard
 * tinha regra própria, mais ampla.
 *
 * Antes o app tinha três definições (status pendente no Dashboard, "sem dono
 * e aberta" na Home, "sem dono" na inbox) e o card mostrava as 3 conversas
 * MAIS RECENTES, não as que esperam há mais tempo. Aqui a espera é contada da
 * última mensagem (P1 do SCRUM-1161 pede ao backend o "esperando desde"
 * exato), e a lista sai da maior para a menor.
 *
 * Prazo: 15 min fixos (o mesmo limite com que o `sla-watcher` do backend já
 * avisa). Configurável por empresa é o item P4 do SCRUM-1161.
 */
export const PRAZO_RESPOSTA_MIN = 15
/** A partir de quantos minutos a conversa "vence em breve". */
export const VENCE_EM_BREVE_MIN = 10

export type FaixaDePrazo = 'atrasada' | 'vence-em-breve' | 'no-prazo'

export interface ItemDaFila {
  conversa: Conversation
  /** Minutos desde a última mensagem da conversa. */
  esperaMin: number
  faixa: FaixaDePrazo
  /** A IA atende a linha e passou a conversa para a equipe (status pendente). */
  iaPassou: boolean
  semDono: boolean
  /**
   * Janela de 24h do WhatsApp — a MESMA regra do perfil do contato
   * (`computeWhatsAppWindow`): exata quando o cliente falou por último,
   * "ativa" sem contagem quando fomos nós (o backend não expõe
   * `lastInboundAt` — P5 do SCRUM-1161).
   */
  janela: WhatsAppWindow | null
}

/** Janela prestes a fechar: depois dela, só modelo aprovado (pago). */
export function janelaFechando(i: ItemDaFila): boolean {
  return i.janela?.state === 'closing'
}

export function janelaFechada(i: ItemDaFila): boolean {
  return i.janela?.state === 'closed'
}

type ConversaDaFila = Pick<Conversation, 'lastMessageSenderKind' | 'lastMessageAt' | 'lastAgentReplyAt' | 'aiPausedUntil' | 'status' | 'assignedUser' | 'whatsappNumber'>

/**
 * Linhas atendidas por um Agente IA ligado. A conversa não traz o agente da
 * linha (o formato público de `/conversations` omite `agentId`), então quem
 * chama monta este conjunto a partir de `/whatsapp/numbers` + agentes ativos.
 */
export type LinhasComIA = ReadonlySet<string>

/**
 * Linhas atendidas por IA: a linha tem `agentId` e esse agente está ligado.
 * Sem a lista de agentes (servidor de agentes fora do ar), vale o vínculo da
 * linha. Compartilhado pela fila do Dashboard e pela inbox.
 */
export function calcularLinhasComIA(
  linhas: ReadonlyArray<Pick<WhatsAppNumberDetailed, 'id' | 'agentId'>>,
  agentes: ReadonlyArray<Pick<AgentConfig, 'id' | 'status'>> | null,
): Set<string> {
  const ativos = agentes ? new Set(agentes.filter((a) => a.status === 'active').map((a) => a.id)) : null
  const out = new Set<string>()
  for (const l of linhas) {
    if (!l.agentId) continue
    if (ativos && !ativos.has(l.agentId)) continue
    out.add(l.id)
  }
  return out
}

function iaPausada(c: ConversaDaFila, now: number): boolean {
  if (!c.aiPausedUntil) return false
  const t = new Date(c.aiPausedUntil).getTime()
  return Number.isFinite(t) && t > now
}

function linhaTemIA(c: ConversaDaFila, linhasComIA: LinhasComIA): boolean {
  const id = c.whatsappNumber?.id
  return !!id && linhasComIA.has(id)
}

/** Uma pessoa da equipe respondeu depois da última mensagem? (`lastAgentReplyAt`
 *  só anda com mensagem HUMANA — a IA não mexe nele.) */
function pessoaRespondeu(c: ConversaDaFila): boolean {
  if (!c.lastAgentReplyAt) return false
  return new Date(c.lastAgentReplyAt).getTime() >= new Date(c.lastMessageAt).getTime()
}

/**
 * A IA passou a conversa para a equipe: a linha tem IA e a conversa está
 * pendente. O handoff do produto (regra de transferência ou ferramenta do
 * agente) NÃO pausa a IA — marca a conversa como pendente e (às vezes)
 * atribui; a IA pode seguir respondendo. Por isso o critério é o status, não a
 * pausa, nem quem falou por último.
 */
function iaPassouParaEquipe(c: ConversaDaFila, linhasComIA: LinhasComIA): boolean {
  return linhaTemIA(c, linhasComIA) && c.status === 'pending'
}

/**
 * A conversa espera uma pessoa? Não está encerrada, nenhuma pessoa respondeu
 * desde a última mensagem, e: a IA a passou para a equipe, ou a IA não está
 * cuidando dela (linha sem IA ou IA pausada) e o cliente falou por último.
 */
export function esperaPessoa(c: ConversaDaFila, linhasComIA: LinhasComIA, now: number = Date.now()): boolean {
  if (c.status === 'resolved' || c.status === 'abandoned') return false
  if (pessoaRespondeu(c)) return false
  if (iaPassouParaEquipe(c, linhasComIA)) return true
  if (c.lastMessageSenderKind !== 'client') return false
  if (linhaTemIA(c, linhasComIA) && !iaPausada(c, now)) return false
  return true
}

/**
 * Entra na fila do Dashboard? (28/09, decisão do PO — alinhada à aba "Fila"
 * da inbox.) "Pendente" é, na operação, "precisa de atendimento humano" (a IA
 * marca ao encaminhar). Espera alguém:
 *  - a pendente SEM dono (é a aba Fila da inbox: ninguém pegou ainda), ou
 *  - a pendente COM dono em que nenhuma pessoa respondeu desde a última
 *    mensagem (pegou, mas o cliente ainda aguarda).
 * Uma regra só para o operador: não há um segundo "esperando" com critério
 * próprio. (O selo "sem resposta" da lista usa `esperaPessoa`, acima.)
 */
export function esperaNaFila(c: ConversaDaFila): boolean {
  if (c.status !== 'pending') return false
  return !c.assignedUser || !pessoaRespondeu(c)
}

export function faixaDoPrazo(esperaMin: number): FaixaDePrazo {
  if (esperaMin >= PRAZO_RESPOSTA_MIN) return 'atrasada'
  if (esperaMin >= VENCE_EM_BREVE_MIN) return 'vence-em-breve'
  return 'no-prazo'
}

/** Monta a fila do Dashboard (`esperaNaFila`), da maior espera para a menor. */
export function montarFila(
  conversas: ReadonlyArray<Conversation>,
  linhasComIA: LinhasComIA,
  now: number = Date.now(),
): ItemDaFila[] {
  const out: ItemDaFila[] = []
  for (const c of conversas) {
    if (!esperaNaFila(c)) continue
    const t = new Date(c.lastMessageAt).getTime()
    if (!Number.isFinite(t)) continue
    const esperaMin = Math.max(0, Math.floor((now - t) / 60_000))
    out.push({
      conversa: c,
      esperaMin,
      faixa: faixaDoPrazo(esperaMin),
      iaPassou: iaPassouParaEquipe(c, linhasComIA),
      semDono: !c.assignedUser,
      janela: computeWhatsAppWindow({ lastMessageAt: c.lastMessageAt, lastMessageSenderKind: c.lastMessageSenderKind, now }),
    })
  }
  return out.sort((a, b) => b.esperaMin - a.esperaMin)
}

/** "agora" · "42 min" · "2 h 5 min" · "3 d 4 h" (espera longa não vira "98 h"). */
export function formatarEspera(min: number): string {
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) {
    const m = min % 60
    return m ? `${h} h ${m} min` : `${h} h`
  }
  const d = Math.floor(h / 24)
  const hr = h % 24
  return hr ? `${d} d ${hr} h` : `${d} d`
}
