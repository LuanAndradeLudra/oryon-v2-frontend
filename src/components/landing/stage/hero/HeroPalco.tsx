import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useAnimate, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
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
import { HeroCapitulos } from './HeroCapitulos'

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

const APP = { w: 1152, h: 720 }
const APP_CELULAR = { w: 390, h: 760 }
/** Tela do aparelho satélite: o app mobile a 60 %. */
const TELA_APARELHO = { escala: 0.6, w: APP_CELULAR.w * 0.6, h: APP_CELULAR.h * 0.6 }
const PALCO = { w: 1480, h: 812 }
const ANCORA = { x: 158, y: 22 }

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
  supDir: { x: 1108, y: 24, w: 372, origem: '0% 100%' },
  infEsq: { x: 0, y: 452, w: 372, origem: '100% 0%' },
  infDir: { x: 1108, y: 452, w: 372, origem: '0% 0%' },
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

  // ── Paralaxe do scroll: a âncora recua, as molduras sobem mais rápido ──────
  const progresso = useMotionValue(0)
  useEffect(() => {
    if (semMovimento) return
    const alvo = rolador(hostRef.current)
    const ler = () => {
      const topo = alvo instanceof Window ? alvo.scrollY : alvo.scrollTop
      progresso.set(Math.max(0, Math.min(1, topo / 520)))
    }
    ler()
    alvo.addEventListener('scroll', ler, { passive: true })
    return () => alvo.removeEventListener('scroll', ler)
  }, [semMovimento, progresso])
  const escalaAncora = useTransform(progresso, [0, 1], [1, 0.965])
  const yJanelas = useTransform(progresso, [0, 1], [0, -46])
  const yAparelhos = useTransform(progresso, [0, 1], [0, -84])

  // ── Câmera: avanço lento durante a cena + corte na troca de módulo ─────────
  const [cenaRef, animarCena] = useAnimate()
  const [cameraRef, animarCamera] = useAnimate()
  const cenaAnterior = useRef<HeroCena | null>(null)
  const saltoAnterior = useRef(0)
  useEffect(() => {
    if (!pronta || semMovimento) { cenaAnterior.current = composition; return }
    const pulou = saltoAnterior.current !== saltos
    saltoAnterior.current = saltos
    const mudou = cenaAnterior.current !== composition || pulou
    cenaAnterior.current = composition
    if (!mudou) return
    const vazia = composition === 'reinicio'
    if (cenaRef.current) {
      void animarCena(cenaRef.current, vazia
        ? { opacity: 0, filter: 'blur(6px)' }
        : { opacity: [0.4, 1], filter: ['blur(5px)', 'blur(0px)'] },
        { duration: vazia ? 0.35 : 0.55, ease: [0.22, 0.8, 0.2, 1] })
    }
    // Avanço lento (1 % em ~6 s) e volta seca no corte seguinte — a sensação
    // de câmera viva sem mover o plano. A troca de gaveta (relatório) é a
    // mesma cena na mesma tela: continua o avanço em vez de reiniciar.
    if (cameraRef.current && composition !== 'relatorio') {
      void animarCamera(cameraRef.current, vazia ? { scale: 1 } : { scale: [1, 1.012] },
        vazia ? { duration: 0.3 } : { duration: 6.5, ease: 'linear' })
    }
  }, [composition, saltos, pronta, semMovimento, animarCena, cenaRef, animarCamera, cameraRef])

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
              <div ref={cameraRef} className="absolute inset-0 origin-center">
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
              {/* Pôster: enquanto o app carrega, o fundo do próprio app com o
                  indicador de carregamento dele — nada desenhado à mão. */}
              {!pronta && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-950">
                  <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin opacity-70" />
                </div>
              )}
            </Bandeja>
          </motion.div>

          {/* ── AS DEMAIS MOLDURAS — só no desktop ────────────────────────────── */}
          {!celular && pronta && (
            <Suspense fallback={null}>
              <SateliteAparelho pose={APARELHO} visivel={vis.whatsapp} atraso={0.2} y={yAparelhos} lado="esquerda">
                <div style={{ width: TELA_APARELHO.w, height: TELA_APARELHO.h }}>
                  <ConteudoWhatsApp />
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

      {/* A LEGENDA: os capítulos da demonstração, com o valor de cada um e a
          narração do momento. */}
      <HeroCapitulos
        className="mt-6 sm:mt-8 px-1"
        capitulos={HERO_CAPITULOS}
        ativo={capitulo}
        batida={batida}
        duracoes={duracoes}
        rodando={running && pronta}
        chaveProgresso={`${capitulo}-${saltos}`}
        onIr={irParaCapitulo}
      />

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
