import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { LinkButton } from '@/components/ui/LinkButton'
import { TemplatePreview } from '@/components/campaigns/TemplatePreview'
import { StatStrip } from '@/components/campaigns/StatStrip'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { ConversationActivitySection } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { DealSummary } from '@/components/deals/DealSummary'
import { MessageBubble } from '@/components/conversations/ChatWindow/MessageBubble'
import { TypingIndicator } from '@/components/conversations/ChatWindow/TypingIndicator'
import { KnowledgeDocArtifact } from '@/components/agents/KnowledgeDocArtifact'
import { StatusDonut } from '@/components/dashboard/StatusDonut'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import type { ActivityEvent } from '@/types/dashboard'
import { CONHECIMENTO_VENDAS } from '@/demo/agentesDemo'
import { heroActivityFeed, heroHomeSnapshot } from '@/demo/dashboardDemo'
import { ConteudoWhatsAppAparelho } from '../stage/hero/HeroSatelitesConteudo'
import { contato, contatoDisponivel, linkContato, plataforma } from '../landingCopy'
import { DemoRecorte, type Recorte } from './DemoRecorte'
import {
  HERO, HERO_PIPELINE, HERO_TEMPLATE, HERO_TEMPLATE_VARIAVEIS, heroCampaigns, heroDeal, heroHistoricoGanho, reached, heroMessages, heroNotifications, heroTimeline,
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
 *  2. um RECORTE da Oryon real, ampliado na região que importa, contando a sua
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
  // O detalhe do agente (medido: começa em x ≈ 360): cabeçalho, abas e a aba.
  agente: { x: 356, y: 44, w: 924, h: 676 },
  // O Dashboard de ponta a ponta: indicadores, volume, funil, fila e equipe —
  // um recorte mais estreito cortava cartões pela metade.
  painel: { x: 52, y: 56, w: 1222, h: 382 },
}

interface Historia { rota: string; estado: HeroState; cues: readonly Cue[]; recorte: Recorte; titulo: string }

const HISTORIAS: Record<string, Historia> = {
  // A configuração do agente, aba por aba: instruções → conhecimento → catálogo.
  conhecer: {
    titulo: 'Oryon · Agentes IA',
    rota: HERO_ROTAS['agente-instrucoes'], estado: 'inicio', recorte: RECORTES.agente,
    cues: [
      { t: 0, state: 'inicio', composition: 'agente-instrucoes' },
      { t: 4600, composition: 'agente-conhecimento' },
      { t: 9400, composition: 'agente-catalogo' },
      { t: 14800, composition: 'agente-catalogo' },
    ],
  },
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
  // O Dashboard no momento em que a Marina espera na fila: o holofote passa
  // pela fila, pelos indicadores e pelo volume da semana. A tela não muda de dado (o Dashboard
  // real busca uma vez ao abrir) — só o olhar percorre.
  medir: {
    titulo: 'Oryon · Relatórios',
    rota: HERO_ROTAS.painel, estado: 'assumido', recorte: RECORTES.painel,
    cues: [
      { t: 0, state: 'assumido', composition: 'painel' },
      { t: 2400, composition: 'painel-fila' },
      { t: 7000, composition: 'painel-indicadores' },
      { t: 11600, composition: 'painel-volume' },
      { t: 16200, composition: 'painel-volume' },
    ],
  },
}

const NOOP = () => {}

/** As contagens da campanha CONCLUÍDA — os mesmos números da notificação que
 *  aparece em cima delas no cartão ("1.231 enviadas · 9 falhas"). */
const CONTAGENS_CAMPANHA = (() => {
  const st = heroCampaigns('ganho')[0].stats
  const v = (x: number | undefined) => x ?? 0
  return [
    { label: 'Entregues', n: v(st.delivered) },
    { label: 'Lidas', n: v(st.read) },
    { label: 'Respostas', n: v(st.replied) },
    { label: 'Conversões', n: v(st.conversions) },
  ]
})()


/**
 * Uma peça que ENTRA em cena: sobe e ganha nitidez. Com `chave` nova, a peça
 * anterior sai e a nova entra — é assim que o cartão acompanha a história.
 */
function Surgir({ chave, children, className }: { chave: string | number; children: ReactNode; className?: string }) {
  const semMovimento = useReducedMotion()
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={chave}
        className={className}
        initial={semMovimento ? false : { opacity: 0, y: 10, filter: 'blur(3px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={semMovimento ? undefined : { opacity: 0, y: -6, filter: 'blur(2px)' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/** Um número que conta de zero até o valor quando entra (a cada volta da história). */
function Contador({ para }: { para: number }) {
  const semMovimento = useReducedMotion()
  const [valor, setValor] = useState(semMovimento ? para : 0)
  useEffect(() => {
    if (semMovimento) { setValor(para); return }
    const c = animate(0, para, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setValor(Math.round(v)) })
    return () => c.stop()
  }, [para, semMovimento])
  return <>{valor.toLocaleString('pt-BR')}</>
}

/**
 * O visual real de cada cartão de evidência — VIVO (25/09): o cartão reage à
 * mesma mini-história que a tela ao lado conta (\`at\` = o passo dela; \`ciclo\` =
 * quantas vezes o laço recomeçou). O que acontece na tela aparece no cartão no
 * mesmo momento, com os componentes reais do produto.
 */
function VisualCartao({ bloco, i, at, cena, ciclo }: { bloco: string; i: number; at: HeroState; cena: HeroCena; ciclo: number }) {
  const contatoMarina = { displayName: HERO.person, profilePicUrl: null }
  const mensagem = (id: string) => heroMessages('humano').find((m) => m.id === id)!
  const chave = `${bloco}-${i}`
  switch (chave) {
    case 'atender-0': {
      // As escritas da IA no CRM entram na linha do tempo quando acontecem;
      // antes, o estado vazio real do componente ("Nenhum evento no período").
      const entradas = heroTimeline(at)
      return (
        <Surgir chave={`${ciclo}-${entradas.length}`} className="overflow-hidden px-3">
          <div className="-mt-[58px] -mb-3"><ConversationActivitySection conversationId="demo-conv-0" entries={entradas} /></div>
        </Surgir>
      )
    }
    case 'conhecer-0':
      // O agente "digita" enquanto a tela mostra instruções e conhecimento; a
      // resposta à Marina chega quando o catálogo aparece — o valor e a
      // condição que ela cita estão na tela ao lado.
      return (
        <div className="px-3 py-1">
          <MessageBubble message={mensagem('demo-m-5')} contact={contatoMarina} showAvatar />
          <Surgir chave={`${ciclo}-${cena === 'agente-catalogo' ? 'resposta' : 'digitando'}`}>
            {cena === 'agente-catalogo'
              ? <MessageBubble message={mensagem('demo-m-6')} contact={contatoMarina} showAvatar />
              : <div className="flex justify-end"><TypingIndicator /></div>}
          </Surgir>
        </div>
      )
    case 'conhecer-1': {
      // O documento da base de conhecimento, no componente real de documento.
      const doc = CONHECIMENTO_VENDAS.find((d) => d.id === 'kd-renovacao')!
      return (
        <Surgir chave={`${ciclo}`} className="px-3 py-2">
          <KnowledgeDocArtifact title={doc.document_name} content={doc.content} readOnly />
        </Surgir>
      )
    }
    case 'atender-1':
      // O lado da cliente: o WhatsApp dela, com a pergunta e a resposta
      // chegando — um close da tela do aparelho.
      return (
        // A tela do aparelho tem tamanho próprio (390 × 760 a 60 %, como no Hero);
        // o zoom compensa a redução do cartão (0,66) para o texto do WhatsApp
        // ficar legível (≈ 0,75 do tamanho real), e o close mostra o fim da
        // conversa — onde a pergunta e a resposta chegam.
        <div className="flex h-[330px] items-end justify-center overflow-hidden">
          <div className="-mb-[24px] [zoom:1.9]" style={{ width: 234, height: 456 }}><ConteudoWhatsAppAparelho at={at} cena="conversa" /></div>
        </div>
      )
    case 'medir-0':
      // A distribuição por status (ativas, na fila, resolvidas) — o cartão do
      // Dashboard que o recorte não mostra.
      return <div className="px-2 py-1"><StatusDonut data={heroHomeSnapshot(at).statusDistribution} /></div>
    case 'medir-1': {
      const eventos = heroActivityFeed(at).map((l) => ({
        id: l.id, type: l.type as ActivityEvent['type'], actorName: l.actor,
        actorType: (l.metadata.actorType === 'ai' ? 'agent' : 'user') as ActivityEvent['actorType'],
        subject: l.subject, timestamp: l.timestamp,
      }))
      return <div className="relative h-[230px] overflow-hidden px-2 py-1"><ActivityFeed events={eventos} /></div>
    }
    case 'equipe-0': {
      // O sino: a transferência entra no topo quando a IA chama a Ana.
      const lista = heroNotifications(at)
      return (
        <div className="py-1">
          <AnimatePresence initial={false}>
            {lista.map((n) => (
              <motion.div
                key={`${ciclo}-${n.id}`}
                layout="position"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <NotificationItem n={n} onClick={NOOP} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )
    }
    case 'equipe-1': {
      // O negócio segue aberto em Proposta até a Ana fechar; aí vira Ganho,
      // com as passagens de etapa (a IA avançou, a Ana fechou).
      const deal = heroDeal(at)
      return (
        <Surgir chave={`${ciclo}-${deal.status}`} className="p-3">
          {deal.status === 'won'
            ? <DealSummary density="card" closed deal={deal} pipeline={HERO_PIPELINE} onReopen={NOOP}
                history={heroHistoricoGanho()} onToggleHistory={NOOP} testIdPrefix="plat" testIdKey="ganho" />
            : <DealSummary density="card" deal={deal} pipeline={HERO_PIPELINE} contactName={HERO.person}
                moveOpen={false} onToggleMove={NOOP} onMove={NOOP} onOpen={NOOP} testIdPrefix="plat" testIdKey="aberto" />}
        </Surgir>
      )
    }
    case 'funil-0': {
      // O resumo do negócio muda de etapa junto com o card no quadro.
      const deal = heroDeal(at)
      return (
        <Surgir chave={`${ciclo}-${deal.stageId}`} className="p-3">
          <DealSummary density="card" deal={deal} pipeline={HERO_PIPELINE} contactName={HERO.person}
            moveOpen={false} onToggleMove={NOOP} onMove={NOOP} onOpen={NOOP} testIdPrefix="plat" testIdKey="proposta" />
        </Surgir>
      )
    }
    case 'funil-1': {
      const entradas = heroTimeline(at).slice(-2)
      return (
        <Surgir chave={`${ciclo}-${heroTimeline(at).length}`} className="overflow-hidden px-3">
          <div className="-mt-[58px] -mb-3"><ConversationActivitySection conversationId="demo-conv-0" entries={entradas} /></div>
        </Surgir>
      )
    }
    case 'campanhas-0':
      // A mensagem da campanha CHEGA a cada volta da história.
      return (
        <Surgir chave={ciclo} className="pointer-events-none">
          <TemplatePreview template={HERO_TEMPLATE} variables={HERO_TEMPLATE_VARIAVEIS} variant="frame" compact />
        </Surgir>
      )
    case 'campanhas-1':
      // A notificação de campanha concluída e as contagens dela, contando a
      // partir de zero a cada volta. Componentes sem dependência de contexto do
      // app (o cartão da tela Disparos exige o provedor de número do workspace
      // e derrubava a landing, 25/09).
      return (
        <div className="py-1">
          {heroNotifications('demanda').filter((n) => n.type === 'campaign_complete').map((n) => <NotificationItem key={n.id} n={n} onClick={NOOP} />)}
          <div className="px-4 pb-2 pt-1">
            <StatStrip key={ciclo} items={CONTAGENS_CAMPANHA.map((it) => ({ label: it.label, value: <Contador para={it.n} /> }))} />
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
 * COMPOSIÇÃO de cada recurso (25/09, 4ª rodada) — promessa, operação visível e
 * duas evidências lidas como UMA unidade, que cabe na área útil da tela depois
 * de clicar no índice (viewport − cabeçalho fixo − folga de ancoragem).
 *
 * A demonstração mora num PALCO tingido; a largura do palco é a da moldura (o
 * limite que o próprio recorte informa: orçamento de altura + teto de
 * ampliação) mais a folga — nunca uma faixa larga com a moldura boiando. As
 * evidências ocupam TODO o resto da largura:
 *  • `lado` — Conversas: a tela à esquerda, as duas evidências empilhadas à
 *    direita, divididas na altura do palco;
 *  • `panoramico` — o funil: ampliar a tela larga também a deixaria alta e
 *    empurraria as evidências para fora da tela; então a moldura fica no
 *    tamanho legível e as evidências vão AO LADO;
 *  • `vertical` — o relatório de campanhas é alto e estreito: sobra largura
 *    para as duas evidências lado a lado, cada uma com a altura da tela —
 *    três colunas altas; sem largura para isso, elas empilham ao lado.
 * Sem largura para nada ao lado (tablet, celular), tudo empilha:
 * palco → evidências.
 */
type Arranjo = 'lado' | 'panoramico' | 'vertical' | 'abaixo'
const COMPOSICAO: Record<string, Arranjo> = {
  conhecer: 'lado',
  // Dashboard: tela larga demais para dividir a largura — evidências embaixo.
  medir: 'abaixo',
  atender: 'lado',
  equipe: 'lado',
  funil: 'panoramico',
  campanhas: 'vertical',
}

/** Largura mínima da coluna de evidências ao lado do palco. */
const EVIDENCIAS_MIN = 320
/** Largura mínima de cada evidência quando ficam lado a lado (arranjo vertical). */
// Três colunas altas só com largura folgada: abaixo disso, os cartões esticados
// até a altura da tela deixavam o conteúdo boiando em vãos (medido em 1440).
const EVIDENCIA_COLUNA_MIN = 420
const VAO = 20

/** Folga horizontal do palco (a mesma conta do CSS: clamp(7px, 1.3vw, 19px)). */
function folgaDoPalco() {
  if (typeof window === 'undefined') return 24
  return Math.round(Math.min(19, Math.max(7, window.innerWidth * 0.013)))
}

type Bloco = (typeof plataforma.blocos)[number]

/** Uma evidência: o componente real em cima, a frase embaixo. */
function Beneficio({ bloco, i, c, esticar, at, cena, ciclo }: { bloco: string; i: number; c: Bloco['cartoes'][number]; esticar: boolean; at: HeroState; cena: HeroCena; ciclo: number }) {
  return (
    // Esticada, a evidência divide a altura do palco (flex-1): a folga vai para
    // a área do visual, centrado — nunca um vão entre as duas.
    <Revelar atraso={0.15 + i * 0.08} className={cn('flex min-w-0', esticar && 'flex-1')}>
      <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-[var(--landing-cartao)] ring-1 ring-[var(--landing-borda)]">
        <div className="flex min-h-[104px] flex-1 flex-col justify-center border-b border-[var(--landing-borda)] bg-surface-950 py-1.5">
          <div aria-hidden inert className="pointer-events-none select-none [zoom:0.66]">
            <VisualCartao bloco={bloco} i={i} at={at} cena={cena} ciclo={ciclo} />
          </div>
        </div>
        <div className="px-5 pb-4 pt-3.5">
          <p className="text-[12px] font-semibold text-surface-50">{c.titulo}</p>
          <p className="mt-1 max-w-[52ch] text-[11.5px] leading-snug text-surface-400">{c.texto}</p>
        </div>
      </div>
    </Revelar>
  )
}

function ArtigoRecurso({ b, n, registrar }: { b: Bloco; n: number; registrar: (el: HTMLElement | null) => void }) {
  const h = HISTORIAS[b.id]
  const arranjo = COMPOSICAO[b.id]
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
  // A largura máxima da moldura neste viewport, informada pelo recorte. O funil
  // leva 70 % dela (pedido do PO, 25/09): o quadro panorâmico em tamanho cheio
  // dominava o recurso e empurrava as evidências.
  const [limite, setLimiteBruto] = useState(0)
  const fatorTela = arranjo === 'panoramico' ? 0.7 : 1
  const setLimite = useCallback((px: number) => setLimiteBruto(Math.round(px * fatorTela)), [fatorTela])
  const palco = limite ? limite + 2 * folgaDoPalco() : 0

  // Cabe algo ao lado do palco? E, no vertical, cabem as duas evidências lado a lado?
  const sobra = palco ? largura - palco - VAO : 0
  const aoLado = palco > 0 && sobra >= EVIDENCIAS_MIN && arranjo !== 'abaixo'
  const tresColunas = aoLado && arranjo === 'vertical' && sobra >= 2 * EVIDENCIA_COLUNA_MIN + VAO
  const preencher = aoLado && arranjo === 'panoramico'
  // Configurar agentes é desktop no próprio produto (no celular ele avisa "use
  // o desktop"): ali o capítulo conta a história só pelas evidências.
  const celular = !useMediaQuery('(min-width: 768px)')
  const semTela = celular && b.id === 'conhecer'
  // O passo da mini-história da tela — os cartões ao lado reagem a ele.
  const [passo, setPasso] = useState<HeroState>(h.estado)
  const [ciclo, setCiclo] = useState(0)
  const [cenaAtual, setCenaAtual] = useState<HeroCena>(h.cues[0].composition ?? 'conversa')
  const onPasso = useCallback((estado: HeroState, cena: HeroCena, indice: number) => {
    setPasso(estado)
    setCenaAtual(cena)
    if (indice === 0) setCiclo((n) => n + 1)
  }, [])
  const colunas = !aoLado ? undefined
    : tresColunas ? `${palco}px minmax(0, 1fr) minmax(0, 1fr)`
    : `${palco}px minmax(${EVIDENCIAS_MIN}px, 1fr)`

  return (
    <article
      id={`plataforma-${b.id}`}
      data-bloco={b.id}
      data-arranjo={!aoLado ? 'empilhado' : tresColunas ? 'tres-colunas' : 'lado'}
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
        <h3 className="mt-2.5 font-display font-semibold tracking-[-0.022em] leading-[1.15] text-surface-50 text-[clamp(0.98rem,1.33vw,1.27rem)] text-balance">
          {b.destaque}
        </h3>
        <p className="mt-2.5 max-w-[62ch] text-[12px] sm:text-[12.5px] leading-relaxed text-surface-400 text-pretty">{b.texto}</p>
      </Revelar>

      <div className="mt-6 grid gap-4 sm:gap-5" style={colunas ? { gridTemplateColumns: colunas, gap: VAO } : undefined}>
        {/* A operação, na tela. */}
        {!semTela && (
        <Revelar atraso={0.1} className="min-w-0">
          <div className={cn(
            'flex h-full justify-center rounded-2xl bg-[var(--landing-palco)]',
            // Funil ao lado das evidências: a moldura ocupa a altura do palco.
            preencher ? 'items-stretch' : 'items-center',
            ' p-2 ring-1 ring-[var(--landing-borda)] sm:px-[clamp(7px,1.3vw,19px)]',
            arranjo === 'panoramico' ? 'sm:py-[clamp(6px,0.85vw,12px)]' : 'sm:py-[clamp(7px,1.3vw,17px)]',
          )}>
            <div className={cn('w-full', preencher && 'h-full')} style={{ maxWidth: limite || undefined }}>
              <DemoRecorte preencherAltura={preencher} onPasso={onPasso} titulo={h.titulo} rota={h.rota} estado={h.estado} cues={h.cues} recorte={h.recorte} onLimite={setLimite}
                foraDoRecorte={aoLado ? 330 : 170} />
            </div>
          </div>
        </Revelar>
        )}

        {/* As evidências: ao lado (empilhadas, dividindo a altura do palco), em
            duas colunas altas (vertical) ou embaixo. */}
        {tresColunas
          ? b.cartoes.map((c, i) => <Beneficio key={c.titulo} bloco={b.id} i={i} c={c} esticar at={passo} cena={semTela ? 'agente-catalogo' : cenaAtual} ciclo={ciclo} />)
          : (
            <div className={aoLado ? 'flex min-w-0 flex-col gap-4' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5'}>
              {b.cartoes.map((c, i) => <Beneficio key={c.titulo} bloco={b.id} i={i} c={c} esticar={aoLado} at={passo} cena={semTela ? 'agente-catalogo' : cenaAtual} ciclo={ciclo} />)}
            </div>
          )}
      </div>
    </article>
  )
}

export function SecaoPlataforma() {
  const [ativo, setAtivo] = useState<string>(plataforma.blocos[0].id)
  const blocosRef = useRef<Record<string, HTMLElement | null>>({})

  // Índice: aceso é o ÚLTIMO recurso cujo topo já passou de 40 % da altura da
  // tela, recalculado a cada rolagem (25/09). O IntersectionObserver com uma
  // faixa estreita perdia eventos com a página rolando dentro de um contêiner:
  // o funil nunca acendia — o índice pulava de "equipe" para "campanhas".
  useEffect(() => {
    const secao = document.getElementById('plataforma')
    const rolador = secao?.closest<HTMLElement>('[data-landing-root]') ?? null
    const alvo: HTMLElement | Window = rolador ?? window
    let quadro = 0
    const calcular = () => {
      quadro = 0
      const linha = window.innerHeight * 0.4
      let atual: string = plataforma.blocos[0].id
      for (const b of plataforma.blocos) {
        const el = blocosRef.current[b.id]
        if (el && el.getBoundingClientRect().top <= linha) atual = b.id
      }
      setAtivo(atual)
    }
    const onScroll = () => { if (!quadro) quadro = requestAnimationFrame(calcular) }
    calcular()
    alvo.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { alvo.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(quadro) }
  }, [])

  const irPara = (id: string) => blocosRef.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section id="plataforma" data-section="plataforma" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-24">
      {/* GRADE (25/09, 4ª rodada). Abaixo de 1280 px: o container da landing, sem
          índice (cada artigo traz o rótulo numerado). A partir de 1280 px a
          seção deixa o container: o índice é a primeira coluna da grade, a
          32–48 px da borda da viewport e com a largura só do próprio texto
          (`max-content`); a coluna dos artigos fica com TODO o resto. */}
      <div className="mx-auto w-full px-[clamp(16px,4.5vw,72px)] xl:grid xl:grid-cols-[max-content_minmax(0,1fr)] xl:pl-[clamp(32px,2.5vw,48px)] xl:pr-[clamp(32px,2.9vw,56px)]">
        {/* Índice fixo — primeira coluna, atravessa o cabeçalho e os artigos. */}
        <nav aria-label="Recursos da plataforma" className="hidden xl:block">
          <ol className="sticky top-[104px] mt-[140px] flex flex-col gap-0.5 pr-[clamp(12px,1vw,18px)]">
            {plataforma.blocos.map((b, i) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => irPara(b.id)}
                  aria-current={ativo === b.id ? 'true' : undefined}
                  className={cn(
                    'group relative w-full whitespace-nowrap rounded-md py-1 pl-3 pr-1 text-left text-[12.5px] font-medium transition-colors duration-300',
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
                  <span className="mr-1.5 tabular-nums text-[10px] text-surface-500">{String(i + 1).padStart(2, '0')}</span>
                  {b.indice}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Cabeçalho da seção — alinhado à coluna dos artigos. */}
        <div className="min-w-0 xl:border-l xl:border-[var(--landing-borda)] xl:pl-[clamp(20px,1.8vw,32px)]">
        <Revelar className="max-w-[64rem]">
          <p className="inline-flex rounded-full bg-brand-500/10 px-2.5 py-1 text-[12px] font-semibold text-[var(--landing-destaque)] ring-1 ring-brand-500/20">
            {plataforma.eyebrow}
          </p>
          <h2 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.16rem,2.17vw,1.73rem)] text-balance">
            <span className="text-surface-50">{plataforma.title}</span>{' '}
            <span className="text-surface-500">{plataforma.titleCinza}</span>
          </h2>
        </Revelar>

        <div className="mt-12 sm:mt-16">

          {/* Os recursos: separados por um fio; o fio vertical à esquerda liga o
              índice à coluna (moldura de linhas finas, como a referência). */}
          <div className="min-w-0">
            {plataforma.blocos.map((b, i) => (
              <div key={b.id} className={cn(i > 0 && 'mt-16 border-t border-[var(--landing-borda)] pt-16 sm:mt-20 sm:pt-20')}>
                <ArtigoRecurso b={b} n={i + 1} registrar={(el) => { blocosRef.current[b.id] = el }} />
              </div>
            ))}

            {/* Fecho da seção: a ação de conversão — só com o canal configurado. */}
            {contatoDisponivel && (
            <Revelar className="mt-16 sm:mt-20">
              <div className="flex flex-col items-start gap-4 rounded-2xl bg-[var(--landing-cartao)] p-6 ring-1 ring-[var(--landing-borda)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <p className="max-w-[34ch] font-display text-[13px] font-semibold leading-snug tracking-[-0.01em] text-surface-50">
                  Veja a Oryon atendendo no seu WhatsApp.
                  <span className="block text-surface-400 text-[12px] font-medium mt-1">Converse com o nosso Agente IA — ele mesmo te mostra.</span>
                </p>
                <LinkButton
                  href={linkContato()}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="lg"
                  className="flex-none"
                  leftIcon={<MessageCircle className="h-4 w-4" strokeWidth={2.2} />}
                >
                  {contato.ctaLongo}
                </LinkButton>
              </div>
            </Revelar>
            )}
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
