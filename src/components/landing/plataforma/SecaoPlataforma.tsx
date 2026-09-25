import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { LinkButton } from '@/components/ui/LinkButton'
import { TemplatePreview } from '@/components/campaigns/TemplatePreview'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { ConversationActivitySection } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { DealSummary } from '@/components/deals/DealSummary'
import type { DealStageHistoryEntry } from '@/types'
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
  // Quadro do funil, panorâmico: Qualificação, Proposta e Negociação — o card
  // anda entre as duas primeiras, e a terceira mostra que o funil continua.
  funil: { x: 318, y: 92, w: 790, h: 285 },
  // A gaveta do relatório da campanha.
  relatorio: { x: 684, y: 0, w: 596, h: 640 },
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

/** As passagens de etapa do negócio da história, como o painel do negócio as
 *  mostra (mesmas linhas do backend de demonstração, `deals/:id/history`). */
const HISTORICO_GANHO: DealStageHistoryEntry[] = [
  { id: 'h-3', fromStageId: 'ps-proposta', fromStageLabel: 'Proposta', toStageId: 'ps-ganho', toStageLabel: 'Ganho', movedByKind: 'user', movedByActorName: 'Ana Prado', createdAt: new Date(Date.now() - 60_000).toISOString() },
  { id: 'h-2', fromStageId: 'ps-qualificacao', fromStageLabel: 'Qualificação', toStageId: 'ps-proposta', toStageLabel: 'Proposta', movedByKind: 'ai', movedByActorName: 'Agente Vendas', createdAt: new Date(Date.now() - 6 * 60_000).toISOString() },
  { id: 'h-1', fromStageId: 'ps-entrada', fromStageLabel: 'Entrada', toStageId: 'ps-qualificacao', toStageLabel: 'Qualificação', movedByKind: 'user', movedByActorName: 'Ana Prado', createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
] as DealStageHistoryEntry[]

/** O visual real de cada cartão de benefício. */
function VisualCartao({ bloco, i }: { bloco: string; i: number }) {
  const contatoMarina = { displayName: HERO.person, profilePicUrl: null }
  const mensagem = (id: string) => heroMessages('humano').find((m) => m.id === id)!
  const chave = `${bloco}-${i}`
  switch (chave) {
    case 'atender-0':
      // Close na lista: o cabeçalho "Timeline · Hoje" fica fora do quadro.
      return <div className="overflow-hidden px-3"><div className="-mt-[58px] -mb-3"><ConversationActivitySection conversationId="demo-conv-0" entries={heroTimeline('etiqueta')} /></div></div>
    case 'atender-1':
      return <div className="px-3 py-1"><MessageBubble message={mensagem('demo-m-6')} contact={contatoMarina} showAvatar /></div>
    case 'equipe-0':
      // O sino inteiro: a transferência chega no topo, acima do que já estava lá.
      return <div className="py-1">{heroNotifications('assumido').map((n) => <NotificationItem key={n.id} n={n} onClick={NOOP} />)}</div>
    case 'equipe-1':
      return (
        <div className="p-3">
          {/* Fechado em Ganho, com as passagens abertas: quem moveu cada etapa —
              a IA avançou, a Ana fechou. */}
          <DealSummary density="card" closed deal={heroDeal('ganho')} pipeline={HERO_PIPELINE} onReopen={NOOP}
            history={HISTORICO_GANHO} onToggleHistory={NOOP} testIdPrefix="plat" testIdKey="ganho" />
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
      return <div className="overflow-hidden px-3"><div className="-mt-[58px] -mb-3"><ConversationActivitySection conversationId="demo-conv-0" entries={heroTimeline('avanco').slice(-2)} /></div></div>
    case 'campanhas-0':
      return <div className="pointer-events-none"><TemplatePreview template={HERO_TEMPLATE} variables={HERO_TEMPLATE_VARIAVEIS} variant="frame" compact /></div>
    case 'campanhas-1':
      return <div className="py-1">{heroNotifications('demanda').map((n) => <NotificationItem key={n.id} n={n} onClick={NOOP} />)}</div>
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

/**
 * COMPOSIÇÃO de cada recurso (25/09) — promessa, operação visível e dois
 * benefícios lidos como UMA história. O arranjo segue a proporção do recorte,
 * em vez de uma grade idêntica para todos:
 *  • `lado`  — a demonstração é a superfície principal e os benefícios formam
 *    uma coluna ao lado, esticada até a altura da moldura (topo e base
 *    alinhados). Conversas (recorte ~1,3 : 1) leva a moldura mais larga;
 *    o relatório de campanhas (vertical) divide o espaço mais por igual.
 *  • `largo` — recorte panorâmico (o quadro do funil): a moldura ocupa a
 *    coluna inteira e os benefícios fazem uma fileira logo abaixo.
 * Duas colunas só a partir de `xl` (a coluna de conteúdo passa de ~1000 px);
 * abaixo, empilha título → demonstração → benefícios, com folgas curtas.
 */
const COMPOSICAO: Record<string, { tipo: 'lado' | 'largo'; demo?: string }> = {
  atender: { tipo: 'lado', demo: '64%' },
  equipe: { tipo: 'lado', demo: '64%' },
  funil: { tipo: 'largo' },
  campanhas: { tipo: 'lado', demo: '55%' },
}

type Bloco = (typeof plataforma.blocos)[number]

/** Um benefício: o componente real em cima, a frase embaixo. */
function Beneficio({ bloco, i, c, esticar }: { bloco: string; i: number; c: Bloco['cartoes'][number]; esticar: boolean }) {
  return (
    <Revelar atraso={0.15 + i * 0.08} className={cn('flex', esticar && 'min-h-0 flex-1')}>
      {/* Altura do visual pelo CONTEÚDO: a caixa fixa de 168 px deixava um item
          de uma linha solto num vão e cortava o modelo de mensagem. */}
      <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-[var(--landing-cartao)] ring-1 ring-[var(--landing-borda)]">
        <div className={cn('flex flex-1 flex-col justify-center overflow-hidden border-b border-[var(--landing-borda)] bg-surface-950 py-1.5', esticar ? 'min-h-0' : 'min-h-[112px]')}>
          <div aria-hidden inert className="pointer-events-none select-none">
            <VisualCartao bloco={bloco} i={i} />
          </div>
        </div>
        <div className="px-5 pb-4 pt-3.5">
          <p className="text-[15px] font-semibold text-surface-50">{c.titulo}</p>
          <p className="mt-1 text-[14px] leading-snug text-surface-400">{c.texto}</p>
        </div>
      </div>
    </Revelar>
  )
}

function ArtigoRecurso({ b, registrar }: { b: Bloco; registrar: (el: HTMLElement | null) => void }) {
  const h = HISTORIAS[b.id]
  const comp = COMPOSICAO[b.id]
  const largo = useMediaQuery('(min-width: 1280px)')
  const lado = largo && comp.tipo === 'lado'
  // A largura máxima que a moldura aguenta neste viewport (orçamento de
  // altura + teto de ampliação), medida pelo próprio recorte.
  const [limite, setLimite] = useState(0)
  const colunaDemo = limite ? `min(${limite}px, ${comp.demo ?? '100%'})` : comp.demo ?? '100%'

  return (
    <article id={`plataforma-${b.id}`} data-bloco={b.id} ref={registrar} className="scroll-mt-28">
      {/* A promessa */}
      <Revelar className="max-w-[44rem]">
        <p className="lg:hidden mb-3 text-[12px] font-semibold uppercase tracking-[.12em] text-[var(--landing-destaque)]">{b.indice}</p>
        <h3 className="font-display font-semibold tracking-[-0.02em] leading-[1.25] text-[clamp(1.25rem,2.2vw,1.625rem)] text-balance">
          <span className="text-surface-50">{b.destaque}</span>{' '}
          <span className="text-surface-400">{b.texto}</span>
        </h3>
      </Revelar>

      <div
        className={cn('mt-6 sm:mt-8 grid gap-4 sm:gap-5', lado && 'items-stretch gap-6')}
        style={lado ? { gridTemplateColumns: `minmax(0, ${colunaDemo}) minmax(260px, 1fr)` } : undefined}
      >
        {/* A operação, na tela */}
        <Revelar atraso={0.1} className="min-w-0" >
          <div style={{ maxWidth: limite || undefined }}>
            <DemoRecorte titulo={h.titulo} rota={h.rota} estado={h.estado} cues={h.cues} recorte={h.recorte} onLimite={setLimite} />
          </div>
        </Revelar>

        {/* Os dois benefícios: coluna ao lado (esticada até a base da
            moldura) ou fileira embaixo. */}
        {/* Lado a lado, a MOLDURA define a altura da linha: a coluna tem altura
            zero no cálculo da grade e estica até 100 % — topo e base alinhados
            com a demonstração, e só a folga do visual absorve diferenças. */}
        <div
          className={lado ? 'flex min-h-full flex-col gap-4' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5'}
          style={lado ? { height: 0 } : undefined}
        >
          {b.cartoes.map((c, i) => <Beneficio key={c.titulo} bloco={b.id} i={i} c={c} esticar={lado} />)}
        </div>
      </div>
    </article>
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
    <section id="plataforma" data-section="plataforma" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        {/* Cabeçalho da seção */}
        <Revelar className="max-w-[46rem]">
          <p className="inline-flex rounded-full bg-brand-500/10 px-2.5 py-1 text-[12px] font-semibold text-[var(--landing-destaque)] ring-1 ring-brand-500/20">
            {plataforma.eyebrow}
          </p>
          <h2 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.75rem,3.4vw,2.75rem)] text-balance">
            <span className="text-surface-50">{plataforma.title}</span>{' '}
            <span className="text-surface-500">{plataforma.titleCinza}</span>
          </h2>
        </Revelar>

        <div className="mt-14 sm:mt-20 grid gap-10 lg:grid-cols-[180px_1fr] lg:gap-12">
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
            {plataforma.blocos.map((b) => (
              <ArtigoRecurso key={b.id} b={b} registrar={(el) => { blocosRef.current[b.id] = el }} />
            ))}

            {/* Fecho da seção: a ação de conversão. */}
            <Revelar>
              <div className="flex flex-col items-start gap-4 rounded-2xl bg-[var(--landing-cartao)] p-6 ring-1 ring-[var(--landing-borda)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
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
