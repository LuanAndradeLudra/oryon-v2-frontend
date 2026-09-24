import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useAnimate, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { useHeroTimeline } from './useHeroTimeline'
import { HERO_CUES, HERO_ROTAS, HERO_STATIC_CUE, HERO_TAIL_MS, type HeroCena, type HeroState } from './heroStory'
import { reached } from './heroRealData'
import {
  Bandeja, ConteudoCelular, ConteudoLinhaDoTempo, ConteudoNotificacoes, Satelite, TITULOS_SATELITES,
  type PoseSatelite,
} from './HeroSatelites'

/**
 * O PALCO DO HERO — o Oryon de verdade, operando.
 *
 * Arquitetura (24/09, rodada de fidelidade total):
 *
 *  • A ÂNCORA é o próprio app, rodando num iframe (`/demo.html`) com um
 *    backend de demonstração em memória. O app ocupa a janela inteira em que
 *    roda (`h-screen w-screen`), então ele ganha a sua: um iframe de desenho
 *    1152 × 720 — a menor largura em que Conversas mostra lista, conversa e
 *    painel do contato lado a lado —, reduzido junto com o palco por UM fator.
 *  • As SATÉLITES são componentes reais do produto renderizados aqui mesmo:
 *    a prévia de WhatsApp de Disparos, os itens do sino e a linha do tempo da
 *    conversa. Mostram a operação acontecendo fora da tela principal.
 *  • O RELÓGIO é daqui (`useHeroTimeline`). A cada passo, a landing manda o
 *    estado e a cena para o iframe; lá dentro o "diretor" vira isso em
 *    eventos do servidor e troca de rota — e as telas reagem sozinhas.
 *
 * Coreografia: a âncora nunca muda de lugar nem de tamanho (plano fixo); o
 * movimento vive dentro dela (a tela do produto) e nas bordas (satélites que
 * entram e saem conforme a cena). No scroll, a âncora recua de leve e as
 * satélites sobem mais rápido que ela — paralaxe de profundidade.
 */

// ─── Geometria do palco (coordenadas de desenho) ─────────────────────────────

const APP = { w: 1152, h: 720 }
const APP_CELULAR = { w: 390, h: 760 }
/** Bandeja: 6 px de respiro nas laterais e embaixo + 30 px de barra no topo. */
const BANDEJA = { w: APP.w + 12, h: APP.h + 36 }
const PALCO = { w: 1480, h: 812 }
const ANCORA = { x: 158, y: 22 }

const POSES: Record<'celular' | 'notificacoes' | 'linhaDoTempo', PoseSatelite> = {
  // À direita, sobre a borda da âncora — some antes de o painel do contato importar.
  celular: { x: 1150, y: 150, w: 330, origem: '0% 50%' },
  // Embaixo à esquerda, na cena da passagem para a Ana: ali a tela de
  // Conversas só tem as linhas de baixo da lista.
  notificacoes: { x: 0, y: 452, w: 380, origem: '100% 0%' },
  // Embaixo à esquerda: o que a IA fez, enquanto a âncora mostra outro módulo.
  linhaDoTempo: { x: 0, y: 432, w: 360, origem: '100% 0%' },
}

function visibilidade(estado: HeroState, cena: HeroCena) {
  return {
    celular: cena === 'disparos' || (cena === 'conversa' && !reached(estado, 'situacao')),
    linhaDoTempo: cena === 'funil' || cena === 'agente',
    // Uma função por satélite: o sino só entra para o alerta que chama a Ana.
    notificacoes: cena === 'conversa' && reached(estado, 'assumido'),
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

export function HeroPalco({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const semMovimento = useReducedMotion()
  const celular = !useMediaQuery('(min-width: 768px)')
  const tema = useTemaDaPagina()

  // ── Carregamento tardio: o app só começa a carregar depois da página ──────
  const [montar, setMontar] = useState(false)
  const [pronta, setPronta] = useState(false)
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
  const [src] = useState(() => {
    const rota = semMovimento ? HERO_ROTAS.funil : HERO_ROTAS.disparos
    return `/demo.html?rota=${encodeURIComponent(rota)}&tema=${temaDaPagina()}`
  })

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== iframeRef.current?.contentWindow) return
      const d = e.data as { canal?: string; tipo?: string }
      if (d?.canal === CANAL && d.tipo === 'pronta') setPronta(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  // ── Relógio da história ────────────────────────────────────────────────────
  const { state, composition, paused, canAnimate, togglePause } = useHeroTimeline<HeroState, HeroCena>({
    cues: HERO_CUES, tailMs: HERO_TAIL_MS, hostRef, staticIndex: HERO_STATIC_CUE, enabled: pronta,
  })

  const enviar = (msg: object) => iframeRef.current?.contentWindow?.postMessage({ canal: CANAL, ...msg }, location.origin)

  useEffect(() => {
    if (pronta) enviar({ tipo: 'passo', estado: state, cena: composition })
  }, [pronta, state, composition])

  useEffect(() => {
    if (pronta) enviar({ tipo: 'tema', tema })
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

  // ── Paralaxe do scroll: a âncora recua, as satélites sobem mais rápido ─────
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
  const ySatelites = useTransform(progresso, [0, 1], [0, -46])

  // ── Troca de módulo: um "corte" curto de câmera sobre a tela ───────────────
  const [cenaRef, animarCena] = useAnimate()
  const cenaAnterior = useRef<HeroCena | null>(null)
  useEffect(() => {
    if (!pronta || semMovimento) { cenaAnterior.current = composition; return }
    if (cenaAnterior.current && cenaAnterior.current !== composition && cenaRef.current) {
      const vazia = composition === 'reinicio'
      void animarCena(cenaRef.current, vazia
        ? { opacity: 0, filter: 'blur(6px)' }
        : { opacity: [0.4, 1], filter: ['blur(5px)', 'blur(0px)'] },
        { duration: vazia ? 0.35 : 0.55, ease: [0.22, 0.8, 0.2, 1] })
    }
    cenaAnterior.current = composition
  }, [composition, pronta, semMovimento, animarCena, cenaRef])

  const vis = visibilidade(state, composition)
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
              <div ref={cenaRef} className="absolute inset-0">
                {montar && (
                  <iframe
                    ref={iframeRef}
                    src={src}
                    title="Oryon em demonstração"
                    tabIndex={-1}
                    aria-hidden
                    loading="lazy"
                    className="absolute left-0 top-0 border-0 transition-opacity duration-500"
                    style={{ width: app.w, height: app.h, opacity: pronta ? 1 : 0, colorScheme: 'normal' }}
                  />
                )}
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

          {/* AS SATÉLITES — só no desktop; no celular o palco é a âncora. */}
          {!celular && (
            <>
              <Satelite pose={POSES.celular} visivel={pronta && vis.celular} atraso={0.25} titulo={TITULOS_SATELITES.celular} y={ySatelites}>
                <ConteudoCelular />
              </Satelite>
              <Satelite pose={POSES.notificacoes} visivel={pronta && vis.notificacoes} atraso={0.1} titulo={TITULOS_SATELITES.notificacoes} y={ySatelites}>
                <ConteudoNotificacoes at={state} />
              </Satelite>
              <Satelite pose={POSES.linhaDoTempo} visivel={pronta && vis.linhaDoTempo} atraso={0.35} titulo={TITULOS_SATELITES.linhaDoTempo} y={ySatelites}>
                <ConteudoLinhaDoTempo at={state} />
              </Satelite>
            </>
          )}
        </div>
      </div>

      {/* Rodapé: a divulgação dos dados fictícios, ao lado da pausa. */}
      <div className="relative mt-3 flex items-center justify-between gap-3 px-1">
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
