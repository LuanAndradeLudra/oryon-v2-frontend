// ── Janela de atendimento de 24h do WhatsApp ────────────────────────────────
// A "customer service window" da Meta abre quando o CLIENTE envia uma
// mensagem e permite mensagens livres por 24h; fora dela, só templates
// aprovados. É a pergunta nº 1 de um operador ("posso mandar mensagem livre
// agora?") e o backend já rejeita envios fora da janela ("Fora da janela de
// 24h"). Aqui derivamos o estado do sinal disponível no frontend.
//
// Precisão: a janela abre na última mensagem DO CLIENTE. Só conhecemos o
// remetente da ÚLTIMA mensagem da conversa (lastMessageSenderKind). Quando
// foi o cliente, o cálculo é exato. Quando a última foi nossa (operador/IA),
// a entrada do cliente é mais antiga e não dá para cravar o fechamento — daí
// o estado 'active' (sem contagem). Fase futura: backend expõe lastInboundAt
// para precisão total.

type SenderKind = 'client' | 'operator' | 'ai' | 'campaign' | 'rule' | null | undefined

export type WhatsAppWindowState = 'open' | 'closing' | 'active' | 'closed'

export interface WhatsAppWindow {
  state: WhatsAppWindowState
  /** Horas restantes até fechar (só quando exato — estados open/closing). */
  hoursLeft: number | null
  label: string
  detail: string
}

const WINDOW_HOURS = 24

function fmtHoursLeft(h: number): string {
  if (h >= 1) return `${Math.floor(h)}h`
  return `${Math.max(1, Math.round(h * 60))}min`
}

export function computeWhatsAppWindow(opts: {
  lastMessageAt?: string | null
  lastMessageSenderKind?: SenderKind
  /** Relógio de quem chama (o Dashboard recalcula a cada 30 s). */
  now?: number
}): WhatsAppWindow | null {
  const { lastMessageAt, lastMessageSenderKind, now = Date.now() } = opts
  if (!lastMessageAt) return null

  const ageH = (now - new Date(lastMessageAt).getTime()) / 3_600_000
  if (!Number.isFinite(ageH) || ageH < 0) return null

  // Sem atividade há >= 24h: janela certamente fechada (independe do remetente).
  if (ageH >= WINDOW_HOURS) {
    return {
      state: 'closed',
      hoursLeft: 0,
      label: 'Janela fechada',
      detail: 'Fora das 24h — só é possível enviar um template aprovado.',
    }
  }

  // Última mensagem foi do cliente → sabemos exatamente quando a janela fecha.
  if (lastMessageSenderKind === 'client') {
    const left = WINDOW_HOURS - ageH
    if (left <= 2) {
      return {
        state: 'closing',
        hoursLeft: left,
        label: `Fecha em ${fmtHoursLeft(left)}`,
        detail: 'A janela de 24h está prestes a fechar — responda logo ou use um template.',
      }
    }
    return {
      state: 'open',
      hoursLeft: left,
      label: `Janela aberta · ${fmtHoursLeft(left)}`,
      detail: 'Dentro das 24h desde a última mensagem do cliente — mensagem livre permitida.',
    }
  }

  // Atividade recente, mas a última mensagem foi nossa: janela provavelmente
  // aberta, sem contagem exata.
  return {
    state: 'active',
    hoursLeft: null,
    label: 'Janela ativa',
    detail: 'Conversa ativa nas últimas 24h. O fechamento exato depende da última mensagem do cliente.',
  }
}

// ── Janela no composer, pela última mensagem do CLIENTE (28/09) ─────────────
// A API não expõe `lastInboundAt` (P5 do SCRUM-1161), mas com a conversa
// aberta as mensagens estão carregadas: a última entrada é a resposta exata.
// Antes o composer contava de `lastMessageAt` (de qualquer remetente) e errava
// nos dois sentidos — "fecha em 24 h" quando faltava 1 h (a IA falou depois do
// cliente) e texto livre liberado logo após um modelo, que a Meta recusa.

const JANELA_MS = WINDOW_HOURS * 3_600_000

interface MensagemDaJanela {
  conversationId: string
  direction: 'inbound' | 'outbound'
  sentAt: string
}

/**
 * Milissegundos que restam na janela de 24h da conversa aberta (≤ 0 =
 * fechada). Na dúvida, fechada: o atendente ainda pode mandar um modelo, e
 * texto livre fora da janela é recusado pela Meta.
 */
export function msRestantesDaJanela(opts: {
  conversationId: string
  mensagens: ReadonlyArray<MensagemDaJanela>
  /** As mensagens desta conversa ainda estão chegando. */
  carregando: boolean
  /** Há mensagens mais antigas que as carregadas. */
  temMais: boolean
  lastMessageAt: string
  lastMessageSenderKind?: SenderKind
  now?: number
}): number {
  const { conversationId, carregando, temMais, lastMessageAt, lastMessageSenderKind, now = Date.now() } = opts
  const restante = (iso: string) => JANELA_MS - (now - new Date(iso).getTime())

  // A última mensagem foi do cliente: exato, sem precisar das mensagens.
  if (lastMessageSenderKind === 'client') return restante(lastMessageAt)

  const daConversa = opts.mensagens.filter((m) => m.conversationId === conversationId)
  let ultimaEntrada: number | null = null
  for (const m of daConversa) {
    if (m.direction !== 'inbound') continue
    const t = new Date(m.sentAt).getTime()
    if (Number.isFinite(t) && (ultimaEntrada === null || t > ultimaEntrada)) ultimaEntrada = t
  }
  if (ultimaEntrada !== null) return JANELA_MS - (now - ultimaEntrada)

  // Sem as mensagens ainda: vale o que se sabe pela conversa até elas chegarem.
  if (carregando || (daConversa.length === 0 && temMais)) return restante(lastMessageAt)

  // Mensagens carregadas e nenhuma do cliente entre elas: ou o cliente nunca
  // escreveu, ou escreveu antes da mais antiga carregada. Nos dois casos a
  // janela não pode ser afirmada — fechada.
  return 0
}
