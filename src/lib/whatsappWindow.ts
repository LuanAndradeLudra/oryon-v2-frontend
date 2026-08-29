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
}): WhatsAppWindow | null {
  const { lastMessageAt, lastMessageSenderKind } = opts
  if (!lastMessageAt) return null

  const ageH = (Date.now() - new Date(lastMessageAt).getTime()) / 3_600_000
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
