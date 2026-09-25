import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useAnimate, useReducedMotion, useSpring } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { useHeroTimeline } from './useHeroTimeline'
import {
  HERO_CAPITULOS, HERO_CUES, HERO_ROTAS, HERO_STATIC_CUE, HERO_TAIL_MS, batidaDe, capituloDe,
  type HeroCapitulo, type HeroCapituloId, type HeroCena, type HeroState,
} from './heroStory'
import { reached } from './heroRealData'
import { Bandeja, Satelite, SateliteAparelho, TITULOS_SATELITES, type PoseSatelite } from './HeroSatelites'
import { HeroCapitulosLinha } from './HeroCapitulosLinha'
import { HeroAnotacao, type FocoAnotado } from './HeroAnotacao'

// O conteúdo das satélites (componentes reais do produto, com dependências
// pesadas) só é baixado quando a demonstração fica pronta.
const carregar = () => import('./HeroSatelitesConteudo')
const ConteudoWhatsApp = lazy(() => carregar().then((m) => ({ default: m.ConteudoWhatsAppAparelho })))
const ConteudoNotificacoes = lazy(() => carregar().then((m) => ({ default: m.ConteudoNotificacoes })))
const ConteudoLinhaDoTempo = lazy(() => carregar().then((m) => ({ default: m.ConteudoLinhaDoTempo })))
const ConteudoNegocio = lazy(() => carregar().then((m) => ({ default: m.ConteudoNegocio })))

/**
 * O PALCO DO HERO — o Oryon de verdade, operando, em várias molduras.
 *
 * Arquitetura (24/09, rodada de fidelidade total + rodada de molduras):
 *
 *  • A ÂNCORA é o próprio app, rodando num iframe (`/demo.html`) com um
 *    backend de demonstração em memória, em 1152 × 720 (a menor largura em que
 *    Conversas mostra lista, conversa e painel lado a lado), reduzido junto com
 *    o palco por UM fator. Plano fixo: não muda de lugar nem de tamanho.
 *  • Duas FAMÍLIAS de moldura em volta dela, 2–3 visíveis por cena:
 *      – APARELHO: o WhatsApp da cliente, com a campanha chegando (a
 *        `TemplatePreview` real). Um segundo aparelho com o Oryon mobile foi
 *        testado e retirado a pedido do PO: repetia a âncora;
 *      – JANELAS: o card do negócio (`DealSummary`, à direita, da confirmação
 *        até o Ganho), a linha do tempo da conversa e o sino (embaixo à
 *        esquerda, revezando) — componentes reais do produto.
 *  • O RELÓGIO é daqui (`useHeroTimeline`). A cada passo, a landing manda o
 *    estado e a cena para o iframe; lá dentro o "diretor" vira isso em
 *    eventos do servidor e troca de rota — e as telas reagem sozinhas.
 *
 * Movimento, em três camadas:
 *  • dentro das telas — o que o próprio produto anima (mensagens, card
 *    mudando de coluna, gaveta do relatório);
 *  • câmera — um avanço lento sobre a âncora durante cada cena e um "corte"
 *    com desfoque curto na troca de módulo;
 *  • molduras — janelas brotam do canto voltado para a âncora; aparelhos
 *    sobem endireitando de uma inclinação 3D; no scroll, tudo em paralaxe
 *    (aparelhos mais rápido que janelas, janelas mais que a âncora).
 */

// ─── Geometria do palco (coordenadas de desenho) ─────────────────────────────

// 16:9 (1280 × 720): em 1152 o selo "Agente IA no controle" e os botões do
// cabeçalho do chat empurravam o nome do contato para fora (medido 24/09).
const APP = { w: 1280, h: 720 }
const APP_CELULAR = { w: 390, h: 760 }
/** Tela do aparelho satélite: o app mobile a 60 %. */
const TELA_APARELHO = { escala: 0.6, w: APP_CELULAR.w * 0.6, h: APP_CELULAR.h * 0.6 }
const PALCO = { w: 1560, h: 812 }
const ANCORA = { x: 134, y: 22 }

/**
 * DIAGONAIS — decisão do PO (24/09): as duas janelas satélite ficam sempre em
 * cantos opostos, formando uma diagonal sobre a âncora.
 *  • A: superior direito + inferior esquerdo (Conversas, passagem para a Ana);
 *  • B: superior esquerdo + inferior direito (Funis, Agentes IA).
 * Trocar de cena troca de diagonal — e a janela que continua em cena desliza
 * para o canto novo, atravessando o palco.
 */
const CANTOS = {
  supEsq: { x: 0, y: 24, w: 372, origem: '100% 100%' },
  supDir: { x: 1188, y: 24, w: 372, origem: '0% 100%' },
  infEsq: { x: 0, y: 452, w: 372, origem: '100% 0%' },
  // O card do negócio é baixo (~190 px): mais para baixo, para encostar na
  // quina da âncora e a diagonal ficar nítida.
  infDir: { x: 1188, y: 556, w: 372, origem: '0% 0%' },
} satisfies Record<string, PoseSatelite>

/** O aparelho (WhatsApp da cliente) mora no canto inferior esquerdo. */
const APARELHO: PoseSatelite = { x: 0, y: 286, w: TELA_APARELHO.w + 24, origem: '100% 50%' }

function diagonal(cena: HeroCena) {
  const b = cena === 'funil'
  return {
    negocio: b ? CANTOS.infDir : CANTOS.supDir,
    lateral: b ? CANTOS.supEsq : CANTOS.infEsq,
  }
}

function visibilidade(estado: HeroState, cena: HeroCena) {
  const disparos = cena === 'disparos' || cena === 'relatorio'
  const conversa2 = cena === 'conversa' && reached(estado, 'pedido')
  return {
    // A cliente: a campanha chegando, até a IA assumir o atendimento.
    whatsapp: disparos || (cena === 'conversa' && !reached(estado, 'situacao')),
    // O negócio: entra quando a Marina confirma o interesse e fica até o fim —
    // o stepper anda junto com a história e termina em Ganho.
    negocio: !disparos && cena !== 'reinicio' && reached(estado, 'confirma'),
    // O que a IA fez — enquanto a âncora não mostra essa linha do tempo inteira.
    linhaDoTempo: (cena === 'conversa' && reached(estado, 'situacao') && !conversa2) || cena === 'funil',
    // O sino: o alerta que chama a Ana.
    notificacoes: conversa2 && reached(estado, 'assumido'),
  }
}

const CANAL = 'oryon-hero'

function temaDaPagina(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

/** O tema da landing, acompanhando o botão do cabeçalho. */
function useTemaDaPagina() {
  const [tema, setTema] = useState(temaDaPagina)
  useEffect(() => {
    const mo = new MutationObserver(() => setTema(temaDaPagina()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return tema
}

/** O ancestral que rola (a landing rola dentro de um contêiner, não na janela). */
function rolador(el: HTMLElement | null): HTMLElement | Window {
  let e = el?.parentElement ?? null
  while (e) {
    const oy = getComputedStyle(e).overflowY
    if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight) return e
    e = e.parentElement
  }
  return window
}

/** `true` quando o iframe avisou que desenhou a primeira tela. */
function usePronta(ref: React.RefObject<HTMLIFrameElement | null>) {
  const [pronta, setPronta] = useState(false)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || !ref.current || e.source !== ref.current.contentWindow) return
      const d = e.data as { canal?: string; tipo?: string }
      if (d?.canal === CANAL && d.tipo === 'pronta') setPronta(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [ref])
  return pronta
}

function srcDemo(rota: string) {
  return `/demo.html?rota=${encodeURIComponent(rota)}&tema=${temaDaPagina()}`
}

export function HeroPalco({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const ancoraRef = useRef<HTMLIFrameElement>(null)
  const semMovimento = useReducedMotion()
  const celular = !useMediaQuery('(min-width: 768px)')
  const tema = useTemaDaPagina()

  // ── Carregamento tardio: o app só começa a carregar depois da página ──────
  const [montar, setMontar] = useState(false)
  useEffect(() => {
    let cancelado = false
    const agendar = () => {
      const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
      if (w.requestIdleCallback) w.requestIdleCallback(() => { if (!cancelado) setMontar(true) }, { timeout: 1500 })
      else setTimeout(() => { if (!cancelado) setMontar(true) }, 400)
    }
    if (document.readyState === 'complete') agendar()
    else window.addEventListener('load', agendar, { once: true })
    return () => { cancelado = true; window.removeEventListener('load', agendar) }
  }, [])

  // A primeira rota e o tema vão na URL: o app já nasce na cena certa.
  const [srcAncora] = useState(() => srcDemo(semMovimento ? HERO_ROTAS.funil : HERO_ROTAS.disparos))
  const pronta = usePronta(ancoraRef)

  // ── Foco: o anel de luz sobre o que acabou de mudar na tela ───────────────
  // O diretor (dentro do iframe) mede o elemento e manda o retângulo; aqui só
  // se desenha um anel por cima — direção do olhar, não interface.
  const [foco, setFoco] = useState<FocoAnotado | null>(null)
  /** A narração do instante em que o foco chegou (vira o texto da anotação). */
  const batidaRef = useRef('')
  useEffect(() => {
    let limpar: ReturnType<typeof setTimeout> | undefined
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || !ancoraRef.current || e.source !== ancoraRef.current.contentWindow) return
      const d = e.data as { canal?: string; tipo?: string; id?: number; rect?: { x: number; y: number; w: number; h: number }; raio?: number }
      if (d?.canal !== CANAL || d.tipo !== 'foco' || !d.rect) return
      setFoco({ id: d.id ?? Date.now(), rect: d.rect, raio: d.raio ?? 8, texto: batidaRef.current })
      if (limpar) clearTimeout(limpar)
      limpar = setTimeout(() => setFoco(null), 3500)
    }
    window.addEventListener('message', onMsg)
    return () => { window.removeEventListener('message', onMsg); if (limpar) clearTimeout(limpar) }
  }, [])

  // ── Relógio da história ────────────────────────────────────────────────────
  const { state, composition, index, paused, canAnimate, running, togglePause, irPara } = useHeroTimeline<HeroState, HeroCena>({
    cues: HERO_CUES, tailMs: HERO_TAIL_MS, hostRef, staticIndex: HERO_STATIC_CUE, enabled: pronta,
  })

  // ── Capítulos (a legenda embaixo do palco) ─────────────────────────────────
  const duracoes = useMemo(() => {
    const fim = (HERO_CUES[HERO_CUES.length - 1]?.t ?? 0) + HERO_TAIL_MS
    const out = {} as Record<HeroCapituloId, number>
    HERO_CAPITULOS.forEach((c, i) => {
      const proximo = HERO_CAPITULOS[i + 1]
      out[c.id] = (proximo ? HERO_CUES[proximo.cue].t : fim) - HERO_CUES[c.cue].t
    })
    return out
  }, [])
  const capitulo = capituloDe(state, composition, index)
  const batida = batidaDe(state, composition)
  batidaRef.current = batida
  /** Conta os pulos por clique — reinicia a barra e força o corte de câmera. */
  const [saltos, setSaltos] = useState(0)
  const irParaCapitulo = (c: HeroCapitulo) => {
    irPara(c.cue)
    setSaltos((n) => n + 1)
    if (paused) togglePause()
  }

  const enviar = (ref: React.RefObject<HTMLIFrameElement | null>, msg: object) =>
    ref.current?.contentWindow?.postMessage({ canal: CANAL, ...msg }, location.origin)

  useEffect(() => {
    if (pronta) enviar(ancoraRef, { tipo: 'passo', estado: state, cena: composition })
  }, [pronta, state, composition])
  useEffect(() => {
    if (pronta) enviar(ancoraRef, { tipo: 'tema', tema })
  }, [pronta, tema])

  // ── Ajuste: um fator só para o palco inteiro ───────────────────────────────
  const palco = celular ? { w: APP_CELULAR.w + 12, h: APP_CELULAR.h + 36 } : PALCO
  const [fit, setFit] = useState(0.9)
  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const medir = () => { if (el.clientWidth > 0) setFit(Math.min(1, el.clientWidth / palco.w)) }
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [palco.w])

  // ── Scroll em DOIS ESTADOS (como a Attio), nunca ligado pixel a pixel ─────
  //
  // Reescalar a tela a cada pixel rolado (e o antigo "avanço de câmera", que
  // reescalava continuamente durante a cena) fazia o texto do app ser
  // redesenhado a cada quadro — o conteúdo parecia TREMER (relato do PO,
  // 24/09). Agora: passou de 40 px, a âncora recua UMA vez para 0,97 e as
  // molduras sobem, com mola; voltando ao topo, desfaz. Entre um estado e
  // outro, tudo fica parado e nítido.
  const [rolou, setRolou] = useState(false)
  useEffect(() => {
    if (semMovimento) return
    const alvo = rolador(hostRef.current)
    const ler = () => setRolou((alvo instanceof Window ? alvo.scrollY : alvo.scrollTop) > 40)
    ler()
    alvo.addEventListener('scroll', ler, { passive: true })
    return () => alvo.removeEventListener('scroll', ler)
  }, [semMovimento])
  const mola = { stiffness: 90, damping: 22, mass: 1 }
  const escalaAncora = useSpring(1, mola)
  const yJanelas = useSpring(0, mola)
  const yAparelhos = useSpring(0, mola)
  useEffect(() => {
    escalaAncora.set(rolou ? 0.97 : 1)
    yJanelas.set(rolou ? -26 : 0)
    yAparelhos.set(rolou ? -48 : 0)
  }, [rolou, escalaAncora, yJanelas, yAparelhos])

  // ── Corte na troca de módulo ───────────────────────────────────────────────
  // Um "respiro" curto sobre a tela enquanto a rota troca por baixo: a nova
  // tela surge de um desfoque leve, sem piscar. Nenhuma escala contínua.
  const [cenaRef, animarCena] = useAnimate()
  const cenaAnterior = useRef<HeroCena | null>(null)
  const saltoAnterior = useRef(0)
  useEffect(() => {
    if (!pronta || semMovimento) { cenaAnterior.current = composition; return }
    const pulou = saltoAnterior.current !== saltos
    saltoAnterior.current = saltos
    const mudou = cenaAnterior.current !== composition || pulou
    cenaAnterior.current = composition
    if (!mudou || !cenaRef.current) return
    const vazia = composition === 'reinicio'
    void animarCena(cenaRef.current, vazia
      ? { opacity: 0, filter: 'blur(4px)' }
      : { opacity: [0.35, 1], filter: ['blur(4px)', 'blur(0px)'] },
      { duration: vazia ? 0.45 : 0.8, ease: [0.16, 1, 0.3, 1] })
  }, [composition, saltos, pronta, semMovimento, animarCena, cenaRef])

  const vis = visibilidade(state, composition)
  const cantos = diagonal(composition === 'reinicio' ? 'conversa' : composition)
  const app = celular ? APP_CELULAR : APP

  return (
    <div className={cn('relative w-full', className)}>
      {/* ATMOSFERA: campo teal vindo de baixo + persiana de 1 px a cada 8 px.
          Sangra para fora da coluna, como o fundo da referência. */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-[12vw] -top-10 -bottom-24 overflow-hidden">
        <div
          className="absolute inset-0 opacity-70 [[data-theme=light]_&]:opacity-60"
          style={{ background: 'radial-gradient(70% 62% at 50% 100%, color-mix(in srgb, var(--color-brand-500) 30%, transparent) 0%, color-mix(in srgb, var(--color-brand-500) 10%, transparent) 45%, transparent 75%)' }}
        />
        <div
          className="absolute inset-0 opacity-[.35] [[data-theme=light]_&]:opacity-[.5]"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, color-mix(in srgb, var(--color-surface-50) 7%, transparent) 0 1px, transparent 1px 8px)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 45%, black 100%)',
          }}
        />
      </div>

      {/* OS CAPÍTULOS — uma linha fina acima do palco (o que acontece em cada
          momento é dito pelas anotações, dentro da cena). */}
      <HeroCapitulosLinha
        className="mb-4 sm:mb-5"
        capitulos={HERO_CAPITULOS}
        ativo={capitulo}
        duracoes={duracoes}
        rodando={running && pronta}
        chaveProgresso={`${capitulo}-${saltos}`}
        onIr={irParaCapitulo}
      />

      <div
        ref={hostRef}
        role="img"
        aria-label="Demonstração do Oryon: uma campanha chega no WhatsApp de uma cliente, o Agente IA atende, atualiza o contato e avança o negócio no funil, e uma atendente assume e fecha a venda."
        className="relative w-full select-none"
        style={{ height: palco.h * fit }}
      >
        <div
          inert
          aria-hidden
          className="absolute top-0 pointer-events-none"
          style={{
            width: palco.w, height: palco.h,
            left: `calc(50% - ${(palco.w * fit) / 2}px)`,
            transform: `scale(${fit})`, transformOrigin: 'top left',
          }}
        >
          {/* A ÂNCORA — plano fixo: não muda de lugar nem de tamanho no ciclo. */}
          <motion.div
            className="absolute"
            style={{
              left: celular ? 0 : ANCORA.x, top: celular ? 0 : ANCORA.y,
              width: app.w + 12, height: app.h + 36,
              scale: escalaAncora, zIndex: 20,
            }}
          >
            {/* Luz de palco sob a âncora (profundidade por luz, no escuro). */}
            <div
              aria-hidden
              className="absolute -inset-x-10 -bottom-16 top-1/3 -z-10 rounded-[40px] blur-3xl opacity-60 [[data-theme=light]_&]:opacity-30"
              style={{ background: 'color-mix(in srgb, var(--color-brand-500) 22%, transparent)' }}
            />
            <Bandeja titulo="Oryon" className="hero-ancora h-full w-full">
              <div className="absolute inset-0">
                <div ref={cenaRef} className="absolute inset-0">
                  {montar && (
                    <iframe
                      ref={ancoraRef}
                      src={srcAncora}
                      title="Oryon em demonstração"
                      tabIndex={-1}
                      aria-hidden
                      loading="lazy"
                      className="absolute left-0 top-0 border-0 transition-opacity duration-500"
                      style={{ width: app.w, height: app.h, opacity: pronta ? 1 : 0, colorScheme: 'normal' }}
                    />
                  )}
                </div>
              </div>
              {/* PÔSTER — uma CAPTURA da própria demonstração, na primeira cena
                  (Disparos), nos dois temas: o visitante vê o produto no
                  primeiro quadro, e o app vivo assume por cima com um
                  crossfade — a mesma tela, sem salto. Gerado com o Edge em
                  modo headless (ver HERO-CICLOS.md). No celular e com
                  movimento reduzido a primeira tela é outra: ali vale o
                  indicador de carregamento do próprio app. */}
              {!celular && !semMovimento ? (
                <img
                  src={tema === 'light' ? '/hero/demo-poster-claro.png' : '/hero/demo-poster-escuro.png'}
                  alt=""
                  aria-hidden
                  decoding="async"
                  className="absolute left-0 top-0 transition-opacity duration-700"
                  style={{ width: app.w, height: app.h, opacity: pronta ? 0 : 1, pointerEvents: 'none' }}
                />
              ) : !pronta && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-950">
                  <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin opacity-70" />
                </div>
              )}
            </Bandeja>

            {/* A ANOTAÇÃO — o anel de luz sobre o que acabou de mudar, com um
                rótulo preso a ele dizendo o que aconteceu. Some em ~3 s. */}
            {foco && !semMovimento && foco.rect.y + foco.rect.h > 0 && foco.rect.y < app.h && (
              <HeroAnotacao key={foco.id} foco={foco} area={{ w: app.w, h: app.h }} origem={{ x: 6, y: 30 }} />
            )}
          </motion.div>

          {/* ── AS DEMAIS MOLDURAS — só no desktop ────────────────────────────── */}
          {!celular && pronta && (
            <Suspense fallback={null}>
              <SateliteAparelho pose={APARELHO} visivel={vis.whatsapp} atraso={0.2} y={yAparelhos} lado="esquerda">
                <div style={{ width: TELA_APARELHO.w, height: TELA_APARELHO.h }}>
                  <ConteudoWhatsApp at={state} cena={composition} />
                </div>
              </SateliteAparelho>

              <Satelite pose={cantos.negocio} visivel={vis.negocio} atraso={0.15} titulo={TITULOS_SATELITES.negocio} y={yJanelas}>
                <ConteudoNegocio at={state} />
              </Satelite>
              <Satelite pose={cantos.lateral} visivel={vis.linhaDoTempo} atraso={0.35} titulo={TITULOS_SATELITES.linhaDoTempo} y={yJanelas}>
                <ConteudoLinhaDoTempo at={state} />
              </Satelite>
              <Satelite pose={cantos.lateral} visivel={vis.notificacoes} atraso={0.1} titulo={TITULOS_SATELITES.notificacoes} y={yJanelas}>
                <ConteudoNotificacoes at={state} />
              </Satelite>
            </Suspense>
          )}
        </div>

      </div>

      {/* Rodapé: a divulgação dos dados fictícios, ao lado da pausa. */}
      <div className="relative mt-5 flex items-center justify-between gap-3 px-1">
        <p className="text-[11.5px] text-surface-500">O Oryon de verdade, com dados fictícios.</p>
        {canAnimate && (
          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? 'Retomar a demonstração' : 'Pausar a demonstração'}
            className="flex-shrink-0 rounded-md p-1 text-surface-500 transition-colors hover:text-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)]"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}
