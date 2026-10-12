/**
 * O CONTEÚDO das satélites — componentes reais do produto. Arquivo separado
 * para ser carregado DEPOIS da página (`lazy` no `HeroPalco`): as satélites só
 * entram quando a demonstração está pronta, e estes componentes puxam
 * dependências pesadas que não precisam atrasar a primeira pintura da landing.
 */
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { ConversationActivitySection } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { DealSummary } from '@/components/deals/DealSummary'
import {
  HERO, HERO_PIPELINE, heroDeal, heroHistoricoGanho, heroNotifications, heroTimeline,
} from './heroRealData'
import type { HeroCena, HeroState } from './heroStory'
import { WhatsAppIphone } from './HeroWhatsAppIphone'

const NOOP = () => {}

// ─── As três satélites — cada uma é um componente REAL do produto ───────────

/** O WhatsApp no iPhone da Marina — ver `HeroWhatsAppIphone`. */
export function ConteudoWhatsAppAparelho({ at, cena }: { at: HeroState; cena: HeroCena }) {
  return <WhatsAppIphone at={at} cena={cena} />
}

/** O sino da TopBar: os mesmos itens de notificação do produto. */
export function ConteudoNotificacoes({ at }: { at: HeroState }) {
  const lista = heroNotifications(at)
  return (
    <div className="h-full overflow-hidden flex flex-col divide-y divide-[var(--landing-borda)] bg-surface-900 py-1">
      {lista.map((n) => <NotificationItem key={n.id} n={n} onClick={NOOP} />)}
    </div>
  )
}

/** A linha do tempo da conversa da Marina — o painel real, com os eventos da história. */
export function ConteudoLinhaDoTempo({ at }: { at: HeroState }) {
  return (
    <div className="h-full overflow-hidden bg-surface-900 px-4 pb-3">
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
    <div className="h-full overflow-hidden bg-surface-900 p-3">
      {deal.status === 'won' ? (
        <DealSummary
          density="card" closed deal={deal} pipeline={HERO_PIPELINE} onReopen={NOOP}
          // As passagens abertas: quem moveu cada etapa (a IA avançou, a Ana
          // fechou). Sem elas a janela encolhia para uma linha e o fechamento —
          // o clímax da história — ficava quase invisível (25/09).
          history={heroHistoricoGanho()} onToggleHistory={NOOP} showReopenHistory={false}
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
