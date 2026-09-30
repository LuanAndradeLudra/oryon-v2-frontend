import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { pedirMontagem, tornarVisivel, cancelarMontagem, liberar } from './filaDeMontagem'
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
/** Evita remontar uma demonstração quando a pessoa apenas compara dois itens
 *  do índice em sequência. A página continua liberando iframes distantes. */
const DESMONTAR_APOS_MS = 10_000

export interface Recorte { x: number; y: number; w: number; h: number }

function temaDaPagina(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

type TipoPoster = 'agente' | 'campanha' | 'conversa' | 'funil' | 'painel'

function tipoPoster(rota: string): TipoPoster {
  if (rota.startsWith('/agents')) return 'agente'
  if (rota.startsWith('/campaigns')) return 'campanha'
  if (rota.startsWith('/pipelines')) return 'funil'
  if (rota.startsWith('/dashboard')) return 'painel'
  return 'conversa'
}

/**
 * Um primeiro quadro leve para a janela nunca ficar vazia enquanto o app real
 * aguarda a fila de montagem. Ele preserva a silhueta da tela que vai entrar,
 * mas não duplica conteúdo nem lógica da simulação.
 */
function PosterDaDemo({ rota }: { rota: string }) {
  const tipo = tipoPoster(rota)
  const linha = 'rounded-sm bg-surface-700/75'
  const cartao = 'rounded-md border border-surface-700/80 bg-surface-900/75'

  return (
    <div
      data-demo-poster={tipo}
      className="absolute inset-0 overflow-hidden bg-surface-950 p-[3%]"
    >
      <div className="mb-[2.5%] flex h-[5%] items-center gap-[1.3%]">
        <span className="h-full aspect-square rounded-full bg-brand-500/70" />
        <span className={cn(linha, 'h-[45%] w-[18%]')} />
        <span className={cn(linha, 'ml-auto h-[45%] w-[11%] opacity-55')} />
      </div>

      {tipo === 'conversa' && (
        <div className="grid h-[89%] grid-cols-[minmax(0,1.7fr)_minmax(0,.85fr)] gap-[2%]">
          <div className={cn(cartao, 'flex flex-col justify-end gap-[3%] p-[4%]')}>
            <span className={cn(linha, 'h-[10%] w-[45%]')} />
            <span className="ml-auto h-[14%] w-[58%] rounded-md bg-brand-700/55" />
            <span className={cn(linha, 'h-[12%] w-[52%]')} />
            <span className="ml-auto h-[18%] w-[68%] rounded-md bg-brand-700/65" />
            <span className={cn(cartao, 'mt-[2%] h-[15%] w-full')} />
          </div>
          <div className={cn(cartao, 'space-y-[5%] p-[7%]')}>
            <span className={cn(linha, 'block h-[5%] w-[48%]')} />
            <span className={cn(linha, 'block h-[9%] w-[78%]')} />
            <span className={cn(linha, 'block h-[5%] w-full opacity-60')} />
            <span className={cn(linha, 'block h-[5%] w-[85%] opacity-60')} />
            <span className="block h-px w-full bg-surface-700" />
            <span className={cn(cartao, 'block h-[24%] w-full')} />
          </div>
        </div>
      )}

      {tipo === 'funil' && (
        <div className="grid h-[88%] grid-cols-3 gap-[2%]">
          {[0, 1, 2].map((coluna) => (
            <div key={coluna} className="min-w-0">
              <div className="mb-[5%] flex h-[8%] items-center gap-[4%] border-b border-surface-700">
                <span className={cn(linha, 'h-[35%] w-[44%]')} />
                <span className={cn(linha, 'ml-auto h-[35%] w-[18%] opacity-55')} />
              </div>
              <div className={cn(cartao, 'h-[30%] p-[6%]')}>
                <span className={cn(linha, 'block h-[12%] w-[72%]')} />
                <span className={cn(linha, 'mt-[6%] block h-[10%] w-[48%] opacity-60')} />
                <span className="mt-[12%] block h-[12%] w-[35%] rounded-sm bg-brand-600/55" />
              </div>
              {coluna < 2 && <div className={cn(cartao, 'mt-[5%] h-[25%] opacity-70')} />}
            </div>
          ))}
        </div>
      )}

      {tipo === 'campanha' && (
        <div className={cn(cartao, 'h-[89%] p-[3.5%]')}>
          <div className="grid h-[16%] grid-cols-4 divide-x divide-surface-700 overflow-hidden rounded-md border border-surface-700">
            {[52, 12, 3, 29].map((n) => <span key={n} className="grid place-items-center text-[clamp(8px,1.2vw,15px)] font-semibold text-brand-400/80">{n}%</span>)}
          </div>
          <div className="mt-[4%] space-y-[2.5%]">
            {[92, 78, 61, 37].map((w, i) => (
              <div key={w} className="flex h-[6%] items-center gap-[3%]">
                <span className={cn(linha, 'h-[35%] w-[17%] opacity-60')} />
                <span className="h-full rounded-sm bg-brand-600/35" style={{ width: `${w - i * 4}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-[5%] flex h-[42%] items-end gap-[2%] border-b border-l border-surface-700 px-[3%]">
            {[30, 46, 38, 68, 57, 79, 72, 88].map((h, i) => <span key={i} className="flex-1 rounded-t-sm bg-brand-600/45" style={{ height: `${h}%` }} />)}
          </div>
        </div>
      )}

      {tipo === 'agente' && (
        <div className={cn(cartao, 'h-[89%] p-[4%]')}>
          <div className="flex h-[9%] gap-[2%] border-b border-surface-700">
            {[24, 30, 22].map((w, i) => <span key={w} className={cn(linha, i === 1 && 'bg-brand-600/55')} style={{ width: `${w}%`, height: '42%' }} />)}
          </div>
          <div className="mt-[4%] grid h-[80%] grid-cols-[minmax(0,1.45fr)_minmax(0,.55fr)] gap-[3%]">
            <div className="space-y-[3%]">
              <span className={cn(linha, 'block h-[4%] w-[28%]')} />
              <div className={cn(cartao, 'h-[35%] p-[4%]')}>
                {[88, 72, 91, 48].map((w) => <span key={w} className={cn(linha, 'mb-[3%] block h-[8%] opacity-60')} style={{ width: `${w}%` }} />)}
              </div>
              <span className={cn(linha, 'block h-[4%] w-[35%]')} />
              <div className={cn(cartao, 'h-[28%]')} />
            </div>
            <div className={cn(cartao, 'h-full p-[8%]')}>
              <span className="mx-auto block aspect-square w-[28%] rounded-full bg-brand-600/45" />
              {[68, 88, 76].map((w) => <span key={w} className={cn(linha, 'mx-auto mt-[9%] block h-[3%] opacity-60')} style={{ width: `${w}%` }} />)}
            </div>
          </div>
        </div>
      )}

      {tipo === 'painel' && (
        <div className="h-[89%]">
          <div className="grid h-[27%] grid-cols-4 gap-[2%]">
            {[0, 1, 2, 3].map((i) => <div key={i} className={cn(cartao, 'p-[9%]')}><span className={cn(linha, 'block h-[12%] w-[55%] opacity-60')} /><span className="mt-[12%] block h-[22%] w-[32%] rounded-sm bg-brand-600/55" /></div>)}
          </div>
          <div className="mt-[2%] grid h-[69%] grid-cols-[minmax(0,1.55fr)_minmax(0,.65fr)] gap-[2%]">
            <div className={cn(cartao, 'flex items-end gap-[2%] px-[4%] pb-[5%]')}>
              {[46, 70, 55, 86, 68, 92, 76].map((h, i) => <span key={i} className="flex-1 rounded-t-sm bg-brand-600/45" style={{ height: `${h}%` }} />)}
            </div>
            <div className={cn(cartao, 'space-y-[8%] p-[8%]')}>{[84, 64, 76, 55].map((w) => <span key={w} className={cn(linha, 'block h-[5%] opacity-60')} style={{ width: `${w}%` }} />)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DemoRecorte({
  titulo, rota, estado, cues, recorte, className, onLimite, foraDoRecorte = FORA_DO_RECORTE, onPasso,
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
  /** Cada passo da mini-história (estado, cena, índice do cue — 0 = recomeçou). */
  onPasso?: (estado: HeroState, cena: HeroCena, indice: number) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const telaRef = useRef<HTMLDivElement>(null)
  const semMovimento = useReducedMotion()
  const celular = !useMediaQuery('(min-width: 768px)')

  // ── Montar perto da tela, UM POR VEZ (filaDeMontagem); desmontar depois que sai ─
  const [montar, setMontar] = useState(() => typeof IntersectionObserver === 'undefined')
  const [pronta, setPronta] = useState(false)
  const pedidoRef = useRef<number | null>(null)
  useEffect(() => {
    const el = hostRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let sair: ReturnType<typeof setTimeout> | undefined
    let montado = false
    // A raiz tem de ser o contêiner que rola a landing: com a viewport como
    // raiz, o recorte já chega recortado por ele e a margem não vale nada.
    const root = el.closest('[data-landing-root]')
    // Pré-carga com uma tela de antecedência (com 200 px, cada capítulo
    // aparecia com spinner por 0,6–1,2 s — medido no build de produção).
    const perto = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        clearTimeout(sair)
        if (montado || pedidoRef.current !== null) return
        pedidoRef.current = pedirMontagem(false, () => { montado = true; setMontar(true) })
      } else {
        if (!montado && pedidoRef.current !== null) { cancelarMontagem(pedidoRef.current); pedidoRef.current = null; return }
        sair = setTimeout(() => {
          if (pedidoRef.current !== null) cancelarMontagem(pedidoRef.current)
          pedidoRef.current = null
          montado = false
          setPronta(false)
          setMontar(false)
        }, DESMONTAR_APOS_MS)
      }
    }, { root, rootMargin: '100% 0px' })
    // Já na tela e ainda esperando a vez: passa na frente.
    const naTela = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !montado && pedidoRef.current !== null) tornarVisivel(pedidoRef.current)
    }, { root })
    perto.observe(el)
    naTela.observe(el)
    return () => {
      perto.disconnect(); naTela.disconnect(); clearTimeout(sair)
      if (pedidoRef.current !== null) cancelarMontagem(pedidoRef.current)
      pedidoRef.current = null
    }
  }, [])

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || !iframeRef.current || e.source !== iframeRef.current.contentWindow) return
      const d = e.data as { canal?: string; tipo?: string }
      if (d?.canal === CANAL && d.tipo === 'pronta') {
        setPronta(true)
        // A montagem terminou: libera a vez para o próximo recorte.
        if (pedidoRef.current !== null) liberar(pedidoRef.current)
      }
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
  useLayoutEffect(() => { avisarPasso.current = onPasso }, [onPasso])
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
  useLayoutEffect(() => { avisar.current = onLimite }, [onLimite])
  useLayoutEffect(() => {
    const medir = () => {
      // O teto de altura é do desktop; no celular (tela alta e estreita) manda
      // a altura da tela — com o teto, a moldura encolhia para 260 px de largura.
      const orcamento = celular
        ? Math.max(ALTURA.min, window.innerHeight - foraDoRecorte)
        // Teto que acompanha a altura da tela: 419 px até ~900 de altura (o
        // tamanho pedido pelo PO em 26/09), mais em telas altas — em 1920 × 1080
        // a moldura fixa em 419 ficava pequena ao lado de evidências largas.
        : Math.min(Math.min(560, Math.max(ALTURA.max, window.innerHeight * 0.47 - 4)), Math.max(ALTURA.min, window.innerHeight - foraDoRecorte))
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
  useLayoutEffect(() => {
    const el = telaRef.current
    if (!el) return
    const medir = () => { setTela(el.clientWidth) }
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  const escala = tela > 0 ? tela / regiao.w : 0.7

  const [src] = useState(() => `/demo.html?rota=${encodeURIComponent(rota)}&estado=${estado}&tema=${temaDaPagina()}`)

  return (
    <div className={cn('w-full', className)}>
        <div ref={hostRef} className="relative" aria-hidden>
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
                  title={`Oryon em demonstração: ${titulo}`}
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
              <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: pronta ? 0 : 1, visibility: pronta ? 'hidden' : 'visible' }}
              >
                <PosterDaDemo rota={rota} />
              </div>
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
