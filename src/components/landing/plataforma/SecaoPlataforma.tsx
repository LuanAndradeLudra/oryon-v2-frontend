import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LinkButton } from '@/components/ui/LinkButton'
import { TemplatePreview } from '@/components/campaigns/TemplatePreview'
import { StatStrip } from '@/components/campaigns/StatStrip'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { ConversationActivitySection } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { DealSummary } from '@/components/deals/DealSummary'
import type { DealStageHistoryEntry } from '@/types'
import { MessageBubble } from '@/components/conversations/ChatWindow/MessageBubble'
import { contato, linkContato, plataforma } from '../landingCopy'
import { DemoRecorte, type Recorte } from './DemoRecorte'
import {
  HERO, HERO_PIPELINE, HERO_TEMPLATE, HERO_TEMPLATE_VARIAVEIS, heroCampaigns, heroDeal, heroMessages, heroNotifications, heroTimeline,
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
  // A partir de x = 330: em 318 entrava uma fatia da coluna Entrada, que parecia corte acidental.
  funil: { x: 330, y: 92, w: 780, h: 262 },
  // A gaveta do relatório da campanha.
  // Até a legenda do gráfico (a 640 px ela saía cortada).
  relatorio: { x: 684, y: 0, w: 596, h: 656 },
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
    // Direto no relatório: começando na lista de Disparos, o recorte (a metade
    // direita da tela) mostrava só faixas vazias até a gaveta abrir.
    cues: [
      { t: 0, state: 'inicio', composition: 'relatorio' },
      { t: 9600, composition: 'relatorio' },
    ],
  },
}

const NOOP = () => {}

/** As contagens da campanha CONCLUÍDA — os mesmos números da notificação que
 *  aparece em cima delas no cartão ("1.231 enviadas · 9 falhas"). */
const CONTAGENS_CAMPANHA = (() => {
  const st = heroCampaigns('ganho')[0].stats
  const n = (v: number | undefined) => (v ?? 0).toLocaleString('pt-BR')
  return [
    { label: 'Entregues', value: n(st.delivered) },
    { label: 'Lidas', value: n(st.read) },
    { label: 'Respostas', value: n(st.replied) },
    { label: 'Conversões', value: n(st.conversions) },
  ]
})()

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
      // A notificação de campanha concluída e as CONTAGENS dela, em pessoas.
      // Componentes sem dependência de contexto do app: o cartão da
      // tela Disparos exige o provedor de número do workspace e derrubava a
      // landing (medido em 25/09).
      return (
        <div className="py-1">
          {heroNotifications('demanda').filter((n) => n.type === 'campaign_complete').map((n) => <NotificationItem key={n.id} n={n} onClick={NOOP} />)}
          <div className="px-4 pb-2 pt-1">
            <StatStrip items={CONTAGENS_CAMPANHA} />
          </div>
        </div>
      )
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
 * COMPOSIÇÃO de cada recurso (25/09, 3ª rodada) — promessa, operação visível e
 * dois benefícios lidos como UMA história.
 *
 *  • A demonstração mora num PALCO: uma faixa tingida (`--landing-palco`) que
 *    ocupa a coluna do recurso, com a moldura do app centrada — o padrão
 *    medido na Attio (a interface num fundo levemente tingido que preenche a
 *    largura). A folga do palco absorve a diferença de altura entre a moldura
 *    e os benefícios: nada é esticado nem cortado.
 *  • O arranjo segue a proporção do recorte e a largura REAL do artigo
 *    (medida, não breakpoint): com 940 px ou mais, os recortes compactos
 *    (Conversas, o relatório vertical de campanhas) levam os benefícios numa
 *    coluna ao lado; o quadro panorâmico do funil leva os benefícios numa
 *    fileira embaixo. Abaixo de 940 px, todos empilham: palco → benefícios.
 */
const COMPOSICAO: Record<string, { tipo: 'lado' | 'largo'; palco?: number; beneficios?: number }> = {
  // Conversas: a moldura mais larga (chat + painel do contato precisam de leitura).
  atender: { tipo: 'lado', palco: 1.8, beneficios: 1 },
  equipe: { tipo: 'lado', palco: 1.8, beneficios: 1 },
  funil: { tipo: 'largo' },
  // O relatório é vertical: a moldura estreita, os benefícios com mais largura.
  campanhas: { tipo: 'lado', palco: 1.15, beneficios: 1 },
}

/** Largura mínima do artigo para benefícios ao lado da demonstração. */
const ARTIGO_LADO_MIN = 940

type Bloco = (typeof plataforma.blocos)[number]

/** Um benefício: o componente real em cima, a frase embaixo — altura pelo conteúdo. */
function Beneficio({ bloco, i, c, esticar }: { bloco: string; i: number; c: Bloco['cartoes'][number]; esticar: boolean }) {
  return (
    // Ao lado do palco, os dois cartões dividem a altura dele (flex-1): a
    // folga vai para a área do visual, centrado — nunca um vão entre eles.
    <Revelar atraso={0.15 + i * 0.08} className={cn('flex', esticar && 'flex-1')}>
      <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-[var(--landing-cartao)] ring-1 ring-[var(--landing-borda)]">
        <div className="flex min-h-[104px] flex-1 flex-col justify-center border-b border-[var(--landing-borda)] bg-surface-950 py-1.5">
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

function ArtigoRecurso({ b, n, registrar }: { b: Bloco; n: number; registrar: (el: HTMLElement | null) => void }) {
  const h = HISTORIAS[b.id]
  const comp = COMPOSICAO[b.id]
  const ref = useRef<HTMLElement | null>(null)
  // Largura REAL do artigo — decide o arranjo (não o breakpoint da viewport).
  const [largura, setLargura] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setLargura(el.clientWidth)
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  const lado = comp.tipo === 'lado' && largura >= ARTIGO_LADO_MIN
  // A largura máxima que a moldura aguenta neste viewport (orçamento de altura
  // + teto de ampliação), informada pelo próprio recorte.
  const [limite, setLimite] = useState(0)

  return (
    <article
      id={`plataforma-${b.id}`}
      data-bloco={b.id}
      data-arranjo={lado ? 'lado' : 'abaixo'}
      ref={(el) => { ref.current = el; registrar(el) }}
      className="scroll-mt-24"
    >
      {/* A promessa (curta, no H3) e a explicação (parágrafo à parte). */}
      <Revelar>
        <p className="text-[12px] font-semibold uppercase tracking-[.12em] text-[var(--landing-destaque)]">
          <span className="tabular-nums">{String(n).padStart(2, '0')}</span>
          <span aria-hidden className="mx-2 text-surface-600">·</span>
          {b.indice}
        </p>
        <h3 className="mt-3 font-display font-semibold tracking-[-0.022em] leading-[1.15] text-surface-50 text-[clamp(1.5rem,2.1vw,2rem)] text-balance">
          {b.destaque}
        </h3>
        <p className="mt-3 max-w-[58ch] text-[16px] sm:text-[17px] leading-relaxed text-surface-400 text-pretty">{b.texto}</p>
      </Revelar>

      <div
        className={cn('mt-7 grid gap-4 sm:gap-5', lado && 'gap-5')}
        style={lado ? { gridTemplateColumns: `minmax(0, ${comp.palco}fr) minmax(300px, ${comp.beneficios}fr)` } : undefined}
      >
        {/* A operação, na tela — num palco que preenche a coluna. */}
        <Revelar atraso={0.1} className="min-w-0">
          <div className={cn(
            'flex h-full items-center justify-center rounded-2xl bg-[var(--landing-palco)] p-2 ring-1 ring-[var(--landing-borda)] sm:px-[clamp(12px,2.2vw,32px)]',
            // Recorte panorâmico: menos folga vertical (o quadro já é baixo).
            comp.tipo === 'largo' ? 'sm:py-[clamp(10px,1.4vw,20px)]' : 'sm:py-[clamp(12px,2.2vw,32px)]',
          )}>
            <div className="w-full" style={{ maxWidth: limite || undefined }}>
              <DemoRecorte titulo={h.titulo} rota={h.rota} estado={h.estado} cues={h.cues} recorte={h.recorte} onLimite={setLimite}
                foraDoRecorte={lado ? undefined : 170} />
            </div>
          </div>
        </Revelar>

        {/* Os dois benefícios: coluna ao lado (topo e base na linha do palco) ou
            fileira embaixo. Altura pelo conteúdo — nada cortado. */}
        <div className={lado ? 'flex flex-col gap-4' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5'}>
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
    <section id="plataforma" data-section="plataforma" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-24">
      {/* GRADE FLUIDA (25/09, 3ª rodada): até 1520 px, com margens que acompanham
          a viewport (16–72 px). O índice é uma FAIXA da grade só a partir de
          1280 px, separado dos artigos por um fio — abaixo disso ele
          competiria com a demonstração, e cada artigo traz o próprio rótulo
          numerado. */}
      <div className="landing-container">
        {/* Cabeçalho da seção */}
        <Revelar className="max-w-[64rem]">
          <p className="inline-flex rounded-full bg-brand-500/10 px-2.5 py-1 text-[12px] font-semibold text-[var(--landing-destaque)] ring-1 ring-brand-500/20">
            {plataforma.eyebrow}
          </p>
          <h2 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.75rem,3.4vw,2.75rem)] text-balance">
            <span className="text-surface-50">{plataforma.title}</span>{' '}
            <span className="text-surface-500">{plataforma.titleCinza}</span>
          </h2>
        </Revelar>

        <div className="mt-12 sm:mt-16 xl:grid xl:grid-cols-[clamp(212px,14vw,244px)_minmax(0,1fr)]">
          {/* Índice fixo */}
          <nav aria-label="Recursos da plataforma" className="hidden xl:block">
            <ol className="sticky top-[104px] flex flex-col gap-1 pr-4">
              {plataforma.blocos.map((b, i) => (
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
                    <span className="mr-2 tabular-nums text-[11px] text-surface-500">{String(i + 1).padStart(2, '0')}</span>
                    {b.indice}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {/* Os recursos: separados por um fio; o fio vertical à esquerda liga o
              índice à coluna (moldura de linhas finas, como a referência). */}
          <div className="min-w-0 xl:border-l xl:border-[var(--landing-borda)] xl:pl-[clamp(32px,3.6vw,64px)]">
            {plataforma.blocos.map((b, i) => (
              <div key={b.id} className={cn(i > 0 && 'mt-16 border-t border-[var(--landing-borda)] pt-16 sm:mt-20 sm:pt-20')}>
                <ArtigoRecurso b={b} n={i + 1} registrar={(el) => { blocosRef.current[b.id] = el }} />
              </div>
            ))}

            {/* Fecho da seção: a ação de conversão. */}
            <Revelar className="mt-16 sm:mt-20">
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
