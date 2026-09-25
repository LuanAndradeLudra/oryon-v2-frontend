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
import { HeroFoco, medirNoElemento, medirNoIframe, useFocoDaDemo, type Tomada } from './HeroFoco'
import { HeroNarracao } from './HeroNarracao'

/**
 * Focos que moram numa JANELA da landing, não no app: situação, etiqueta e a
 * chamada da Ana. O painel do contato não se atualiza ao vivo no produto (só
 * recarregando) — a mudança visível é a linha do tempo e o sino.
 */
const FOCOS_SATELITE: Partial<Record<HeroState, { satelite: string; texto: string }>> = {
  situacao: { satelite: 'linhaDoTempo', texto: 'Em negociação' },
  etiqueta: { satelite: 'linhaDoTempo', texto: 'proposta enviada' },
  assumido: { satelite: 'notificacoes', texto: 'pediu transferência' },
  ganho: { satelite: 'negocio', texto: 'Ganho' },
}

/** A LINHA inteira que contém o texto, dentro de uma janela satélite. */
function acharLinha(janela: HTMLElement, texto: string): HTMLElement | null {
  const conteudo = janela.querySelector<HTMLElement>('.hero-bandeja > div:last-child') ?? janela
  // O elemento mais interno com o texto: nenhum filho dele também o contém.
  const tem = (e: Element) => (e.textContent ?? '').includes(texto)
  const menor = [...conteudo.querySelectorAll<HTMLElement>('*')].find((e) => tem(e) && ![...e.children].some(tem)) ?? null
  let linha = menor
  const largura = conteudo.offsetWidth
  for (let i = 0; linha && i < 5 && linha.offsetWidth < largura * 0.8 && linha.parentElement !== conteudo; i++) linha = linha.parentElement
  return linha
}

/** Quanto a tomada de uma janela fica no ar. */
const SATELITE_NO_AR_MS = 3400

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
 *  • A ÂNCORA é o próprio app, num iframe (`/demo.html`) com backend de
 *    demonstração em memória. Plano fixo durante o ciclo.
 *  • Em volta, satélites com componentes reais: o WhatsApp da cliente (um
 *    aparelho), o card do negócio, a linha do tempo e o sino — sempre em
 *    cantos opostos (diagonal, decisão do PO).
 *  • O RELÓGIO é daqui (`useHeroTimeline`); o diretor, dentro do iframe, vira
 *    cada passo em eventos do servidor e troca de rota.
 *
 * Enquadramento (25/09): o conjunto — título, narração, palco e controles —
 * cabe na altura útil da tela em desktop comum. A escala respeita a MENOR
 * restrição entre largura e altura, com um piso de legibilidade; antes de
 * encolher o texto além do alvo, a tela do app fica mais BAIXA (o Oryon é
 * responsivo: 1280 × 580 é o mesmo app, com menos linhas à vista). A escala é
 * uma por viewport — nunca muda durante o ciclo.
 *
 * Foco (25/09): contorno e conector em `HeroFoco`, acompanhando o alvo real
 * quadro a quadro; o conector sai da narração e desce por um corredor lateral
 * reservado fora do palco.
 */

// ─── Geometria do palco (coordenadas de desenho) ─────────────────────────────

const APP_W = 1280
const APP_H = { max: 720, min: 560 }
const APP_CELULAR = { w: 390, h: { max: 760, min: 560 } }
/** Tela do aparelho satélite: o app mobile a 60 %. */
const TELA_APARELHO = { w: 390 * 0.6, h: 760 * 0.6 }
const PALCO_W = 1560
/** O palco é a tela do app + moldura (36) + folga das satélites embaixo (34) + topo (22). */
const EXTRA_H = 92
const ANCORA = { x: 134, y: 22 }
/** Corredores laterais do conector, fora do palco (px de tela, não escalados). */
const CORREDOR = 40

/** Metas de escala: o texto do app a 14 px vira ~11 px no alvo e ~8 px no piso. */
const FIT = { alvo: 0.8, piso: 0.58 }

/**
 * DIAGONAIS — as duas janelas satélite ficam sempre em cantos opostos.
 *  • A: superior direito + inferior esquerdo (Disparos, Conversas);
 *  • B: superior esquerdo + inferior direito (Funis).
 * Os cantos de baixo acompanham a altura da tela do app (`h`).
 */
function cantos(h: number) {
  return {
    supEsq: { x: 0, y: 24, w: 372, origem: '100% 100%' },
    supDir: { x: 1188, y: 24, w: 372, origem: '0% 100%' },
    infEsq: { x: 0, y: h - 268, w: 372, origem: '100% 0%' },
    // O card do negócio é baixo (~190 px): encosta na quina da âncora.
    infDir: { x: 1188, y: h - 164, w: 372, origem: '0% 0%' },
  } satisfies Record<string, PoseSatelite>
}

/** O aparelho (WhatsApp da cliente), à esquerda, rente à base da âncora. */
function aparelho(h: number): PoseSatelite {
  return { x: 0, y: h - 434, w: TELA_APARELHO.w + 24, origem: '100% 50%' }
}

function diagonal(cena: HeroCena, h: number) {
  const c = cantos(h)
  const b = cena === 'funil'
  return { negocio: b ? c.infDir : c.supDir, lateral: b ? c.supEsq : c.infEsq }
}

function visibilidade(estado: HeroState, cena: HeroCena) {
  const disparos = cena === 'disparos' || cena === 'relatorio'
  const conversa2 = cena === 'conversa' && reached(estado, 'pedido')
  return {
    whatsapp: disparos || (cena === 'conversa' && !reached(estado, 'situacao')),
    negocio: !disparos && cena !== 'reinicio' && reached(estado, 'confirma'),
    linhaDoTempo: (cena === 'conversa' && reached(estado, 'situacao') && !conversa2) || cena === 'funil',
    notificacoes: conversa2 && reached(estado, 'assumido'),
  }
}

/**
 * O ENQUADRAMENTO — escala e altura da tela do app para um viewport.
 * `largura`: a coluna do palco; `altura`: o que sobra da tela abaixo do topo
 * do palco, já descontados os controles de baixo.
 */
export function enquadrar(largura: number, altura: number, celular: boolean, corredor: number) {
  if (celular) {
    // No celular manda a leitura: a largura define a escala e só a altura da
    // tela do app se ajusta (nunca o texto).
    const fit = Math.min(1, largura / (APP_CELULAR.w + 12))
    const h = Math.round(Math.min(APP_CELULAR.h.max, Math.max(APP_CELULAR.h.min, altura / fit - 36)))
    return { fit, h }
  }
  const fitW = Math.min(1, (largura - 2 * corredor) / PALCO_W)
  let fit = Math.min(fitW, FIT.alvo)
  let h = Math.round(Math.min(APP_H.max, Math.max(APP_H.min, altura / fit - EXTRA_H)))
  // Tela alta: a tela do app já está inteira — o palco pode crescer até a largura.
  if (h === APP_H.max) fit = Math.min(fitW, altura / (APP_H.max + EXTRA_H))
  // Tela baixa: a tela do app já está no mínimo — só então o texto encolhe, até o piso.
  else if (h === APP_H.min) fit = Math.min(fitW, Math.max(FIT.piso, altura / (APP_H.min + EXTRA_H)))
  return { fit: Math.round(fit * 1000) / 1000, h }
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
    if (oy === 'auto' || oy === 'scroll') return e
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
  const raizRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const palcoRef = useRef<HTMLDivElement>(null)
  const molduraRef = useRef<HTMLDivElement>(null)
  const pilulaRef = useRef<HTMLDivElement>(null)
  const barraRef = useRef<HTMLDivElement>(null)
  const ancoraRef = useRef<HTMLIFrameElement>(null)
  const semMovimento = useReducedMotion()
  const celular = !useMediaQuery('(min-width: 768px)')
  const comConector = useMediaQuery('(min-width: 1024px)') && !semMovimento
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
  const foco = useFocoDaDemo(ancoraRef)

  // ── Relógio da história ────────────────────────────────────────────────────
  const { state, composition, index, paused, canAnimate, running, togglePause, irPara } = useHeroTimeline<HeroState, HeroCena>({
    cues: HERO_CUES, tailMs: HERO_TAIL_MS, hostRef, staticIndex: HERO_STATIC_CUE, enabled: pronta,
  })

  // ── Foco nas janelas da landing (situação, etiqueta, chamada da Ana) ──────
  // Mesmo ciclo da tomada do app: entra quando a janela assenta, fica ~3,4 s,
  // sai antes do passo seguinte — e sai NA HORA se o passo mudar.
  const [tomadaJanela, setTomadaJanela] = useState<(Tomada & { satelite: string; texto: string }) | null>(null)
  useEffect(() => {
    const cfg = FOCOS_SATELITE[state]
    // Só na cena da conversa: trocar de cena encerra a tomada (a janela
    // desliza para outro canto e o que ela mostra deixa de ser o assunto).
    if (!pronta || semMovimento || celular || !cfg || composition !== 'conversa') return
    const id = Date.now()
    const t1 = setTimeout(() => setTomadaJanela({ id, saindo: false, ...cfg }), 200)
    const t2 = setTimeout(() => setTomadaJanela((t) => (t?.id === id ? { ...t, saindo: true } : t)), 200 + SATELITE_NO_AR_MS)
    return () => {
      clearTimeout(t1); clearTimeout(t2)
      setTomadaJanela((t) => (t?.id === id ? { ...t, saindo: true } : t))
      setTimeout(() => setTomadaJanela((t) => (t?.id === id ? null : t)), 400)
    }
  }, [state, composition, pronta, semMovimento, celular])

  // ── Capítulos (a barra de controle embaixo do palco) ───────────────────────
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

  // ── Enquadramento: largura E altura, um valor por viewport ────────────────
  const [quadro, setQuadro] = useState(() => ({ fit: 0.8, h: APP_H.max }))
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const medir = () => {
      const largura = host.clientWidth
      if (largura <= 0) return
      const alvo = rolador(host)
      const alturaTela = alvo instanceof Window ? window.innerHeight : alvo.clientHeight
      const topoTela = alvo instanceof Window ? 0 : alvo.getBoundingClientRect().top
      const rolado = alvo instanceof Window ? window.scrollY : alvo.scrollTop
      // Topo do palco no documento (independe da escala: nada acima dele muda).
      const topo = host.getBoundingClientRect().top - topoTela + rolado
      const barra = (barraRef.current?.offsetHeight ?? 0) + 14
      const disponivel = alturaTela - topo - barra - 14
      const q = enquadrar(largura, disponivel, celular, comConector ? CORREDOR : 0)
      setQuadro((a) => (a.fit === q.fit && a.h === q.h ? a : q))
    }
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(host)
    window.addEventListener('resize', medir)
    return () => { ro?.disconnect(); window.removeEventListener('resize', medir) }
  }, [celular, comConector])
  const { fit, h: appH } = quadro
  const app = celular ? { w: APP_CELULAR.w, h: appH } : { w: APP_W, h: appH }
  const palco = celular ? { w: APP_CELULAR.w + 12, h: appH + 36 } : { w: PALCO_W, h: appH + EXTRA_H }

  // ── Scroll em DOIS ESTADOS (como a Attio), nunca ligado pixel a pixel ─────
  // Reescalar a cada pixel rolado fazia o texto do app TREMER (PO, 24/09).
  // Passou de 40 px: a âncora recua uma vez e as molduras sobem, com mola.
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
  const lados = diagonal(composition === 'reinicio' ? 'conversa' : composition, appH)

  return (
    <div ref={raizRef} className={cn('relative w-full', className)}>
      {/* ATMOSFERA: campo teal vindo de baixo + persiana de 1 px a cada 8 px. */}
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

      {/* A NARRAÇÃO — o que acontece agora, fora do palco, em faixa de altura
          fixa (a troca de frase nunca move o palco). */}
      <HeroNarracao texto={batida} pilulaRef={pilulaRef} className="relative mb-[var(--hero-gap-palco,16px)] px-1" />

      <div
        ref={hostRef}
        role="img"
        aria-label="Demonstração do Oryon: uma campanha chega no WhatsApp de uma cliente, o Agente IA atende, atualiza o contato e avança o negócio no funil, e uma atendente assume e fecha a venda."
        className="relative w-full select-none"
        style={{ height: palco.h * fit }}
      >
        <div
          ref={palcoRef}
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
            ref={molduraRef}
            data-ancora
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
              {/* PÔSTER — captura da própria demonstração (1280 × 720) na primeira
                  cena, nos dois temas; o app vivo assume por cima com um
                  crossfade. Com a tela mais baixa, o pôster é cortado por baixo
                  — o topo (cabeçalho e lista) é o mesmo. */}
              {!celular && !semMovimento ? (
                <img
                  src={tema === 'light' ? '/hero/demo-poster-claro.png' : '/hero/demo-poster-escuro.png'}
                  alt=""
                  aria-hidden
                  decoding="async"
                  className="absolute left-0 top-0 object-cover object-top transition-opacity duration-700"
                  style={{ width: app.w, height: app.h, opacity: pronta ? 0 : 1, pointerEvents: 'none' }}
                />
              ) : !pronta && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-950">
                  <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin opacity-70" />
                </div>
              )}
            </Bandeja>
          </motion.div>

          {/* ── AS DEMAIS MOLDURAS — só no desktop ────────────────────────────── */}
          {!celular && pronta && (
            <Suspense fallback={null}>
              <SateliteAparelho pose={aparelho(appH)} visivel={vis.whatsapp} atraso={0.2} y={yAparelhos} lado="esquerda">
                <div style={{ width: TELA_APARELHO.w, height: TELA_APARELHO.h }}>
                  <ConteudoWhatsApp at={state} cena={composition} />
                </div>
              </SateliteAparelho>

              <Satelite pose={lados.negocio} visivel={vis.negocio} atraso={0.15} titulo={TITULOS_SATELITES.negocio} y={yJanelas} nome="negocio">
                <ConteudoNegocio at={state} />
              </Satelite>
              <Satelite pose={lados.lateral} visivel={vis.linhaDoTempo} atraso={0.35} titulo={TITULOS_SATELITES.linhaDoTempo} y={yJanelas} nome="linhaDoTempo">
                <ConteudoLinhaDoTempo at={state} />
              </Satelite>
              <Satelite pose={lados.lateral} visivel={vis.notificacoes} atraso={0.1} titulo={TITULOS_SATELITES.notificacoes} y={yJanelas} nome="notificacoes">
                <ConteudoNotificacoes at={state} />
              </Satelite>
            </Suspense>
          )}
        </div>
      </div>

      {/* O FOCO — contorno no alvo real e, no desktop, o conector que o liga à
          narração pelo corredor lateral. */}
      {!semMovimento && (
        <>
          <HeroFoco
            tomada={foco}
            medir={(base) => foco && medirNoIframe(foco, ancoraRef.current, molduraRef.current, null, base)}
            raizRef={raizRef}
            anotacaoRef={comConector ? pilulaRef : undefined}
            palcoRef={comConector ? palcoRef : undefined}
          />
          <HeroFoco
            tomada={tomadaJanela}
            medir={(base) => {
              if (!tomadaJanela) return null
              const janela = palcoRef.current?.querySelector<HTMLElement>(`[data-satelite="${tomadaJanela.satelite}"]`) ?? null
              return medirNoElemento(janela && acharLinha(janela, tomadaJanela.texto), janela, base)
            }}
            raizRef={raizRef}
            anotacaoRef={comConector ? pilulaRef : undefined}
            palcoRef={palcoRef}
          />
        </>
      )}

      {/* A BARRA DE CONTROLE — capítulos, a divulgação dos dados e a pausa,
          como num player: o título, a narração e o palco ficam juntos em cima. */}
      <div ref={barraRef} className="relative mt-3.5 flex items-center gap-3 px-1 md:grid md:grid-cols-[1fr_auto_1fr]">
        <p className="hidden md:block text-[11.5px] text-surface-500">O Oryon de verdade, com dados fictícios.</p>
        <HeroCapitulosLinha
          className="flex-1 md:col-start-2"
          capitulos={HERO_CAPITULOS}
          ativo={capitulo}
          duracoes={duracoes}
          rodando={running && pronta}
          chaveProgresso={`${capitulo}-${saltos}`}
          onIr={irParaCapitulo}
        />
        <div className="md:col-start-3 flex justify-end">
          {canAnimate && (
            <button
              type="button"
              onClick={togglePause}
              aria-label={paused ? 'Retomar a demonstração' : 'Pausar a demonstração'}
              className="flex-shrink-0 rounded-md p-1.5 text-surface-500 transition-colors hover:text-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)]"
            >
              {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
      <p className="md:hidden mt-1 text-center text-[11px] text-surface-500">O Oryon de verdade, com dados fictícios.</p>
    </div>
  )
}
