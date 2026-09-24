/**
 * O CONTEÚDO das satélites — componentes reais do produto. Arquivo separado
 * para ser carregado DEPOIS da página (`lazy` no `HeroPalco`): as satélites só
 * entram quando a demonstração está pronta, e estes componentes puxam
 * dependências pesadas que não precisam atrasar a primeira pintura da landing.
 */
import { TemplatePreview } from '@/components/campaigns/TemplatePreview'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { ConversationActivitySection } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { HERO_TEMPLATE, HERO_TEMPLATE_VARIAVEIS, heroNotifications, heroTimeline } from './heroRealData'
import type { HeroState } from './heroStory'

const NOOP = () => {}

// ─── As três satélites — cada uma é um componente REAL do produto ───────────

/** O modelo aprovado da campanha, como o WhatsApp mostra (`TemplatePreview`). */
export function ConteudoCelular() {
  return (
    <div className="pointer-events-none">
      <TemplatePreview template={HERO_TEMPLATE} variables={HERO_TEMPLATE_VARIAVEIS} variant="frame" />
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

