import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { Bandeja } from '../stage/hero/HeroSatelites'
import { HeroFoco, medirNoIframe, useFocoDaDemo } from '../stage/hero/HeroFoco'
import { useHeroTimeline, type HeroCue } from '../stage/hero/useHeroTimeline'
import type { HeroCena, HeroState } from '../stage/hero/heroStory'

/**
 * O RECORTE — um "plano de detalhe" da Oryon real, para as seções da página.
 *
 * O Hero mostra o app inteiro (plano geral). Cada bloco da seção Plataforma
 * mostra, AMPLIADA, só a região que importa para aquele recurso — o chat, o
 * quadro do funil, a gaveta do relatório. É o mesmo app em modo demonstração
 * (`/demo.html`), com o mesmo diretor: o bloco dirige a sua própria
 * mini-história e as telas reagem pelos mecanismos de produção.
 *
 * Responsabilidade (25/09): SÓ a moldura e o recorte do app. O componente
 * ocupa a largura que o pai der e calcula a largura MÁXIMA que a moldura
 * aguenta — pelo orçamento de altura (a tela menos o cabeçalho, a frase do
 * recurso e folgas: frase e demonstração precisam caber juntas) e pelo teto de
 * ampliação (um detalhe pequeno não vira um pôster de 1,9×). Esse limite sai
 * por `onLimite`; quem compõe a grade do recurso (título, demonstração e
 * benefícios) é o artigo, em `SecaoPlataforma`.
 *
 * Desempenho: o app só é carregado quando o recorte entra na tela, e é
 * desmontado depois que sai.
 */

const APP = { w: 1280, h: 720 }
/** No celular, o app inteiro com a altura da janela: um recorte por cima
 *  cortaria a mensagem mais nova, que chega embaixo. */
const APP_CELULAR = { w: 390, h: 600 }
const CANAL = 'oryon-hero'
/** Ampliação máxima de uma região (1 = tamanho real do app). */
const AMPLIACAO_MAX = 0.87
/** Cabeçalho fixo + frase do bloco + moldura + folgas, fora do recorte. */
const FORA_DO_RECORTE = 300
const ALTURA = { min: 202, max: 419 }

export interface Recorte { x: number; y: number; w: number; h: number }

function temaDaPagina(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export function DemoRecorte({
  titulo, rota, estado, cues, recorte, className, onLimite, foraDoRecorte = FORA_DO_RECORTE, preencherAltura = false, onPasso,
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
  /** A largura máxima da moldura (px) para este viewport — o pai compõe a grade com ela. */
  onLimite?: (px: number) => void
  /** Altura da tela reservada ao que fica fora do recorte (cabeçalho, frase do
   *  recurso, folgas). Menor quando o conteúdo já está empilhado e rola. */
  foraDoRecorte?: number
  /** A moldura ocupa a ALTURA do contêiner (ao lado de evidências mais altas):
   *  o recorte revela mais do app real para baixo — nunca estica a imagem,
   *  nunca fica menor que a proporção natural nem passa do fim da tela do app. */
  preencherAltura?: boolean
  /** Cada passo da mini-história (estado, cena, índice do cue — 0 = recomeçou). */
  onPasso?: (estado: HeroState, cena: HeroCena, indice: number) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const telaRef = useRef<HTMLDivElement>(null)
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
      const d = e.data as { canal?: string; tipo?: string }
      if (d?.canal === CANAL && d.tipo === 'pronta') setPronta(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])
  const foco = useFocoDaDemo(iframeRef)

  // ── A mini-história do bloco ───────────────────────────────────────────────
  const { state, composition, index } = useHeroTimeline<HeroState, HeroCena>({
    cues, tailMs: 900, hostRef, staticIndex: cues.length - 1, enabled: pronta,
  })
  useEffect(() => {
    if (pronta) iframeRef.current?.contentWindow?.postMessage({ canal: CANAL, tipo: 'passo', estado: state, cena: composition }, location.origin)
  }, [pronta, state, composition])
  // O passo também sai para o artigo: os cartões de evidência ao lado reagem
  // à MESMA história que a tela conta (e sabem quando o laço recomeça).
  const avisarPasso = useRef(onPasso)
  avisarPasso.current = onPasso
  useEffect(() => {
    if (pronta) avisarPasso.current?.(state, composition, index)
  }, [pronta, state, composition, index])

  const [tema, setTema] = useState(temaDaPagina)
  useEffect(() => {
    const mo = new MutationObserver(() => setTema(temaDaPagina()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  useEffect(() => {
    if (pronta) iframeRef.current?.contentWindow?.postMessage({ canal: CANAL, tipo: 'tema', tema }, location.origin)
  }, [pronta, tema])

  // ── Geometria: largura disponível, orçamento de altura, teto de ampliação ─
  const regiao = celular ? { x: 0, y: 0, w: APP_CELULAR.w, h: APP_CELULAR.h } : recorte
  const app = celular ? APP_CELULAR : APP
  const avisar = useRef(onLimite)
  avisar.current = onLimite
  useLayoutEffect(() => {
    const medir = () => {
      const orcamento = Math.min(ALTURA.max, Math.max(ALTURA.min, window.innerHeight - foraDoRecorte))
      // A borda da bandeja (12 px) e a barra de título (30 px) ficam fora da região.
      const porAltura = (orcamento - 36) * (regiao.w / regiao.h) + 12
      const porAmpliacao = regiao.w * (celular ? 1 : AMPLIACAO_MAX) + 12
      avisar.current?.(Math.floor(Math.min(porAltura, porAmpliacao)))
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [regiao.w, regiao.h, celular, foraDoRecorte])
  const [tela, setTela] = useState(0)
  const [telaAltura, setTelaAltura] = useState(0)
  useLayoutEffect(() => {
    const el = telaRef.current
    if (!el) return
    const medir = () => { setTela(el.clientWidth); setTelaAltura(el.clientHeight) }
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  const escala = tela > 0 ? tela / regiao.w : 0.7

  const [src] = useState(() => `/demo.html?rota=${encodeURIComponent(rota)}&estado=${estado}&tema=${temaDaPagina()}`)

  return (
    <div className={cn('w-full', preencherAltura && 'h-full', className)}>
        <div ref={hostRef} className={cn('relative', preencherAltura && 'h-full')} aria-hidden>
          <Bandeja titulo={titulo} className={cn('w-full', preencherAltura && 'h-full')}>
            <div
              ref={telaRef}
              inert
              className="relative w-full overflow-hidden pointer-events-none select-none"
              style={preencherAltura && tela > 0
                ? {
                    height: '100%',
                    minHeight: Math.round(tela * (regiao.h / regiao.w)),
                    // Até o fim da tela do app: abaixo disso não há mais app.
                    maxHeight: Math.round((app.h - regiao.y) * (tela / regiao.w)),
                  }
                : { aspectRatio: `${regiao.w} / ${regiao.h}` }}
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
              {/* O contorno do alvo, recortado pela janela (sem conector: aqui a
                  frase do bloco já está colada ao recorte). */}
              {!semMovimento && pronta && (
                <HeroFoco
                  tomada={foco}
                  medir={(base) => foco && medirNoIframe(foco, iframeRef.current, null, telaRef.current, base)}
                  raizRef={telaRef}
                />
              )}
            </div>
          </Bandeja>
        </div>
    </div>
  )
}
