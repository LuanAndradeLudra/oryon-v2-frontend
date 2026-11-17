import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { CheckCheck, DoorOpen, Hourglass, LogOut, MailCheck, MailQuestionMark, MessageCircleQuestionMark, MessageSquareReply, Milestone, PencilLine, PlugZap, Route, Shuffle, Split, UsersRound, Webhook, Zap, Hand, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import type { GrupoDoPasso } from '@/services/jornadas/tipos'
import { tomDoTipo } from './categorias'

/**
 * ORY-60 — os ícones dos passos, na galeria escolhida pelo João (16/11,
 * docs/jornadas/variacoes/escolha-icones.html):
 *
 *  - 16 ficam no ORIGINAL (Lucide), onde o costume pesa: webhook, ramificar,
 *    dividir A/B, entrada, esperar, sair, sistema do cliente…; o traço vai na cor
 *    viva da categoria;
 *  - 18 usam o NOVO desenho "Órbita" (a linguagem da logo): traço neutro e um
 *    "nó" — o ponto da órbita — na cor da categoria; nos passos de IA o nó vira
 *    uma faísca;
 *  - estilo "Sem fundo" (sem ladrilho atrás);
 *  - selo de marca no canto de cima: WhatsApp nos passos de mensagem, Oryon no
 *    agente e o logo do sistema do cliente (vem do conector; sem logo, fica só o
 *    ícone — nunca uma letra genérica).
 */

// ── os desenhos novos (grade 24, traço 1,75) ─────────────────────────────────

const faisca = (cx: number, cy: number, r = 3.2) =>
  `<path class="jt-no" d="M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z"/>`
const no = (cx: number, cy: number, r = 2.2) => `<circle class="jt-no" cx="${cx}" cy="${cy}" r="${r}"/>`

const NOVOS: Record<string, string> = {
  send_template: `<path d="M5 3h14a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-8.6L7 15.8v-2.3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M6.6 6.6h6.4"/><path d="M6.6 9.8h4"/><rect x="3" y="17.2" width="8.2" height="3.8" rx="1.9"/><rect x="12.8" y="17.2" width="8.2" height="3.8" rx="1.9"/>${no(17, 8.2, 2.1)}`,
  send_text: `<path d="M12 3.5c4.7 0 8.5 3.2 8.5 7.2s-3.8 7.2-8.5 7.2c-1.1 0-2.1-.2-3.1-.5L4.4 19.9l1.5-3.9C4.4 14.7 3.5 12.8 3.5 10.7c0-4 3.8-7.2 8.5-7.2z"/><path d="M7.8 10.7h4.4"/>${no(14.9, 10.7, 1.9)}`,
  notify_team: `<path d="M6.5 15.5V11a5.5 5.5 0 0 1 11 0v4.5l1.5 2h-14z"/><path d="M12 3.6v1.9"/><path d="M3.6 8.6a8 8 0 0 1 1.9-3.4"/><path d="M20.4 8.6a8 8 0 0 0-1.9-3.4"/>${no(12, 20.4, 2)}`,
  internal_note: `<path d="M14.5 20H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6.5z"/><path d="M14.5 20v-3.5a2 2 0 0 1 2-2H20"/><path d="M8 10h8"/><path d="M8 13.5h3.5"/>${no(12, 5, 2.2)}`,
  handoff_agent: `<path d="M17.76 11.19A7 7 0 1 1 12.81 6.24"/>${no(11, 13, 2.5)}<circle class="jt-cheio" cx="18.2" cy="5.6" r="1.7"/>`,
  handoff_human: `<path d="M5 20.2a7 7 0 0 1 14 0"/>${no(12, 8.5, 3.3)}<path d="M12 13.5v2"/>`,
  goal: `<path d="M6 21V7"/><path d="M8.6 4.6H18l-2.4 3.6 2.4 3.6H6"/>${no(6, 4.6, 2.2)}`,
  tag: `<path d="M4 12.6V5.5A1.5 1.5 0 0 1 5.5 4h7.1l7.5 7.5a1.6 1.6 0 0 1 0 2.3l-6.3 6.3a1.6 1.6 0 0 1-2.3 0z"/>${no(8.6, 8.6, 2.2)}`,
  assign: `<path d="M3.5 19.6a5.5 5.5 0 0 1 11 0"/>${no(9, 9, 2.8)}<path d="M21 12h-5.4"/><path d="M18 9.4L15.4 12l2.6 2.6"/>`,
  deal_action: `<path d="M5.5 8h13a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"/><path d="M9 8V6.2a1.7 1.7 0 0 1 1.7-1.7h2.6A1.7 1.7 0 0 1 15 6.2V8"/><path d="M3.5 13h6.2"/><path d="M14.3 13h6.2"/>${no(12, 13, 2.2)}`,
  ai_classify: `${faisca(5.2, 12, 3.8)}<path d="M9.6 12H12"/><path d="M12 12l3.4-5.4H20"/><path d="M12 12h8"/><path d="M12 12l3.4 5.4H20"/>`,
  ai_extract: `<path d="M4 8.5V6.5A2.5 2.5 0 0 1 6.5 4h2"/><path d="M15.5 4h2A2.5 2.5 0 0 1 20 6.5v2"/><path d="M20 15.5v2a2.5 2.5 0 0 1-2.5 2.5h-2"/><path d="M8.5 20h-2A2.5 2.5 0 0 1 4 17.5v-2"/><path d="M8 10h6"/><path d="M8 14h3"/>${faisca(15.6, 14, 3)}`,
  ai_summarize: `<path d="M4 6h16"/><path d="M4 10.5h11"/><path d="M4 15h6"/>${faisca(16.6, 16.4, 3.4)}`,
  ai_mission: `<path d="M19.02 9.76A8 8 0 1 1 14.24 4.98"/><circle cx="11.5" cy="12.5" r="3.4"/>${faisca(18.4, 5.6, 2.9)}`,
  backstage_task: `<path d="M12 5l7.5 3.8-7.5 3.8-7.5-3.8z"/><path d="M4.5 12.6l7.5 3.8 7.5-3.8"/><path d="M4.5 16.4l7.5 3.8 7.5-3.8"/>${faisca(19.6, 4.2, 2.6)}`,
  human_approval: `<path d="M12 3.5l7 2.8v5.2c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6.3z"/><path d="M8.8 12.2l2.3 2.3 2.2-2.3"/>${no(15.6, 9.7, 2)}`,
  porta_agenda: `<path d="M6.5 5.5h11A2.5 2.5 0 0 1 20 8v9.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5V8a2.5 2.5 0 0 1 2.5-2.5z"/><path d="M8.5 3.5v4"/><path d="M15.5 3.5v4"/><path d="M4 10.5h16"/><path d="M7.5 14h4"/><path d="M7.5 17h2.5"/>${no(15.6, 15.4, 2.2)}`,
  porta_manual: `<path d="M5 5l5.8 14.2 2.2-6 6-2.2z"/>${no(17.8, 17.8, 2.2)}`,
}

/** Os que ficam no original (Lucide), por costume. */
const ORIGINAIS: Record<string, LucideIcon> = {
  entrada: DoorOpen,
  porta_evento: Zap,
  porta_segmento: UsersRound,
  porta_webhook: Webhook,
  webhook_out: Webhook,
  branch: Split,
  ab_split: Shuffle,
  hold_conversation: Hand,
  resolve_conversation: CheckCheck,
  wait: Hourglass,
  wait_event: MailQuestionMark,
  exit: LogOut,
  enroll_journey: Route,
  set_stage: Milestone,
  set_field: PencilLine,
  connector_call: PlugZap,
  // P1 (16/11): os passos novos usam o ícone de mercado, como o João preferiu nos de costume.
  send_and_wait: MessageSquareReply,
  ask_question: MessageCircleQuestionMark,
  branch_message_status: MailCheck,
}

// ── marcas ───────────────────────────────────────────────────────────────────

type Marca = 'whatsapp' | 'oryon' | 'sistema'
const MARCA_DO_PASSO: Record<string, Marca> = {
  send_template: 'whatsapp', send_text: 'whatsapp', wait_event: 'whatsapp',
  send_and_wait: 'whatsapp', ask_question: 'whatsapp', branch_message_status: 'whatsapp',
  handoff_agent: 'oryon', ai_mission: 'oryon',
  connector_call: 'sistema', porta_agenda: 'sistema',
}

/** O sistema do cliente (o conector): o selo usa o logo dele; sem logo, não há selo. */
export interface SistemaDoCliente { nome: string; logoUrl?: string | null }
const ContextoDoSistema = createContext<SistemaDoCliente | null>(null)
export function ProvedorDoSistema({ sistema, children }: { sistema: SistemaDoCliente | null | undefined; children: ReactNode }) {
  return <ContextoDoSistema.Provider value={sistema ?? null}>{children}</ContextoDoSistema.Provider>
}

const ANEL = 'M133.26 53.79A62 62 0 1 1 96.21 16.74L89.36 35.53A42 42 0 1 0 114.47 60.64Z'
/**
 * O selo da Oryon. Tema escuro: a logo oficial colorida (anel em degradê teal,
 * satélite teal, centro quase preto) sobre o quadro claro. Tema claro: a versão
 * de uma cor, escura (jornadas.css troca as duas pelo tema).
 */
function SeloDaOryon() {
  return (
    <span className="jt-selo-oryon">
      <svg className="jt-oryon-cor" viewBox="13 13 124 124" aria-hidden>
        <defs>
          <linearGradient id="jt-oryon-anel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1EC5B0" />
            <stop offset="1" stopColor="#0A8075" />
          </linearGradient>
        </defs>
        <path fill="url(#jt-oryon-anel)" d={ANEL} />
        <circle fill="#0B9387" cx="111.8" cy="38.2" r="13" />
        <circle fill="#0B1F1D" cx="75" cy="75" r="17" />
      </svg>
      <svg className="jt-oryon-mono" viewBox="13 13 124 124" aria-hidden>
        <g fill="currentColor"><path d={ANEL} /><circle cx="111.8" cy="38.2" r="13" /><circle cx="75" cy="75" r="17" /></g>
      </svg>
    </span>
  )
}

function SeloDaMarca({ marca, sistema }: { marca: Marca; sistema: SistemaDoCliente | null }) {
  if (marca === 'whatsapp') return <span className="jt-selo" title="WhatsApp"><WhatsAppIcon size={16} className="w-full h-full" /></span>
  if (marca === 'oryon') return <span className="jt-selo" title="Oryon"><SeloDaOryon /></span>
  if (!sistema?.logoUrl) return null
  return <span className="jt-selo jt-selo-quadrado" title={sistema.nome}><img src={sistema.logoUrl} alt="" className="jt-selo-img" /></span>
}

// ── o componente ─────────────────────────────────────────────────────────────

/**
 * O ícone de um passo (ou da Entrada / de uma porta), sem fundo, com o selo da
 * marca quando houver. `tamanho`: 'p' (16 px, sem caixa nem selo, para listas
 * miúdas), 'm' (20 px numa caixa de 32 — cartão e seletor) ou 'g' (24 px numa
 * caixa de 40 — topo do painel).
 */
export function IconeDoPasso({ tipo, grupo, tamanho = 'm', semMarca, className }: {
  tipo: string
  grupo?: GrupoDoPasso
  tamanho?: 'p' | 'm' | 'g'
  semMarca?: boolean
  className?: string
}) {
  const sistema = useContext(ContextoDoSistema)
  const tom = tomDoTipo(tipo, grupo)
  const estilo = { '--jt-no-cor': `var(--jt-${tom}-no)` } as CSSProperties
  const Original = ORIGINAIS[tipo]
  const desenho = Original
    ? <Original className="jt-ip-svg jt-ip-original" aria-hidden />
    : <svg className="jt-ip-svg jt-ip-novo" viewBox="0 0 24 24" aria-hidden dangerouslySetInnerHTML={{ __html: NOVOS[tipo] ?? NOVOS.porta_manual }} />
  const marca = !semMarca && tamanho !== 'p' ? MARCA_DO_PASSO[tipo] : undefined
  return (
    <span className={cn('jt-ip', `jt-ip-${tamanho}`, className)} style={estilo}>
      {desenho}
      {marca && <SeloDaMarca marca={marca} sistema={sistema} />}
    </span>
  )
}
