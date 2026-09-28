import type { Conversation } from '@/types'

/**
 * Fila do Dashboard (direção A · Fila primeiro, decisões do PO de 27/09).
 *
 * "Fila" = quem espera resposta HUMANA: nenhuma pessoa respondeu desde a
 * última mensagem e a IA não está cuidando da conversa — ou porque a linha não
 * tem IA (ou ela está pausada) e o cliente falou por último, ou porque a IA a
 * passou para a equipe (status "pendente").
 *
 * Antes o app tinha três definições (status pendente no Dashboard, "sem dono
 * e aberta" na Home, "sem dono" na inbox) e o card mostrava as 3 conversas MAIS RECENTES, não as que esperam há mais
 * tempo. Aqui a espera é contada da última mensagem (P1 do SCRUM-1161 pede ao
 * backend o "esperando desde" exato), e a lista sai da maior para a menor.
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
}

type ConversaDaFila = Pick<Conversation, 'lastMessageSenderKind' | 'lastMessageAt' | 'lastAgentReplyAt' | 'aiPausedUntil' | 'status' | 'assignedUser' | 'whatsappNumber'>

/**
 * Linhas atendidas por um Agente IA ligado. A conversa não traz o agente da
 * linha (o formato público de `/conversations` omite `agentId`), então quem
 * chama monta este conjunto a partir de `/whatsapp/numbers` + agentes ativos.
 */
export type LinhasComIA = ReadonlySet<string>

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

export function faixaDoPrazo(esperaMin: number): FaixaDePrazo {
  if (esperaMin >= PRAZO_RESPOSTA_MIN) return 'atrasada'
  if (esperaMin >= VENCE_EM_BREVE_MIN) return 'vence-em-breve'
  return 'no-prazo'
}

/** Monta a fila: só quem espera pessoa, da maior espera para a menor. */
export function montarFila(
  conversas: ReadonlyArray<Conversation>,
  linhasComIA: LinhasComIA,
  now: number = Date.now(),
): ItemDaFila[] {
  const out: ItemDaFila[] = []
  for (const c of conversas) {
    if (!esperaPessoa(c, linhasComIA, now)) continue
    const t = new Date(c.lastMessageAt).getTime()
    if (!Number.isFinite(t)) continue
    const esperaMin = Math.max(0, Math.floor((now - t) / 60_000))
    out.push({
      conversa: c,
      esperaMin,
      faixa: faixaDoPrazo(esperaMin),
      iaPassou: iaPassouParaEquipe(c, linhasComIA),
      semDono: !c.assignedUser,
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
