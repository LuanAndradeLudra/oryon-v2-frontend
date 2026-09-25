/**
 * O CONTEÚDO das satélites — componentes reais do produto. Arquivo separado
 * para ser carregado DEPOIS da página (`lazy` no `HeroPalco`): as satélites só
 * entram quando a demonstração está pronta, e estes componentes puxam
 * dependências pesadas que não precisam atrasar a primeira pintura da landing.
 */
import { TemplatePreview, WA, FONTE_WA } from '@/components/campaigns/TemplatePreview'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { ConversationActivitySection } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { DealSummary } from '@/components/deals/DealSummary'
import {
  HERO, HERO_PIPELINE, HERO_TEMPLATE, HERO_TEMPLATE_VARIAVEIS, heroDeal, heroNotifications, heroTimeline,
} from './heroRealData'
import type { HeroState } from './heroStory'

const NOOP = () => {}

// ─── As três satélites — cada uma é um componente REAL do produto ───────────

/** O modelo aprovado da campanha, como o WhatsApp mostra (`TemplatePreview`). */
/**
 * A tela do celular da Marina: o papel de parede do WhatsApp (a paleta
 * amostrada dos prints da Meta, exportada pela própria `TemplatePreview`) com
 * a mensagem da campanha como ela chega — a prévia REAL do modelo, na variante
 * "só a bolha". Em cima, a barra de status do aparelho e a linha da empresa
 * que enviou; nada de cabeçalho inventado de conversa.
 */
export function ConteudoWhatsAppAparelho() {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: WA.papel, fontFamily: FONTE_WA }}>
      <div className="flex items-center justify-between px-5 pt-[9px] text-[10px] font-semibold text-[#11191D]">
        <span>9:41</span>
        <span className="tracking-[2px]">●●●</span>
      </div>
      <div className="mt-6 px-3 text-center">
        <span className="inline-block rounded-md bg-white/80 px-2 py-0.5 text-[9.5px] text-[#54656F] shadow-[0_1px_.5px_rgba(11,20,26,.13)]">
          Hoje
        </span>
      </div>
      <div className="mt-3 pl-4 pr-3 origin-top-left" style={{ transform: 'scale(.72)', width: '139%' }}>
        <TemplatePreview template={HERO_TEMPLATE} variables={HERO_TEMPLATE_VARIAVEIS} variant="card" />
      </div>
    </div>
  )
}

/** O sino da TopBar: os mesmos itens de notificação do produto. */
export function ConteudoNotificacoes({ at }: { at: HeroState }) {
  const lista = heroNotifications(at)
  return (
    <div className="flex flex-col divide-y divide-surface-800 bg-surface-900 py-1">
      {lista.map((n) => <NotificationItem key={n.id} n={n} onClick={NOOP} />)}
    </div>
  )
}

/** A linha do tempo da conversa da Marina — o painel real, com os eventos da história. */
export function ConteudoLinhaDoTempo({ at }: { at: HeroState }) {
  return (
    <div className="bg-surface-900 px-4 pb-3">
      <ConversationActivitySection conversationId="demo-conv-0" entries={heroTimeline(at)} />
    </div>
  )
}


/**
 * O negócio da história no cartão real do produto (`DealSummary`, densidade
 * `card` — o mesmo da ficha do contato e da aba de negócios), com o stepper
 * de etapas andando junto com a história. Ganho usa a variante fechada.
 */
export function ConteudoNegocio({ at }: { at: HeroState }) {
  const deal = heroDeal(at)
  return (
    <div className="bg-surface-900 p-3">
      {deal.status === 'won' ? (
        <DealSummary
          density="card" closed deal={deal} pipeline={HERO_PIPELINE} onReopen={NOOP}
          history={undefined} onToggleHistory={NOOP} showReopenHistory={false}
          testIdPrefix="hero-negocio" testIdKey={deal.id}
        />
      ) : (
        <DealSummary
          density="card" deal={deal} pipeline={HERO_PIPELINE} contactName={HERO.person}
          moveOpen={false} onToggleMove={NOOP} onMove={NOOP} onOpen={NOOP}
          testIdPrefix="hero-negocio" testIdKey={deal.id}
        />
      )}
    </div>
  )
}
