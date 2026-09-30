import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { teclasDasAbas } from '../ui/abasTeclado'
import { BotaoPausa } from '../ui/BotaoPausa'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { BotaoLanding } from '../ui/BotaoLanding'
import { TemplatePreview } from '@/components/campaigns/TemplatePreview'
import { StatStrip } from '@/components/campaigns/StatStrip'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { ConversationActivitySection } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { DealSummary } from '@/components/deals/DealSummary'
import { MessageBubble } from '@/components/conversations/ChatWindow/MessageBubble'
import { MediaViewerProvider } from '@/components/ui/MediaViewer'
import { TypingIndicator } from '@/components/conversations/ChatWindow/TypingIndicator'
import { KnowledgeDocArtifact } from '@/components/agents/KnowledgeDocArtifact'
import { StatusDonut } from '@/components/dashboard/StatusDonut'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import type { ActivityEvent } from '@/types/dashboard'
import { CONHECIMENTO_RECEPCAO } from '@/demo/agentesDemo'
import { heroActivityFeed, heroHomeSnapshot } from '@/demo/dashboardDemo'
import { ConteudoWhatsAppAparelho } from '../stage/hero/HeroSatelitesConteudo'
import { contato, contatoDisponivel, home, linkContato, paginasPlataforma, plataforma, rotaPlataforma } from '../landingCopy'
import { DemoRecorte, type Recorte } from './DemoRecorte'
import {
  HERO, HERO_PIPELINE, HERO_TEMPLATE, HERO_TEMPLATE_VARIAVEIS, heroCampaigns, heroDeal, heroHistoricoGanho, heroMessages, heroNotifications, heroTimeline,
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
  // Quadro do funil, panorâmico: Avaliação, Agendado e Aguardando guia — o card
  // anda entre as duas primeiras, e a terceira mostra que o funil continua.
  // Medido em 1280×720 (30/09): colunas de x = 336 a 1110; começa no
  // cabeçalho das colunas (y = 136 — a faixa de filtros acima saía cortada à
  // esquerda) e termina no vão abaixo do 2º card de Avaliação e Aguardando guia.
  funil: { x: 334, y: 136, w: 778, h: 236 },
  // A gaveta do relatório da campanha.
  // Até a legenda do gráfico (a 640 px ela saía cortada).
  relatorio: { x: 684, y: 0, w: 596, h: 656 },
  // A página do agente (direção D, 27/09 — medido em 1280×720): cabeçalho de
  // identidade, a navegação em três grupos e a seção até o fim dos cartões.
  // Até a borda do app (30/09): em w = 1104 o cabeçalho do agente saía cortado
  // no meio dos botões ("Ligad…").
  agente: { x: 62, y: 48, w: 1218, h: 672 },
  // O Dashboard de ponta a ponta: indicadores, volume, funil, fila e equipe —
  // um recorte mais estreito cortava cartões pela metade.
  painel: { x: 62, y: 56, w: 1218, h: 382 },
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
    titulo: 'Oryon · Funis · Consultas',
    rota: HERO_ROTAS.funil, estado: 'etiqueta', recorte: RECORTES.funil,
    cues: [
      { t: 0, state: 'etiqueta', composition: 'funil' },
      S(2200, 'avanco'),
      S(7600, 'avanco'),
    ],
  },
  campanhas: {
    titulo: 'Oryon · Disparos',
    rota: HERO_ROTAS.disparos, estado: 'ganho', recorte: RECORTES.relatorio,
    // Direto no relatório: começando na lista de Disparos, o recorte (a metade
    // direita da tela) mostrava só faixas vazias até a gaveta abrir.
    // Campanha CONCLUÍDA (estado 'ganho'): em 'inicio' ela ainda está saindo e
    // o funil do relatório contradizia os números dos cartões ao lado.
    cues: [
      { t: 0, state: 'ganho', composition: 'relatorio' },
      { t: 9600, composition: 'relatorio' },
    ],
  },
  // O Dashboard no momento em que a Marina espera na fila: o holofote passa
  // pela fila (aba Agora) e depois pelos indicadores e pelo volume da semana
  // (aba Relatórios). A tela não muda de dado (o Dashboard
  // real busca uma vez ao abrir) — só o olhar percorre.
  medir: {
    titulo: 'Oryon · Dashboard',
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
        initial={semMovimento ? false : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={semMovimento ? undefined : { opacity: 0 }}
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
    if (semMovimento) return
    const c = animate(0, para, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setValor(Math.round(v)) })
    return () => c.stop()
  }, [para, semMovimento])
  return <>{(semMovimento ? para : valor).toLocaleString('pt-BR')}</>
}

/**
 * O visual real de cada cartão de evidência — VIVO (25/09): o cartão reage à
 * mesma mini-história que a tela ao lado conta (\`at\` = o passo dela; \`ciclo\` =
 * quantas vezes o laço recomeçou). O que acontece na tela aparece no cartão no
 * mesmo momento, com os componentes reais do produto.
 */
function VisualCartao({ bloco, i, at, cena, ciclo }: { bloco: string; i: number; at: HeroState; cena: HeroCena; ciclo: number }) {
  const semMovimento = useReducedMotion()
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
      // A bolha usa o visualizador de mídia (developer, #206); a landing
      // não passa pelos provedores do App, então traz o seu.
      return (
        <MediaViewerProvider>
        <div className="px-3 py-1">
          <MessageBubble message={mensagem('demo-m-5')} contact={contatoMarina} showAvatar />
          <Surgir chave={`${ciclo}-${cena === 'agente-catalogo' ? 'resposta' : 'digitando'}`}>
            {cena === 'agente-catalogo'
              ? <MessageBubble message={mensagem('demo-m-6')} contact={contatoMarina} showAvatar />
              : <div className="flex justify-end"><TypingIndicator /></div>}
          </Surgir>
        </div>
        </MediaViewerProvider>
      )
    case 'conhecer-1': {
      // O documento da base de conhecimento, no componente real de documento.
      const doc = CONHECIMENTO_RECEPCAO.find((d) => d.id === 'kd-convenios')!
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
        // O topo do close some num degradê: sem ele, a bolha de cima aparecia
        // cortada ao meio, com cara de erro.
        <div className="flex h-[272px] items-end justify-center overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_56px)]">
          <div className="-mb-[24px] [zoom:1.57]" style={{ width: 234, height: 456 }}><ConteudoWhatsAppAparelho at={at} cena="conversa" /></div>
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
        subject: l.summary, timestamp: l.timestamp,
      }))
      return <div className="relative h-[330px] overflow-hidden px-2 py-1"><ActivityFeed events={eventos} /></div>
    }
    case 'equipe-0': {
      // O sino: a transferência entra no topo quando a IA chama a Ana.
      const presentes = new Set(heroNotifications(at).map((n) => n.id))
      const lista = heroNotifications('assumido')
      return (
        <div className="py-1">
          <AnimatePresence initial={false}>
            {lista.map((n) => (
              <motion.div
                key={`${ciclo}-${n.id}`}
                initial={false}
                animate={{ opacity: presentes.has(n.id) ? 1 : 0, y: presentes.has(n.id) ? 0 : 5 }}
                transition={{ duration: semMovimento ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
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
      initial={semMovimento ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.55, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Each resource keeps its own reading order. Conversations pair the window
 * with stacked evidence; the wide funnel/dashboard use evidence below;
 * portrait campaign reports can share a row with both evidence cards.
 * The window IS the stage: no second stretched container around it. */
type Arranjo = 'lado' | 'vertical' | 'abaixo'
const COMPOSICAO: Record<string, Arranjo> = {
  conhecer: 'lado',
  // Dashboard: tela larga demais para dividir a largura — evidências embaixo.
  medir: 'abaixo',
  atender: 'lado',
  equipe: 'lado',
  funil: 'abaixo',
  campanhas: 'vertical',
}

/** Largura mínima da coluna de evidências ao lado do palco. */
const EVIDENCIAS_MIN = 320
/** Largura mínima de cada evidência quando ficam lado a lado (arranjo vertical). */
// Below this width, stack the evidence beside the portrait report.
const EVIDENCIA_COLUNA_MIN = 300
const VAO = 20

type Bloco = (typeof plataforma.blocos)[number]

/** Invisible endpoint states reserve the largest intrinsic height at this width.
 * They stay in the same grid cell, so text wrapping remains responsive. Playback
 * never sizes the card, and no fixed height clips a longer translated label. */
const RESERVAS: Record<string, HeroState[]> = {
  conhecer: ['inicio'], atender: ['etiqueta'],
  equipe: ['avanco', 'ganho'], funil: ['etiqueta', 'avanco'],
}

/** Uma evidência: o componente real em cima, a frase embaixo. */
function Beneficio({ bloco, i, c, esticar, at, cena, ciclo }: { bloco: string; i: number; c: Bloco['cartoes'][number]; esticar: boolean; at: HeroState; cena: HeroCena; ciclo: number }) {
  return (
    // Esticada, a evidência divide a altura do palco (flex-1): a folga vai para
    // a área do visual, centrado — nunca um vão entre as duas.
    <Revelar atraso={0.15 + i * 0.08} className={cn('flex min-w-0', esticar && 'flex-1')}>
      {/* Todas as evidências no mesmo desenho (visual em cima, frase embaixo) e
          com a altura da vizinha: o painel (06) tinha visual e frase lado a
          lado, e a grade ficava desalinhada com cartões de alturas diferentes. */}
      <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-[var(--landing-cartao)] ring-1 ring-[var(--landing-borda)]">
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden border-b border-[var(--landing-borda)] bg-surface-950 py-1.5 [[data-theme=light]_&]:bg-surface-900">
          <div aria-hidden inert data-evidencia className="pointer-events-none grid min-w-0 select-none [zoom:0.8]">
            {RESERVAS[bloco]?.map((estado) => (
              <div key={estado} className="invisible min-w-0 [grid-area:1/1]" data-reserva>
                <VisualCartao bloco={bloco} i={i} at={estado} cena="agente-catalogo" ciclo={0} />
              </div>
            ))}
            <div className="min-w-0 self-center [grid-area:1/1]" data-evidencia-atual>
              <VisualCartao bloco={bloco} i={i} at={at} cena={cena} ciclo={ciclo} />
            </div>
          </div>
        </div>
        {/* Lote 4 (30/09): sem o ponto teal — ele era sempre igual e só
            decorava; os pontos ficam onde dizem IA × pessoa. */}
        <div className="px-5 pb-4 pt-3.5">
          <p className="text-[15px] font-semibold leading-snug text-surface-50">{c.titulo}</p>
          <p className="mt-1 max-w-[52ch] text-[14px] leading-relaxed text-surface-400">{c.texto}</p>
        </div>
      </div>
    </Revelar>
  )
}

function ArtigoRecurso({ b, n, registrar, semRotulo = false, manterMontado = false, pausado = false }: { b: Bloco; n: number; registrar: (el: HTMLElement | null) => void; semRotulo?: boolean; manterMontado?: boolean; pausado?: boolean }) {
  const h = HISTORIAS[b.id]
  const arranjo = COMPOSICAO[b.id]
  const ref = useRef<HTMLElement | null>(null)
  const editorialRef = useRef<HTMLDivElement>(null)
  const composicaoRef = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  // Fit the complete composition, not each window independently. offsetHeight
  // is in unscaled CSS pixels, so applying zoom cannot feed back into sizing.
  useLayoutEffect(() => {
    const composicao = composicaoRef.current
    const editorial = editorialRef.current
    if (!composicao || !editorial) return
    const medir = () => {
      const desktop = window.innerWidth >= 1024
      const disponivel = window.innerHeight - 96 - editorial.offsetHeight - 24 - 24
      const natural = composicao.offsetHeight
      // Só encolhe se não couber na altura (30/09): o fator fixo de 0,92 deixava
      // toda composição 8 % mais estreita que o texto acima — um vão à direita.
      setEscala(desktop && natural > 0 ? Math.min(1, Math.max(1, disponivel) / natural) : 1)
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(composicao)
    ro?.observe(editorial)
    window.addEventListener('resize', medir)
    medir()
    return () => { ro?.disconnect(); window.removeEventListener('resize', medir) }
  }, [])
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
  // The window itself is the stage. Portrait reports keep their natural
  // width; landscape screens use the available column without an outer mat.
  const [limite, setLimite] = useState(0)
  const palco = limite
  const sobra = palco ? largura - palco - VAO : 0
  const aoLado = palco > 0 && sobra >= EVIDENCIAS_MIN && arranjo !== 'abaixo'
  const tresColunas = aoLado && arranjo === 'vertical' && sobra >= 2 * EVIDENCIA_COLUNA_MIN + VAO
  // Configurar agentes é desktop no próprio produto (no celular ele avisa "use
  // o desktop"): ali o capítulo conta a história só pelas evidências.
  const celular = !useMediaQuery('(min-width: 768px)')
  // O funil no celular abria o painel de EDIÇÃO do negócio (campos vazios,
  // 'Marcar ganho') em vez do quadro: ali a evidência (o card real do
  // negócio, já em Agendado) conta o capítulo sozinha.
  const semTela = celular && (b.id === 'conhecer' || b.id === 'funil')
  const passoSemTela: HeroState = b.id === 'funil' ? 'avanco' : h.estado
  // O passo da mini-história da tela — os cartões ao lado reagem a ele.
  const [passo, setPasso] = useState<HeroState>(h.estado)
  // Outra etapa no mesmo artigo (abas da home): a mini-história recomeça.
  const blocoAnterior = useRef(b.id)
  useEffect(() => {
    if (blocoAnterior.current === b.id) return
    blocoAnterior.current = b.id
    setPasso(h.estado)
    setCiclo(0)
    setCenaAtual(h.cues[0].composition ?? 'conversa')
  }, [b.id, h])
  const [ciclo, setCiclo] = useState(0)
  const [cenaAtual, setCenaAtual] = useState<HeroCena>(h.cues[0].composition ?? 'conversa')
  const onPasso = useCallback((estado: HeroState, cena: HeroCena, indice: number) => {
    setPasso(estado)
    setCenaAtual(cena)
    if (indice === 0) setCiclo((n) => n + 1)
  }, [])
  const colunas = !aoLado ? undefined
    : tresColunas ? `${palco}px minmax(0, 1fr) minmax(0, 1fr)`
    // Conversas usam duas colunas; relatórios verticais preservam sua largura.
    : arranjo === 'vertical' ? `${palco}px minmax(0, 1fr)`
    : `minmax(0, 1.3fr) minmax(${EVIDENCIAS_MIN}px, 1fr)`

  return (
    <article
      id={`plataforma-${b.id}`}
      data-bloco={b.id}
      data-arranjo={!aoLado ? 'empilhado' : tresColunas ? 'tres-colunas' : 'lado'}
      ref={(el) => { ref.current = el; registrar(el) }}
      className="scroll-mt-24"
    >
      {/* A promessa (curta, no H3) e a explicação (parágrafo à parte). */}
      <div ref={editorialRef}><Revelar>
        {/* Nas abas (home), o número e o nome já estão na aba: repetir aqui
            era índice em dobro (30/09). */}
        {!semRotulo && (
        <p className="text-[12px] font-semibold uppercase tracking-[.12em] text-[var(--landing-destaque)]">
          <span className="tabular-nums">{String(n).padStart(2, '0')}</span>
          <span aria-hidden className="mx-2 text-surface-600">·</span>
          {b.indice}
        </p>
        )}
        {/* Ao trocar de etapa (abas da home), o texto entra em crossfade em
            vez de trocar de uma vez (30/09). */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3 className={cn(!semRotulo && 'mt-2.5', ' font-display font-semibold tracking-[-0.022em] leading-[1.15] text-surface-50 text-[clamp(1.25rem,1.65vw,1.5rem)] text-balance')}>
              {b.destaque}
            </h3>
            <p className="mt-2.5 max-w-[62ch] text-[15px] sm:text-[16.5px] leading-relaxed text-surface-400 text-pretty">{b.texto}</p>
          </motion.div>
        </AnimatePresence>
      </Revelar></div>

      <div className="mt-6 flex justify-start" data-composicao-envelope>
      <div ref={composicaoRef} data-composicao-recurso className="grid shrink-0 gap-4 sm:gap-5"
        style={{ width: largura || '100%', zoom: escala, ...(colunas ? { gridTemplateColumns: colunas, gap: VAO } : {}) }}>
        {/* A operação, na tela. */}
        {/* Com manterMontado (abas da home), a tela nunca sai da árvore: nas
            etapas sem tela (celular) ela só fica escondida e parada — o MESMO
            app atende as seis abas, e sair dele custaria remontá-lo (~1,3 s). */}
        {(!semTela || manterMontado) && (
        <Revelar atraso={0.1} className={cn('min-w-0 self-start', semTela && 'hidden')}>
          {/* Embaixo, a tela nunca passa do tamanho real do app (1×) nem de
              1000 px: com só o teto de 1000 px, o funil (região estreita) saía
              a 1,3× — maior e mais cortado que as outras telas da página. */}
          <DemoRecorte className={arranjo === 'abaixo' ? 'mx-auto' : undefined} style={arranjo === 'abaixo' ? { maxWidth: Math.min(1000, h.recorte.w + 12) } : undefined} esmaecerBase={b.id === 'funil'} pausado={semTela || pausado} manterMontado={manterMontado} onPasso={onPasso} titulo={h.titulo} rota={h.rota} estado={h.estado} cues={h.cues} recorte={h.recorte} onLimite={setLimite}
            foraDoRecorte={aoLado ? 330 : 170} />
        </Revelar>
        )}

        {/* As evidências: ao lado (empilhadas, dividindo a altura do palco), em
            duas colunas altas (vertical) ou embaixo. */}
        {tresColunas
          ? b.cartoes.map((c, i) => <Beneficio key={c.titulo} bloco={b.id} i={i} c={c} esticar at={semTela ? passoSemTela : passo} cena={semTela ? 'agente-catalogo' : cenaAtual} ciclo={ciclo} />)
          : (
            <div className={aoLado ? 'flex h-full min-w-0 flex-col gap-4' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5'}>
              {b.cartoes.map((c, i) => <Beneficio key={c.titulo} bloco={b.id} i={i} c={c} esticar={aoLado} at={semTela ? passoSemTela : passo} cena={semTela ? 'agente-catalogo' : cenaAtual} ciclo={ciclo} />)}
            </div>
          )}
      </div>
      </div>
    </article>
  )
}

export function SecaoPlataforma() {
  const semMovimento = useReducedMotion()
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

  const irPara = (id: string) => blocosRef.current[id]?.scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' })

  return (
    <section id="plataforma" data-section="plataforma" aria-labelledby="plataforma-titulo" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20">
      {/* GRADE (25/09, 4ª rodada). Abaixo de 1280 px: o container da landing, sem
          índice (cada artigo traz o rótulo numerado). A partir de 1280 px a
          seção deixa o container: o índice é a primeira coluna da grade, a
          32–48 px da borda da viewport e com a largura só do próprio texto
          (`max-content`); a coluna dos artigos fica com TODO o resto. */}
      <div className="mx-auto w-full px-[clamp(16px,4.5vw,72px)] xl:grid xl:grid-cols-[max-content_minmax(0,1fr)] xl:pl-[clamp(32px,2.5vw,48px)] xl:pr-[clamp(32px,2.9vw,56px)]">
        {/* Índice fixo — primeira coluna, atravessa o cabeçalho e os artigos. */}
        <nav aria-label="Recursos da plataforma" className="hidden xl:block">
          <ol className="sticky top-[104px] mt-[140px] flex flex-col gap-0.5 pr-[clamp(12px,1vw,18px)]">
            {plataforma.atos.map((ato) => (
              <li key={ato.id} className="mt-3 first:mt-0">
                {/* O ato: rótulo pequeno; os capítulos dele logo abaixo. */}
                <p className={cn(
                  'mb-1 pl-3 text-[10px] font-semibold uppercase tracking-[.12em] transition-colors',
                  (ato.blocos as readonly string[]).includes(ativo) ? 'text-[var(--landing-destaque)]' : 'text-surface-500',
                )}>
                  Ato {ato.numero} · {ato.titulo}
                </p>
                <ol className="flex flex-col gap-0.5">
            {plataforma.blocos.filter((b) => (ato.blocos as readonly string[]).includes(b.id)).map((b) => { const i = plataforma.blocos.findIndex((x) => x.id === b.id); return (
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
                      'absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full transition-[background-color,opacity] duration-300',
                      ativo === b.id ? 'bg-brand-400 opacity-100' : 'bg-surface-700 opacity-60',
                    )}
                  />
                  <span className="mr-1.5 tabular-nums text-[10px] text-surface-500">{String(i + 1).padStart(2, '0')}</span>
                  {b.indice}
                </button>
              </li>
            ) })}
                </ol>
              </li>
            ))}
          </ol>
        </nav>

        {/* Cabeçalho da seção — alinhado à coluna dos artigos. */}
        <div className="min-w-0 xl:border-l xl:border-[var(--landing-borda)] xl:pl-[clamp(20px,1.8vw,32px)]">
        <Revelar className="max-w-[64rem]">
          <h2 id="plataforma-titulo" className="font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.7rem,3vw,2.5rem)] text-balance text-surface-50">{plataforma.title}</h2>
          <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px] text-pretty">{plataforma.titleCinza}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--landing-borda)] bg-[var(--landing-cartao)] px-3 py-1.5 text-[12px] font-medium text-surface-300">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            {plataforma.contexto}
          </p>
        </Revelar>

        <nav aria-label="Escolher recurso" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:hidden">
          {plataforma.blocos.map((b, i) => {
            const ato = plataforma.atos.find((a) => (a.blocos as readonly string[]).includes(b.id))!
            return (
              <button key={b.id} type="button" onClick={() => irPara(b.id)}
                className="min-h-12 rounded-lg border border-[var(--landing-borda)] bg-[var(--landing-cartao)] px-3 py-2 text-left text-[13px] font-medium text-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <span className="block text-[9px] font-semibold uppercase tracking-[.12em] text-surface-500">Ato {ato.numero}</span>
                <span className="mt-0.5 block"><span className="mr-2 text-[var(--landing-destaque)]">{String(i + 1).padStart(2, '0')}</span>{b.indice}</span>
              </button>
            )
          })}
        </nav>
        <div className="mt-10 sm:mt-12">

          {/* Os recursos: separados por um fio; o fio vertical à esquerda liga o
              índice à coluna (moldura de linhas finas, como a referência). */}
          <div className="min-w-0">
            {plataforma.atos.map((ato, ai) => {
              const blocos = plataforma.blocos.filter((b) => (ato.blocos as readonly string[]).includes(b.id))
              return (
                <section
                  key={ato.id}
                  data-ato={ato.id}
                  aria-labelledby={`plataforma-ato-${ato.id}`}
                  className={cn(ai > 0 && 'mt-14 sm:mt-16')}
                >
                  <Revelar className="mb-8 sm:mb-10">
                    {/* O ato como rótulo ("ATO I"), não como numeral gigante: na fonte
                        de título o "I" sozinho parecia um traço ou um cursor. */}
                    <div className="relative overflow-hidden rounded-xl border border-[var(--landing-borda)] bg-[color-mix(in_srgb,var(--color-brand-500)_7%,var(--landing-cartao))] px-5 py-5 sm:px-6 sm:py-6">
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[var(--landing-destaque)]" />
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--landing-destaque)]">Ato {ato.numero}</p>
                      <div className="min-w-0">
                        <h3 id={`plataforma-ato-${ato.id}`} className="font-display text-[clamp(1.35rem,1.9vw,1.75rem)] font-bold leading-[1.08] tracking-[-.025em] text-surface-50 text-balance">{ato.titulo}</h3>
                        <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-surface-400 sm:text-[15px]">{ato.frase}</p>
                      </div>
                    </div>
                  </Revelar>
                  {blocos.map((b, bi) => {
                    const n = plataforma.blocos.findIndex((x) => x.id === b.id) + 1
                    return (
                      <div key={b.id} className={cn(bi > 0 && 'mt-10 border-t border-[var(--landing-borda)] pt-10 sm:mt-12 sm:pt-12')}>
                        <ArtigoRecurso b={b} n={n} registrar={(el) => { blocosRef.current[b.id] = el }} />
                      </div>
                    )
                  })}
                </section>
              )
            })}

            {/* Fecho da seção: a ação de conversão — só com o canal configurado. */}
            {contatoDisponivel && (
            <Revelar className="mt-16 sm:mt-20">
              <div className="flex flex-col items-start gap-4 rounded-xl bg-[var(--landing-cartao)] p-6 ring-1 ring-[var(--landing-borda)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <p className="max-w-[34ch] font-display text-[13px] font-semibold leading-snug tracking-[-0.01em] text-surface-50">
                  Teste o Agente IA da Oryon pelo WhatsApp.
                  <span className="block text-surface-400 text-[12px] font-medium mt-1">Envie uma mensagem e veja como o atendimento funciona.</span>
                </p>
                <BotaoLanding
                  href={linkContato()}
                  target="_blank"
                  rel="noopener noreferrer"
                  tamanho="lg"
                  className="flex-none"
                  icone={<MessageCircle className="h-4 w-4" strokeWidth={2.2} />}
                >
                  {contato.ctaLongo}
                </BotaoLanding>
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

// ─── 30/09: a Plataforma dividida — abas na home, capítulos nas páginas ─────

const NOOP_REGISTRO = () => {}

/** Os capítulos de uma página de produto (menu Plataforma): os mesmos artigos
 *  da seção inteira, sem o índice lateral — a página já é um recorte. */
export function SecaoCapitulos({ ids }: { ids: readonly string[] }) {
  const blocos = plataforma.blocos.filter((b) => ids.includes(b.id))
  if (blocos.length === 0) return null
  return (
    <section data-section="capitulos" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-14 sm:py-16">
      <div className="landing-container">
        {blocos.map((b, i) => (
          <div key={b.id} className={cn(i > 0 && 'mt-12 border-t border-[var(--landing-borda)] pt-12 sm:mt-14 sm:pt-14')}>
            <ArtigoRecurso b={b} n={i + 1} registrar={NOOP_REGISTRO} />
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * COMO FUNCIONA (home de venda, 30/09) — os seis capítulos em ABAS, como os
 * casos de uso da Attio: uma demonstração por vez, no lugar dos seis
 * artigos empilhados (6.580 px na página antiga). Cada aba leva à página de
 * produto que a aprofunda.
 */
export function SecaoComoFunciona({ numero }: { numero?: string } = {}) {
  const [ativo, setAtivo] = useState<string>(plataforma.blocos[0].id)
  const [pausado, setPausado] = useState(false)
  const idx = Math.max(0, plataforma.blocos.findIndex((b) => b.id === ativo))
  const b = plataforma.blocos[idx]
  const pagina = paginasPlataforma.find((p) => (p.blocos as readonly string[]).includes(b.id))
  return (
    <section id="como-funciona" data-section="como-funciona" aria-labelledby="como-funciona-titulo" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20">
      <div className="landing-container">
        <Revelar className="max-w-[64rem]">
          <h2 id="como-funciona-titulo" className="font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.7rem,3vw,2.5rem)] text-balance text-surface-50">{home.comoFunciona.titulo}</h2>
          <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px] text-pretty">{home.comoFunciona.cinza}</p>
        </Revelar>

        {/* Folga em volta das abas: o contêiner rola na horizontal, e `overflow`
            também recorta na vertical — sem ela, a borda de cima das abas saía
            cortada (30/09). */}
        {/* As etapas como índice (P4, 30/09): número em mono + nome sobre uma
            régua, a ativa sublinhada — sem pílulas. */}
        <div className="relative mt-8">
        <div role="tablist" aria-label={home.comoFunciona.abasLabel} className="landing-abas pr-10">
          {plataforma.blocos.map((bl, i) => (
            <button
              key={bl.id}
              type="button"
              role="tab"
              id={`etapa-aba-${bl.id}`}
              aria-selected={bl.id === ativo}
              aria-controls="etapa-painel"
              tabIndex={bl.id === ativo ? 0 : -1}
              onClick={() => setAtivo(bl.id)}
              onKeyDown={teclasDasAbas(plataforma.blocos.map((x) => x.id), ativo, setAtivo, 'etapa-aba-')}
              className={cn('landing-aba rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', bl.id === ativo && 'landing-aba-ativa')}
            >
              <span data-numero>{String(i + 1).padStart(2, '0')}</span>
              {bl.indice}
            </button>
          ))}
        </div>
        <BotaoPausa pausado={pausado} onAlternar={() => setPausado((p) => !p)} className="absolute bottom-1.5 right-0" />
        </div>

        {/* Troca de aba SEM remontar (30/09, PO): o artigo é um só e a
            demonstração dentro dele é o mesmo app — trocar de etapa é mandar
            outra história para ele (troca de rota lá dentro, como um clique no
            menu). Antes cada aba montava o app do zero (~1,3 s de espera, medido
            no build de produção), e carregar as seis juntas custaria ~6× a
            memória de uma demonstração. */}
        <div id="etapa-painel" role="tabpanel" aria-labelledby={`etapa-aba-${b.id}`} className="mt-8">
          <ArtigoRecurso b={b} n={idx + 1} registrar={NOOP_REGISTRO} semRotulo manterMontado pausado={pausado} />
          {pagina && (
            <Link to={rotaPlataforma(pagina.slug)} className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-[14px] font-medium text-[var(--landing-destaque)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              {home.comoFunciona.saibaMais}: {pagina.menu} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
