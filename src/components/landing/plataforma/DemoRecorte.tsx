import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { Bandeja } from '../stage/hero/HeroSatelites'
import { HeroAnotacao, type FocoAnotado } from '../stage/hero/HeroAnotacao'
import { useHeroTimeline, type HeroCue } from '../stage/hero/useHeroTimeline'
import type { HeroCena, HeroState } from '../stage/hero/heroStory'

/**
 * O RECORTE — um "plano de detalhe" do Oryon real, para as seções da página.
 *
 * O Hero mostra o app inteiro (plano geral). Cada bloco da seção Plataforma
 * mostra, AMPLIADA, só a região que importa para aquele recurso — o chat, o
 * quadro do funil, a gaveta do relatório —, legível e sem ruído. É o mesmo app
 * em modo demonstração (`/demo.html`), com o mesmo diretor: o bloco dirige a
 * sua própria mini-história e as telas reagem pelos mecanismos de produção.
 *
 * Desempenho: o app só é carregado quando o recorte entra na tela, e é
 * desmontado depois que sai — nunca há mais de um ou dois rodando ao mesmo
 * tempo, por mais longa que a página seja.
 *
 * No celular o recorte não faz sentido (a tela do app a 1280 px não cabe):
 * ali roda o app mobile (390 px) inteiro, com as rotas de celular do diretor.
 */

const APP = { w: 1280, h: 720 }
const APP_CELULAR = { w: 390, h: 760 }
const CANAL = 'oryon-hero'

export interface Recorte { x: number; y: number; w: number; h: number }

function temaDaPagina(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export function DemoRecorte({
  titulo, rota, estado, cues, recorte, className,
}: {
  titulo: string
  /** Rota em que o app nasce. */
  rota: string
  /** Estado da história em que o app nasce. */
  estado: HeroState
  /** A mini-história do bloco (repete em laço). */
  cues: readonly HeroCue<HeroState, HeroCena>[]
  /** A região do app (1280 × 720) que o bloco mostra. */
  recorte: Recorte
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const semMovimento = useReducedMotion()
  const celular = !useMediaQuery('(min-width: 768px)')

  // ── Montar só com o recorte na tela; desmontar depois que sai ─────────────
  const [montar, setMontar] = useState(false)
  useEffect(() => {
    const el = hostRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setMontar(true); return }
    let entrar: ReturnType<typeof setTimeout> | undefined
    let sair: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        clearTimeout(sair)
        entrar = setTimeout(() => setMontar(true), 200)
      } else {
        clearTimeout(entrar)
        sair = setTimeout(() => setMontar(false), 2500)
      }
    }, { rootMargin: '200px 0px' })
    io.observe(el)
    return () => { io.disconnect(); clearTimeout(entrar); clearTimeout(sair) }
  }, [])

  const [pronta, setPronta] = useState(false)
  useEffect(() => { if (!montar) setPronta(false) }, [montar])
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || !iframeRef.current || e.source !== iframeRef.current.contentWindow) return
      const d = e.data as { canal?: string; tipo?: string; id?: number; rect?: FocoAnotado['rect']; raio?: number }
      if (d?.canal !== CANAL) return
      if (d.tipo === 'pronta') setPronta(true)
      if (d.tipo === 'foco' && d.rect) {
        setFoco({ id: d.id ?? Date.now(), rect: d.rect, raio: d.raio ?? 8 })
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const [foco, setFoco] = useState<FocoAnotado | null>(null)
  useEffect(() => {
    if (!foco) return
    const id = setTimeout(() => setFoco(null), 3100)
    return () => clearTimeout(id)
  }, [foco])

  // ── A mini-história do bloco ───────────────────────────────────────────────
  const { state, composition } = useHeroTimeline<HeroState, HeroCena>({
    cues, tailMs: 900, hostRef, staticIndex: cues.length - 1, enabled: pronta,
  })
  useEffect(() => {
    if (pronta) iframeRef.current?.contentWindow?.postMessage({ canal: CANAL, tipo: 'passo', estado: state, cena: composition }, location.origin)
  }, [pronta, state, composition])

  const [tema, setTema] = useState(temaDaPagina)
  useEffect(() => {
    const mo = new MutationObserver(() => setTema(temaDaPagina()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  useEffect(() => {
    if (pronta) iframeRef.current?.contentWindow?.postMessage({ canal: CANAL, tipo: 'tema', tema }, location.origin)
  }, [pronta, tema])

  // ── Geometria: a região do app ocupa a largura da moldura ─────────────────
  const regiao = celular ? { x: 0, y: 0, w: APP_CELULAR.w, h: APP_CELULAR.h * 0.78 } : recorte
  const app = celular ? APP_CELULAR : APP
  const [largura, setLargura] = useState(0)
  const telaRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = telaRef.current
    if (!el) return
    const medir = () => setLargura(el.clientWidth)
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const escala = largura > 0 ? largura / regiao.w : 0.7

  const [src] = useState(() => `/demo.html?rota=${encodeURIComponent(rota)}&estado=${estado}&tema=${temaDaPagina()}`)

  return (
    <div ref={hostRef} className={cn('relative', className)} aria-hidden>
      <Bandeja titulo={titulo} className="w-full">
        <div
          ref={telaRef}
          inert
          className="relative w-full overflow-hidden pointer-events-none select-none"
          style={{ aspectRatio: `${regiao.w} / ${regiao.h}` }}
        >
          {montar && (
            <iframe
              ref={iframeRef}
              src={src}
              title={`Oryon em demonstração — ${titulo}`}
              tabIndex={-1}
              className="absolute left-0 top-0 border-0 origin-top-left transition-opacity duration-500"
              style={{
                width: app.w, height: app.h,
                transform: `translate(${-regiao.x * escala}px, ${-regiao.y * escala}px) scale(${escala})`,
                opacity: pronta ? 1 : 0,
                colorScheme: 'normal',
              }}
            />
          )}
          {!pronta && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-950">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin opacity-60" />
            </div>
          )}
          {/* O anel de foco, nas coordenadas do recorte. */}
          {foco && !semMovimento && pronta && (
            <div
              className="absolute left-0 top-0 origin-top-left pointer-events-none"
              style={{ width: app.w, height: app.h, transform: `translate(${-regiao.x * escala}px, ${-regiao.y * escala}px) scale(${escala})` }}
            >
              <HeroAnotacao key={foco.id} foco={foco} area={app} origem={{ x: 0, y: 0 }} />
            </div>
          )}
        </div>
      </Bandeja>
    </div>
  )
}
