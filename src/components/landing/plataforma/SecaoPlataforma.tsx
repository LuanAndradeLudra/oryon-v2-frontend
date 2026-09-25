import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LinkButton } from '@/components/ui/LinkButton'
import { TemplatePreview } from '@/components/campaigns/TemplatePreview'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { ConversationActivitySection } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { DealSummary } from '@/components/deals/DealSummary'
import { MessageBubble } from '@/components/conversations/ChatWindow/MessageBubble'
import { contato, linkContato, plataforma } from '../landingCopy'
import { DemoRecorte, type Recorte } from './DemoRecorte'
import {
  HERO, HERO_PIPELINE, HERO_TEMPLATE, HERO_TEMPLATE_VARIAVEIS, heroDeal, heroMessages, heroNotifications, heroTimeline,
} from '../stage/hero/heroRealData'
import { HERO_ROTAS, type HeroCena, type HeroState } from '../stage/hero/heroStory'
import type { HeroCue } from '../stage/hero/useHeroTimeline'

/**
 * A SEÇÃO PLATAFORMA — o coração da página (padrão medido na Attio, 25/09).
 *
 * Rolagem NORMAL (nada de tela travada): à esquerda, um índice fixo com os
 * trabalhos que o cliente precisa fazer, o atual aceso conforme a pessoa desce;
 * à direita, um bloco por trabalho:
 *
 *  1. a afirmação — o destaque em branco, a explicação em cinza;
 *  2. um RECORTE do Oryon real, ampliado na região que importa, contando a sua
 *     própria mini-história (o chat, o funil, a gaveta do relatório);
 *  3. dois cartões de benefício, cada um com um componente real do produto.
 *
 * Nível de consciência: o Hero disse O QUE é; aqui o visitante vê COMO resolve
 * cada problema dele — de "o que é isso" para "é exatamente o que eu preciso".
 */

type Cue = HeroCue<HeroState, HeroCena>
const S = (t: number, state: HeroState): Cue => ({ t, state })

/** Regiões do app (1280 × 720) — medidas no app real em 25/09. */
const RECORTES: Record<string, Recorte> = {
  // Conversa + painel do contato.
  conversa: { x: 421, y: 44, w: 859, h: 676 },
  // Quadro do funil: Qualificação e Proposta, onde o card anda.
  funil: { x: 318, y: 92, w: 548, h: 340 },
  // A gaveta do relatório da campanha.
  relatorio: { x: 676, y: 0, w: 604, h: 640 },
}

interface Historia { rota: string; estado: HeroState; cues: readonly Cue[]; recorte: Recorte; titulo: string }

const HISTORIAS: Record<string, Historia> = {
  atender: {
    titulo: 'Oryon · Conversas',
    rota: HERO_ROTAS.conversa, estado: 'inicio', recorte: RECORTES.conversa,
    cues: [
      { t: 0, state: 'inicio', composition: 'conversa' },
      S(1400, 'demanda'), S(3800, 'resposta'), S(7800, 'confirma'), S(9600, 'situacao'), S(11600, 'etiqueta'),
      S(15800, 'etiqueta'),
    ],
  },
  equipe: {
    titulo: 'Oryon · Conversas',
    rota: HERO_ROTAS.conversa, estado: 'avanco', recorte: RECORTES.conversa,
    cues: [
      { t: 0, state: 'avanco', composition: 'conversa' },
      S(1400, 'pedido'), S(3800, 'assumido'), S(6600, 'humano'), S(9800, 'ganho'),
      S(13800, 'ganho'),
    ],
  },
  funil: {
    titulo: 'Oryon · Funis · Vendas',
    rota: HERO_ROTAS.funil, estado: 'etiqueta', recorte: RECORTES.funil,
    cues: [
      { t: 0, state: 'etiqueta', composition: 'funil' },
      S(2200, 'avanco'),
      S(7600, 'avanco'),
    ],
  },
  campanhas: {
    titulo: 'Oryon · Disparos',
    rota: HERO_ROTAS.disparos, estado: 'inicio', recorte: RECORTES.relatorio,
    cues: [
      { t: 0, state: 'inicio', composition: 'disparos' },
      { t: 1600, composition: 'relatorio' },
      { t: 9600, composition: 'relatorio' },
    ],
  },
}

const NOOP = () => {}

/** O visual real de cada cartão de benefício. */
function VisualCartao({ bloco, i }: { bloco: string; i: number }) {
  const contatoMarina = { displayName: HERO.person, profilePicUrl: null }
  const mensagem = (id: string) => heroMessages('humano').find((m) => m.id === id)!
  const chave = `${bloco}-${i}`
  switch (chave) {
    case 'atender-0':
      return <div className="px-3"><ConversationActivitySection conversationId="demo-conv-0" entries={heroTimeline('etiqueta')} /></div>
    case 'atender-1':
      return <div className="px-3 py-3"><MessageBubble message={mensagem('demo-m-6')} contact={contatoMarina} showAvatar /></div>
    case 'equipe-0':
      return <div className="py-1">{heroNotifications('assumido').filter((n) => n.type === 'agent_handoff').map((n) => <NotificationItem key={n.id} n={n} onClick={NOOP} />)}</div>
    case 'equipe-1':
      return (
        <div className="p-3">
          <DealSummary density="card" closed deal={heroDeal('ganho')} pipeline={HERO_PIPELINE} onReopen={NOOP}
            history={undefined} onToggleHistory={NOOP} showReopenHistory={false} testIdPrefix="plat" testIdKey="ganho" />
        </div>
      )
    case 'funil-0':
      return (
        <div className="p-3">
          <DealSummary density="card" deal={heroDeal('avanco')} pipeline={HERO_PIPELINE} contactName={HERO.person}
            moveOpen={false} onToggleMove={NOOP} onMove={NOOP} onOpen={NOOP} testIdPrefix="plat" testIdKey="proposta" />
        </div>
      )
    case 'funil-1':
      return <div className="px-3"><ConversationActivitySection conversationId="demo-conv-0" entries={heroTimeline('avanco').slice(-2)} /></div>
    case 'campanhas-0':
      return <div className="pointer-events-none"><TemplatePreview template={HERO_TEMPLATE} variables={HERO_TEMPLATE_VARIAVEIS} variant="frame" compact /></div>
    case 'campanhas-1':
      return <div className="py-1">{heroNotifications('demanda').filter((n) => n.type === 'campaign_complete').map((n) => <NotificationItem key={n.id} n={n} onClick={NOOP} />)}</div>
    default:
      return null
  }
}

/** Entrada de um bloco ao chegar na tela: sobe e nitidez, uma vez. */
function Revelar({ children, atraso = 0, className }: { children: ReactNode; atraso?: number; className?: string }) {
  const semMovimento = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={semMovimento ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.9, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function SecaoPlataforma() {
  const [ativo, setAtivo] = useState<string>(plataforma.blocos[0].id)
  const blocosRef = useRef<Record<string, HTMLElement | null>>({})

  // Índice: o bloco que ocupa o meio da tela é o aceso.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) setAtivo((e.target as HTMLElement).dataset.bloco!)
    }, { rootMargin: '-45% 0px -50% 0px' })
    Object.values(blocosRef.current).forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  const irPara = (id: string) => blocosRef.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section id="plataforma" data-section="plataforma" className="relative border-t border-surface-800 bg-surface-950 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        {/* Cabeçalho da seção */}
        <Revelar className="max-w-[46rem]">
          <p className="inline-flex rounded-full bg-brand-500/10 px-2.5 py-1 text-[12px] font-semibold text-brand-400 ring-1 ring-brand-500/20">
            {plataforma.eyebrow}
          </p>
          <h2 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.75rem,3.4vw,2.75rem)] text-balance">
            <span className="text-surface-50">{plataforma.title}</span>{' '}
            <span className="text-surface-500">{plataforma.titleCinza}</span>
          </h2>
        </Revelar>

        <div className="mt-14 sm:mt-20 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          {/* Índice fixo */}
          <nav aria-label="Recursos da plataforma" className="hidden lg:block">
            <ol className="sticky top-28 flex flex-col gap-1">
              {plataforma.blocos.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => irPara(b.id)}
                    aria-current={ativo === b.id ? 'true' : undefined}
                    className={cn(
                      'group relative w-full rounded-md py-1.5 pl-4 text-left text-[14px] font-medium transition-colors duration-300',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)]',
                      ativo === b.id ? 'text-surface-50' : 'text-surface-500 hover:text-surface-300',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full transition-all duration-300',
                        ativo === b.id ? 'bg-brand-400 opacity-100' : 'bg-surface-700 opacity-60',
                      )}
                    />
                    {b.indice}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {/* Os blocos */}
          <div className="flex min-w-0 flex-col gap-24 sm:gap-36">
            {plataforma.blocos.map((b) => {
              const h = HISTORIAS[b.id]
              return (
                <article
                  key={b.id}
                  id={`plataforma-${b.id}`}
                  data-bloco={b.id}
                  ref={(el) => { blocosRef.current[b.id] = el }}
                  className="scroll-mt-28"
                >
                  <Revelar className="max-w-[40rem]">
                    <p className="lg:hidden mb-3 text-[12px] font-semibold uppercase tracking-[.12em] text-brand-400">{b.indice}</p>
                    <h3 className="font-display font-semibold tracking-[-0.02em] leading-[1.25] text-[clamp(1.25rem,2.2vw,1.625rem)] text-balance">
                      <span className="text-surface-50">{b.destaque}</span>{' '}
                      <span className="text-surface-400">{b.texto}</span>
                    </h3>
                  </Revelar>

                  <Revelar atraso={0.1} className="mt-8">
                    <DemoRecorte titulo={h.titulo} rota={h.rota} estado={h.estado} cues={h.cues} recorte={h.recorte} />
                  </Revelar>

                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {b.cartoes.map((c, i) => (
                      <Revelar key={c.titulo} atraso={0.15 + i * 0.08}>
                        <div className="h-full overflow-hidden rounded-2xl bg-surface-900 ring-1 ring-surface-800">
                          <div className="relative h-[168px] overflow-hidden border-b border-surface-800 bg-surface-950">
                            <div aria-hidden inert className="pointer-events-none select-none">
                              <VisualCartao bloco={b.id} i={i} />
                            </div>
                            {/* Degradê de corte: o componente continua além da moldura. */}
                            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-950 to-transparent" />
                          </div>
                          <div className="p-5">
                            <p className="text-[15px] font-semibold text-surface-50">{c.titulo}</p>
                            <p className="mt-1 text-[14px] leading-snug text-surface-400">{c.texto}</p>
                          </div>
                        </div>
                      </Revelar>
                    ))}
                  </div>
                </article>
              )
            })}

            {/* Fecho da seção: a ação de conversão. */}
            <Revelar>
              <div className="flex flex-col items-start gap-4 rounded-2xl bg-surface-900 p-6 ring-1 ring-surface-800 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <p className="max-w-[34ch] font-display text-[20px] font-semibold leading-snug tracking-[-0.01em] text-surface-50">
                  Veja o Oryon atendendo no seu WhatsApp.
                  <span className="block text-surface-400 text-[15px] font-medium mt-1">Converse com o nosso Agente IA — ele mesmo te mostra.</span>
                </p>
                <LinkButton
                  href={linkContato()}
                  target={contato.whatsapp ? '_blank' : undefined}
                  rel={contato.whatsapp ? 'noopener noreferrer' : undefined}
                  size="lg"
                  className="flex-none"
                  leftIcon={<MessageCircle className="h-4 w-4" strokeWidth={2.2} />}
                >
                  {contato.ctaLongo}
                </LinkButton>
              </div>
            </Revelar>
          </div>
        </div>
      </div>
    </section>
  )
}
