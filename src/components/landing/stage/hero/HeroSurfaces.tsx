import { useEffect, useLayoutEffect, useRef } from 'react'
import { ConversationList } from '@/components/conversations/ConversationList/ConversationList'
import { ChatHeader } from '@/components/conversations/ChatWindow/ChatHeader'
import { HandoffStripe } from '@/components/conversations/ChatWindow/AiHandoffBanner'
import { MessageList } from '@/components/conversations/ChatWindow/MessageList'
import { MessageInput } from '@/components/conversations/ChatWindow/MessageInput'
import { ContactPanel } from '@/components/conversations/ContactPanel/ContactPanel'
import { DealsBoard } from '@/components/deals/DealsBoard'
import { BoardFilterBar } from '@/components/deals/BoardFilterBar'
import { boardSummary } from '@/lib/boardFilters'
import { boardStats, entrySources } from '@/lib/dealCard'
import { pipelineKindOption, pipelineNoun } from '@/lib/pipelineKinds'
import { HeroPanelDeals } from './HeroPanelDeals'
import {
  HERO_CONTACT_STAGES, HERO_PIPELINE, HERO_PIPELINE_STAGES, HERO_TAGS, HERO_USER,
  NOOP, NOOP_ASYNC, heroConversation, heroConversations, heroDeal, heroDealsByStage,
  heroMessages, heroTimeline, reached,
} from './heroRealData'
import type { HeroState } from './heroStory'
import type { ConversaVariant } from './heroComposition'
import type { Tag } from '@/types'

/**
 * As três superfícies do palco, cada uma montada com os COMPONENTES DE
 * PRODUÇÃO e vivendo dentro da própria janela.
 *
 * Nenhuma contém a outra: a janela de Conversas não conhece o `DealsBoard`, e
 * a de Funis não conhece a conversa. Essa separação é o que a rodada anterior
 * não tinha, e era a causa de o funil sobrar cortado na lateral do chat.
 *
 * Isolamento de dados (verificado): nada aqui busca na montagem. As costuras
 * são explícitas — `demo` no composer e no painel, `timelineEntries`,
 * `stagesOverride` e `dealsSlot` — e os callbacks são inertes.
 */

// ─── Conversas ────────────────────────────────────────────────────────────────

export function ConversationSurface(
  { at, variant = 'full', listWidth = 360, chatWidth = 604, infoOpen = false }:
  { at: HeroState; variant?: ConversaVariant; listWidth?: number; chatWidth?: number; infoOpen?: boolean },
) {
  const conversation = heroConversation(at)
  const conversations = heroConversations(at)
  const messages = heroMessages(at)
  const contact = conversation.contact

  return (
    <>
      {/* A lista sai no recorte de chat. Não é simplificação da tela: é o
          mesmo componente, e a janela inteira muda de formato para caber ao
          lado do funil sem cair para 63 % de escala. */}
      {/* 360, que é a medida da lista na tela real (`sm:w-[360px]`). Com 300 o
          componente era espremido para dentro de um invólucro menor que ele. */}
      {variant === 'full' && (
      <div className="flex-none flex border-r border-surface-700 overflow-hidden" style={{ width: listWidth }}>
        <ConversationList
          conversations={conversations}
          loading={false}
          activeId={conversation.id}
          filters={{}}
          allTags={HERO_TAGS}
          allContacts={conversations.map((c) => c.contact)}
          allUsers={[HERO_USER]}
          onSelectConversation={NOOP}
          onFiltersChange={NOOP}
        />
      </div>
      )}
      {/* Largura FIXA, não `flex-1`: a coluna da conversa precisa ter a mesma
          medida com e sem a lista ao lado. Com `flex-1` ela mudava de 604 para
          576 ao trocar de formato, e toda a quebra de linha das bolhas se
          refazia — era o "salto" da conversa no meio da cena. */}
      {/* Largura vinda do REGIME, não uma constante. Estabilidade é dentro de
          um regime: 604 no desktop, 500 ao lado da lista no notebook, a janela
          inteira no celular. Fixar 604 em todo lugar punha o chat de desktop
          dentro de uma janela de 340 e cortava as mensagens. */}
      <div className="flex-none flex flex-col bg-surface-950 overflow-hidden" style={{ width: chatWidth }}>
        <ChatHeader
          conversation={conversation}
          allTags={HERO_TAGS}
          allUsers={[HERO_USER]}
          onStatusChange={NOOP}
          onToggleInfo={NOOP}
          /* Verdadeiro enquanto a ficha está em cena: no app, o botão de
             informações fica ativo quando o painel está aberto. Deixá-lo
             falso fazia a ficha parecer outra aplicação, desligada da
             conversa que a originou. */
          infoOpen={infoOpen}
          onAddTag={NOOP as (t: Tag) => void}
          onRemoveTag={NOOP as (id: string) => void}
          onCreateTag={NOOP_ASYNC as unknown as (name: string, color: string) => Promise<Tag>}
          onDeleteTag={NOOP_ASYNC}
          onAssign={NOOP}
          onArchive={NOOP}
          onSetAiPause={NOOP_ASYNC}
        />
        <HandoffStripe aiPausedUntil={conversation.aiPausedUntil} />
        <MessageList
          messages={messages}
          loading={false}
          hasMore={false}
          onLoadMore={NOOP}
          contact={{ displayName: contact.displayName, profilePicUrl: contact.profilePicUrl }}
        />
        <MessageInput onSend={NOOP} contactId={contact.id} sending={false} windowOpen demo />
      </div>
    </>
  )
}

// ─── Ficha do contato ─────────────────────────────────────────────────────────

export function ContactSurface({ at }: { at: HeroState }) {
  const conversation = heroConversation(at)
  return (
    <div className="flex w-full h-full">
      <ContactPanel
        conversation={conversation}
        allTags={HERO_TAGS}
        allUsers={[HERO_USER]}
        onClose={NOOP}
        onAddTag={NOOP as (t: Tag) => void}
        onRemoveTag={NOOP as (id: string) => void}
        onAssign={NOOP}
        onTransfer={NOOP}
        onArchive={NOOP}
        onCreateTag={NOOP_ASYNC as unknown as (name: string, color: string) => Promise<Tag>}
        onDeleteTag={NOOP_ASYNC}
        timelineEntries={heroTimeline(at)}
        stagesOverride={HERO_CONTACT_STAGES}
        dealsSlot={<HeroPanelDeals at={at} />}
        demo
      />
    </div>
  )
}

// ─── Funis ────────────────────────────────────────────────────────────────────

/**
 * O quadro, e o movimento do card — os dois dentro desta janela.
 *
 * O clone que viaja é anexado a uma CAMADA LOCAL desta superfície, não ao
 * `body`. Era o defeito apontado: um clone em coordenadas de tela podia
 * aparecer por cima da janela de Conversas, como se o card tivesse atravessado
 * para dentro do chat. Aqui ele nasce e morre dentro do funil, e o
 * deslocamento é convertido para as coordenadas locais dividindo pela escala
 * que a composição estiver aplicando à janela — por isso o movimento
 * acompanha a janela em vez de brigar com ela.
 */
export function PipelineSurface({ at, paused }: { at: HeroState; paused: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  useBoardFraming(hostRef, at)
  useCardTravel(hostRef, layerRef, at, paused)

  const porEtapa = heroDealsByStage(at)
  const todos = Object.values(porEtapa).flat()
  const kind = pipelineKindOption(HERO_PIPELINE.kind)
  const stats = boardStats(todos)
  const fontes = entrySources(todos)

  return (
    <div ref={hostRef} className="relative flex-1 min-w-0 flex flex-col overflow-hidden bg-surface-950">
      {/* A BARRA DO FUNIL, com os mesmos componentes e helpers da tela real
          (`BoardFilterBar`, `boardSummary`, `pipelineNoun`). Sem ela o Funil
          virava "um conjunto de cards coloridos": faltavam o nome do funil, o
          tipo e os totais — o contexto que diz de que tela se trata. Os
          controles são inertes como o resto do palco. */}
      <BoardFilterBar
        users={[HERO_USER]}
        /* `onOwnerChange`/`onCloseChange` são o que faz a barra DESENHAR os
           filtros. Sem eles a Hero reutilizava o componente e mostrava uma
           barra sem os controles — reutilização sem fidelidade. Aqui os
           callbacks existem e são inertes, como todo o resto do palco. */
        owner="all"
        onOwnerChange={NOOP}
        close="all"
        onCloseChange={NOOP}
        summary={boardSummary(todos)}
        isProcess={false}
        noun={pipelineNoun(HERO_PIPELINE)}
        summaryTitle={`${stats.open} em aberto · ${fontes.length} origens`}
        lead={
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bd2)] bg-surface-900 text-xs font-semibold text-surface-100 flex-shrink-0">
            <kind.icon className="w-3.5 h-3.5" style={{ color: HERO_PIPELINE.color }} />
            {HERO_PIPELINE.name}
          </span>
        }
      />
      <div className="relative flex-1 min-h-0 flex">
        <DealsBoard
          stages={HERO_PIPELINE_STAGES}
          dealsByStage={porEtapa}
          pipeline={HERO_PIPELINE}
          pipelines={[HERO_PIPELINE]}
          users={[HERO_USER]}
          onMoveStage={NOOP}
          /* A faixa de contexto fica DESLIGADA, como em `PipelineBoardTab`:
             na tela real esse conteúdo virou o tooltip do resumo da barra.
             Reativá-la deixava a Hero diferente da produção. */
          showContextStrip={false}
          /* Seleção só quando a história a representa — no avanço, quando o
             registro é o alvo da ação. Mantê-la sempre ligada era realce
             cinematográfico disfarçado de estado do produto. */
          selectedDealId={reached(at, 'avanco') ? heroDeal(at).id : null}
        />
        {/* Camada local de transição: tudo que voa fica aqui dentro. */}
        <div ref={layerRef} aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden" />
      </div>
    </div>
  )
}

/**
 * Enquadramento horizontal do quadro.
 *
 * O funil tem cinco etapas e não cabe inteiro na janela; o `DealsBoard` real
 * rola na horizontal. Sem isto a janela abriria em *Entrada* — negócios de
 * terceiros — enquanto a história fala do card da Marina. E como o palco é
 * `inert`, o visitante não poderia rolar. Rola o contêiner DO QUADRO, nunca
 * `scrollIntoView`, que arrastaria a página junto.
 */
function useBoardFraming(hostRef: React.RefObject<HTMLElement | null>, at: HeroState) {
  useEffect(() => {
    const host = hostRef.current
    const card = host?.querySelector<HTMLElement>('[data-deal-id="demo-deal-0"]')
    const coluna = card?.closest<HTMLElement>('.snap-start')
    const scroller = host?.querySelector<HTMLElement>('.overflow-x-auto')
    if (!scroller || !coluna) return
    const max = scroller.scrollWidth - scroller.clientWidth
    if (max <= 0) return
    const alvo = Math.max(0, Math.min(max, coluna.offsetLeft - 20))
    if (Math.abs(scroller.scrollLeft - alvo) < 4) return
    scroller.scrollTo({ left: alvo, behavior: 'smooth' })
  }, [hostRef, at])
}

function useCardTravel(
  hostRef: React.RefObject<HTMLElement | null>,
  layerRef: React.RefObject<HTMLElement | null>,
  at: HeroState,
  paused: boolean,
) {
  const antes = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const anim = useRef<Animation | null>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    const layer = layerRef.current
    const el = host?.querySelector<HTMLElement>('[data-deal-id="demo-deal-0"]')
    if (!host || !layer || !el) { antes.current = null; return }

    // Escala que a composição está aplicando a esta janela. Sem dividir por
    // ela, o deslocamento sairia com o tamanho errado quando a janela não está
    // em 1:1.
    const hostBox = host.getBoundingClientRect()
    const escala = hostBox.width / (host.offsetWidth || 1)
    const r = el.getBoundingClientRect()
    const agora = {
      x: (r.left - hostBox.left) / escala,
      y: (r.top - hostBox.top) / escala,
      w: r.width / escala,
      h: r.height / escala,
    }
    const anterior = antes.current
    antes.current = agora
    if (!anterior) return

    const dx = anterior.x - agora.x
    const dy = anterior.y - agora.y
    // Só viaja quando muda de COLUNA; reflow de poucos pixels não é "o card
    // andando".
    if (Math.abs(dx) < 40) return
    if (typeof el.animate !== 'function') return

    const clone = el.cloneNode(true) as HTMLElement
    clone.setAttribute('aria-hidden', 'true')
    Object.assign(clone.style, {
      position: 'absolute',
      left: `${agora.x}px`,
      top: `${agora.y}px`,
      width: `${agora.w}px`,
      height: `${agora.h}px`,
      margin: '0',
      pointerEvents: 'none',
    })
    layer.appendChild(clone)
    el.style.visibility = 'hidden'

    const a = clone.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, boxShadow: 'var(--shadow-overlay)' },
        { offset: 0.72, boxShadow: 'var(--shadow-overlay)' },
        { transform: 'translate(0, 0)', boxShadow: 'none' },
      ],
      { duration: 900, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' },
    )
    anim.current = a
    const limpar = () => {
      clone.remove()
      el.style.visibility = ''
      if (anim.current === a) anim.current = null
    }
    a.addEventListener('finish', limpar)
    a.addEventListener('cancel', limpar)
    return () => { a.cancel() }
  }, [hostRef, layerRef, at])

  // Pausar congela também o card.
  useEffect(() => {
    const a = anim.current
    if (!a) return
    if (paused) a.pause()
    else if (a.playState === 'paused') a.play()
  }, [paused, at])
}
