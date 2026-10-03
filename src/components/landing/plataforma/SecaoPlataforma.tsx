import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { contato, contatoDisponivel, linkContato, plataforma } from '../landingCopy'
import { DemoRecorte } from './DemoRecorte'
import { APP_INTEIRO, HISTORIAS } from './historias'
import {
  HERO, HERO_PIPELINE, HERO_TEMPLATE, HERO_TEMPLATE_VARIAVEIS, heroCampaigns, heroDeal, heroHistoricoGanho, heroMessages, heroNotifications, heroTimeline,
} from '../stage/hero/heroRealData'
import type { HeroCena, HeroState } from '../stage/hero/heroStory'

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

const NOOP = () => {}

/** As contagens da campanha CONCLUÍDA — os mesmos números da notificação que
 *  aparece em cima delas no cartão ("477 enviadas · 9 falhas"). */
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
    // relative: com popLayout a peça que SAI vira `absolute` e se posiciona pelo
    // ancestral posicionado mais próximo — sem este contêiner era a seção, e a
    // peça piscava no topo dela, sobre o título (30/09).
    <div className="relative min-w-0">
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
    </div>
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

/**
 * A COMPOSIÇÃO dos capítulos (páginas de detalhe, 01/10 — a mesma lógica do
 * "Como funciona" da home): todo capítulo é igual. A janela do app inteiro à
 * esquerda; os dois cartões empilhados à direita, com a altura da janela e o
 * mesmo vão. Antes cada capítulo tinha o seu arranjo (lado, embaixo, três
 * colunas), molduras de 359 a 735 px de largura e, quando a composição
 * encolhia para caber, até 600 px sobrando à direita.
 *
 * No desktop a janela é a maior que cabe na altura da tela (menu fixo, o texto
 * do capítulo e folgas) e na largura que sobra para os cartões (pelo menos
 * CARTOES_MIN, idealmente CARTOES_FRACAO do capítulo): o capítulo inteiro cabe
 * numa tela. No celular e no tablet tudo empilha.
 */
const VAO = 20
const MENU_FIXO = 64
const CARTOES_MIN = 340
const CARTOES_FRACAO = 0.3
/** Folga acima e abaixo do capítulo quando ele ocupa a tela. */
const RESPIRO = 24
/** Abaixo disso a janela fica pequena demais para ler. */
const MOLDURA_MIN = 300
/** A escala base dos visuais dos cartões (componentes reais a 80 %) e a menor
 *  aceitável quando o visual encolhe para caber na altura do cartão. */
const ZOOM_CARTAO = 0.8
const ZOOM_CARTAO_MIN = 0.45

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
  // Esticado (a grade do desktop), o cartão tem metade da altura da janela e o
  // visual ENCOLHE para caber inteiro. A largura de diagramação continua a da
  // escala base (largura do cartão ÷ ZOOM_CARTAO): só a escala muda, então a
  // altura natural medida não depende dela e a medida não realimenta.
  const caixaRef = useRef<HTMLDivElement>(null)
  const conteudoRef = useRef<HTMLDivElement>(null)
  const [ajuste, setAjuste] = useState<{ zoom: number; largura: number } | null>(null)
  useLayoutEffect(() => {
    const caixa = caixaRef.current
    const conteudo = conteudoRef.current
    if (!esticar || !caixa || !conteudo) return
    const medir = () => {
      const largura = caixa.clientWidth / ZOOM_CARTAO
      const disponivel = caixa.clientHeight - 12
      // Sob CSS zoom, offsetHeight vem na escala do próprio elemento (sem zoom).
      const natural = conteudo.offsetHeight
      if (natural <= 0 || disponivel <= 0) return
      const zoom = Math.max(ZOOM_CARTAO_MIN, Math.min(ZOOM_CARTAO, disponivel / natural))
      setAjuste((a) => (a && Math.abs(a.zoom - zoom) < 0.01 && Math.abs(a.largura - largura) < 1 ? a : { zoom, largura }))
    }
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(caixa)
    ro?.observe(conteudo)
    return () => ro?.disconnect()
  }, [esticar])
  const encaixe = esticar && ajuste ? { zoom: ajuste.zoom, width: ajuste.largura } : { zoom: ZOOM_CARTAO }
  return (
    // Esticada, a evidência divide a altura da janela (flex-1, base 0): as duas
    // têm sempre a mesma altura, e a folga vai para a área do visual.
    <Revelar atraso={0.15 + i * 0.08} className={cn('flex min-w-0', esticar && 'min-h-0 flex-1 basis-0')}>
      {/* Todas as evidências no mesmo desenho (visual em cima, frase embaixo) e
          com a altura da vizinha: o painel (06) tinha visual e frase lado a
          lado, e a grade ficava desalinhada com cartões de alturas diferentes. */}
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl bg-[var(--landing-cartao)] ring-1 ring-[var(--landing-borda)]">
        <div ref={caixaRef} className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden border-b border-[var(--landing-borda)] bg-surface-950 py-1.5 [[data-theme=light]_&]:bg-surface-900">
          <div ref={conteudoRef} aria-hidden inert data-evidencia className="pointer-events-none mx-auto grid min-w-0 max-w-none select-none" style={encaixe}>
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
        <div className={esticar ? 'px-4 pb-3.5 pt-3' : 'px-5 pb-4 pt-3.5'}>
          <p className={cn('font-semibold leading-snug text-surface-50', esticar ? 'text-[14.5px]' : 'text-[15px]')}>{c.titulo}</p>
          <p className={cn('mt-1 max-w-[52ch] text-surface-400', esticar ? 'text-[13.5px] leading-snug' : 'text-[14px] leading-relaxed')}>{c.texto}</p>
        </div>
      </div>
    </Revelar>
  )
}

function ArtigoRecurso({ b, n, registrar }: { b: Bloco; n: number; registrar: (el: HTMLElement | null) => void }) {
  const h = HISTORIAS[b.id]
  const ref = useRef<HTMLElement | null>(null)
  const editorialRef = useRef<HTMLDivElement>(null)
  // ── Geometria (desktop): a janela vem da tela, não do conteúdo da etapa ──
  const [geo, setGeo] = useState<{ alturaMax: number; larguraMax: number } | null>(null)
  const [limite, setLimite] = useState(0)
  useLayoutEffect(() => {
    const artigo = ref.current
    const editorial = editorialRef.current
    if (!artigo || !editorial) return
    const medir = () => {
      if (window.innerWidth < 1024) { setGeo((g) => (g === null ? g : null)); return }
      const largura = artigo.clientWidth
      const cartoes = Math.max(CARTOES_MIN, Math.round(largura * CARTOES_FRACAO))
      const larguraMax = Math.floor(largura - cartoes - VAO)
      const alturaMax = Math.max(MOLDURA_MIN, Math.floor(window.innerHeight - MENU_FIXO - editorial.offsetHeight - 24 - 2 * RESPIRO))
      setGeo((g) => (g && Math.abs(g.alturaMax - alturaMax) < 2 && Math.abs(g.larguraMax - larguraMax) < 2 ? g : { alturaMax, larguraMax }))
    }
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(artigo)
    ro?.observe(editorial)
    window.addEventListener('resize', medir)
    return () => { ro?.disconnect(); window.removeEventListener('resize', medir) }
  }, [])
  // Configurar agentes é desktop no próprio produto (no celular ele avisa "use
  // o desktop"): ali o capítulo conta a história só pelas evidências.
  const celular = !useMediaQuery('(min-width: 768px)')
  // O funil no celular abria o painel de EDIÇÃO do negócio (campos vazios,
  // 'Marcar ganho') em vez do quadro: ali a evidência (o card real do
  // negócio, já em Agendado) conta o capítulo sozinha.
  const semTela = celular && (b.id === 'conhecer' || b.id === 'funil')
  const passoSemTela: HeroState = b.id === 'funil' ? 'avanco' : h.estado
  const grade = geo !== null && !semTela
  // A janela: a maior que cabe na altura (DemoRecorte calcula) e na largura.
  const palco = geo ? Math.min(limite || geo.larguraMax, geo.larguraMax) : 0
  // O passo da mini-história da tela — os cartões ao lado reagem a ele.
  const [passo, setPasso] = useState<HeroState>(h.estado)
  const [ciclo, setCiclo] = useState(0)
  const [cenaAtual, setCenaAtual] = useState<HeroCena>(h.cues[0].composition ?? 'conversa')
  const onPasso = useCallback((estado: HeroState, cena: HeroCena, indice: number) => {
    setPasso(estado)
    setCenaAtual(cena)
    if (indice === 0) setCiclo((n) => n + 1)
  }, [])

  return (
    <article
      id={`plataforma-${b.id}`}
      data-bloco={b.id}
      data-arranjo={grade ? 'grade' : 'empilhado'}
      ref={(el) => { ref.current = el; registrar(el) }}
      className="scroll-mt-24"
    >
      {/* A promessa (curta, no H3) e a explicação (parágrafo à parte). */}
      <div ref={editorialRef}><Revelar>
        <p className="text-[12px] font-semibold uppercase tracking-[.12em] text-[var(--landing-destaque)]">
          <span className="tabular-nums">{String(n).padStart(2, '0')}</span>
          <span aria-hidden className="mx-2 text-surface-600">·</span>
          {b.indice}
        </p>
        <h3 className="mt-2.5 font-display font-semibold tracking-[-0.022em] leading-[1.15] text-surface-50 text-[clamp(1.25rem,1.65vw,1.5rem)] text-balance">
          {b.destaque}
        </h3>
        {/* Duas linhas reservadas no desktop: o texto de todo capítulo ocupa a
            mesma altura, e a janela (que se mede pelo que sobra) sai igual em todos. */}
        <p className="mt-2.5 max-w-[62ch] text-[15px] sm:text-[16.5px] leading-relaxed text-surface-400 text-pretty lg:min-h-[2lh]">{b.texto}</p>
      </Revelar></div>

      <div
        data-composicao-recurso
        className="mt-6 grid gap-4 sm:gap-5"
        style={grade ? { gridTemplateColumns: `${palco}px minmax(0, 1fr)`, columnGap: VAO } : undefined}
      >
        {/* A operação, na tela — o app inteiro, a mesma janela da home. */}
        {!semTela && (
        <Revelar atraso={0.1} className="min-w-0">
          <DemoRecorte onPasso={onPasso} titulo={h.titulo} rota={h.rota} estado={h.estado} cues={h.cues} recorte={APP_INTEIRO}
            alturaMax={geo?.alturaMax} ampliacaoMax={1} onLimite={setLimite} />
        </Revelar>
        )}

        {/* As evidências. Na grade, empilhadas com a altura da janela: o
            contain:size tira a altura natural delas do cálculo da linha (quem
            manda é a janela) e as duas dividem o que sobra em partes iguais. */}
        <div className={grade ? 'flex min-h-0 min-w-0 flex-col gap-5 [contain:size]' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5'}>
          {b.cartoes.map((c, i) => <Beneficio key={c.titulo} bloco={b.id} i={i} c={c} esticar={grade} at={semTela ? passoSemTela : passo} cena={semTela ? 'agente-catalogo' : cenaAtual} ciclo={ciclo} />)}
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

// ─── 30/09: a Plataforma dividida — capítulos nas páginas de produto ─────────
// (o "Como funciona" da home mora em SecaoComoFunciona.tsx)

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
