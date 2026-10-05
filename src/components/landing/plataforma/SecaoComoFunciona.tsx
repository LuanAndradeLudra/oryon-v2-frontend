import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { home, paginasPlataforma, plataforma, rotaPlataforma } from '../landingCopy'
import { BotaoPausa } from '../ui/BotaoPausa'
import { Revelar } from './SecoesVenda'
import { DemoRecorte, type Recorte } from './DemoRecorte'
import { APP_INTEIRO, HISTORIAS } from './historias'
import type { HeroCena, HeroState } from '../stage/hero/heroStory'

/**
 * COMO FUNCIONA (home de venda) — opção A, decidida com o PO em 30/09: as
 * etapas numa lista à esquerda e UMA janela do app, fixa, à direita.
 *
 * 02/10 (PO): a seção virou "o que mais a Oryon faz" — só as três etapas que
 * o palco do Hero NÃO mostra (ensinar a IA, campanhas, painel). Atender, funil
 * e equipe já passam no Hero; repeti-los duas seções abaixo era a mesma
 * história duas vezes. Os seis capítulos continuam nas páginas de produto.
 *
 * O que a estrutura anterior (abas em cima, tela + dois cartões embaixo) fazia
 * de errado, medido em 1440 × 900: o texto da etapa tinha uma ou duas linhas e
 * empurrava a tela 26 px; a moldura ia de 412 a 763 px de largura conforme o
 * recorte de cada etapa; o vão até os cartões ia de 20 a 371 px; e a troca
 * eram quatro movimentos soltos (cartões, texto, tela preta, tela nova).
 *
 * Aqui nada depende do conteúdo da etapa:
 *  • a janela mostra o APP INTEIRO (1280 × 720) em todas as etapas — mesma
 *    proporção, mesmo tamanho; trocar de etapa é o app navegando entre os
 *    módulos (o menu lateral e a barra do topo ficam, o conteúdo se dissolve
 *    sob um véu curto — ver DemoRecorte);
 *  • o tamanho da janela vem só da tela do navegador: a seção inteira (título,
 *    lista, janela e legenda) cabe numa tela de desktop, sem rolar;
 *  • a lista tem altura fixa (nome + promessa, uma linha cada) e as legendas
 *    das etapas ocupam a mesma célula da grade (vale a mais alta).
 *
 * As etapas avançam sozinhas quando a mini-história da etapa termina (a barra
 * da etapa ativa mostra o andamento); pausar para tudo. No celular e no tablet
 * a lista vira uma faixa rolável acima da janela.
 */

// ── Celular (02/10, PO) ─────────────────────────────────────────────────────
// O app no layout de COMPUTADOR, desenhado numa tela de 1024 × 768: a moldura
// fica 4:3 (um terço mais alta que a 16:9) e o texto 25% maior, sem corte — o
// app se reorganiza como num notebook menor. Sem zoom em destaques. O que abre
// por cima (o assistente "Nova campanha", a bancada de teste, a gaveta do
// relatório) o próprio app avisa onde está, e a moldura o segue (DemoRecorte).
const APP_NO_CELULAR = { w: 1024, h: 768 }
const APP_INTEIRO_NO_CELULAR: Recorte = { x: 0, y: 0, ...APP_NO_CELULAR }

/** Altura do menu fixo da landing. */
const MENU_FIXO = 64
/** Largura mínima da coluna da lista (a promessa de cada etapa cabe em uma linha). */
const ESQUERDA_MIN = 400
const VAO_COLUNAS = 48
/** Folga entre a janela e a legenda (mt-3.5). */
const VAO_LEGENDA = 14
/** Abaixo disso a janela fica pequena demais para ler; a seção passa a rolar. */
const MOLDURA_MIN = 300

/** As etapas da home: as que o Hero não mostra. */
const ETAPAS_DA_HOME = ['conhecer', 'campanhas', 'medir'] as const
const BLOCOS = plataforma.blocos.filter((b) => (ETAPAS_DA_HOME as readonly string[]).includes(b.id))
const N = BLOCOS.length
const paginaDo = (id: string) => paginasPlataforma.find((p) => (p.blocos as readonly string[]).includes(id))

/** A aba do navegador está à vista (fora dela, a barra de andamento para). */
function useAbaVisivel() {
  const [visivel, setVisivel] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  useEffect(() => {
    const aoMudar = () => setVisivel(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', aoMudar)
    return () => document.removeEventListener('visibilitychange', aoMudar)
  }, [])
  return visivel
}

export function SecaoComoFunciona() {
  const semMovimento = useReducedMotion()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const secaoRef = useRef<HTMLElement>(null)
  const gradeRef = useRef<HTMLDivElement>(null)
  const legendaRef = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const naTela = useInView(secaoRef, { amount: 0.3 })
  const abaVisivel = useAbaVisivel()

  const [ativo, setAtivo] = useState(0)
  const [pausado, setPausado] = useState(false)
  const b = BLOCOS[ativo]
  const h = HISTORIAS[b.id]
  // O cursor navega pelo app (02/10, PO): o roteiro conduzido, quando há.
  const cues = h.cuesConduzidas ?? h.cues
  const duracao = cues[cues.length - 1].t + 900

  // ── Geometria: tudo sai da tela do navegador, nada do conteúdo da etapa ──
  const [geo, setGeo] = useState<{ alturaMax: number; larguraMax: number } | null>(null)
  const [limite, setLimite] = useState(0)
  useLayoutEffect(() => {
    const secao = secaoRef.current
    const grade = gradeRef.current
    const legenda = legendaRef.current
    if (!secao || !grade || !legenda) return
    const medir = () => {
      if (window.innerWidth < 1024) { setGeo((g) => (g === null ? g : null)); return }
      const estilo = getComputedStyle(secao)
      const disponivel = window.innerHeight - MENU_FIXO - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom)
      const alturaMax = Math.max(MOLDURA_MIN, Math.floor(disponivel - legenda.offsetHeight - VAO_LEGENDA))
      const larguraMax = Math.floor(grade.clientWidth - ESQUERDA_MIN - VAO_COLUNAS)
      setGeo((g) => (g && Math.abs(g.alturaMax - alturaMax) < 2 && Math.abs(g.larguraMax - larguraMax) < 2 ? g : { alturaMax, larguraMax }))
    }
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(grade)
    ro?.observe(legenda)
    window.addEventListener('resize', medir)
    return () => { ro?.disconnect(); window.removeEventListener('resize', medir) }
  }, [])
  // A janela: a maior que cabe na altura (DemoRecorte calcula) e na largura.
  const palco = geo ? Math.min(limite || geo.larguraMax, geo.larguraMax) : 0

  // ── Avanço automático: a etapa seguinte entra quando a história termina ──
  const autoplay = !pausado && !semMovimento
  const ativoRef = useRef(ativo)
  const autoplayRef = useRef(autoplay)
  useLayoutEffect(() => { ativoRef.current = ativo; autoplayRef.current = autoplay }, [ativo, autoplay])
  const aoTerminar = useCallback(() => {
    if (!autoplayRef.current) return false
    setAtivo((i) => (i + 1) % N)
    return true
  }, [])
  // A barra de andamento começa quando a história da etapa começa de fato
  // (o app pronto e na tela), não no clique.
  const [inicio, setInicio] = useState({ etapa: -1, n: 0 })
  // No celular, o app de 1024 × 768; o enquadramento vem do próprio app.
  const celular = !useMediaQuery('(min-width: 768px)')
  const aoPassar = useCallback((_estado: HeroState, _cena: HeroCena, indice: number) => {
    if (indice === 0) setInicio((v) => ({ etapa: ativoRef.current, n: v.n + 1 }))
  }, [])
  const andando = autoplay && naTela && abaVisivel

  const escolher = (i: number) => setAtivo(i)
  const teclas = (e: KeyboardEvent<HTMLElement>) => {
    const passo: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }
    let proximo = -1
    if (e.key in passo) proximo = (ativo + passo[e.key] + N) % N
    else if (e.key === 'Home') proximo = 0
    else if (e.key === 'End') proximo = N - 1
    if (proximo < 0) return
    e.preventDefault()
    escolher(proximo)
    requestAnimationFrame(() => document.getElementById(`etapa-aba-${BLOCOS[proximo].id}`)?.focus())
  }

  // No celular a lista é uma faixa rolável: a etapa ativa entra na faixa
  // (só na horizontal — a página não se mexe).
  useEffect(() => {
    if (desktop) return
    const lista = listaRef.current
    const aba = lista?.querySelector<HTMLElement>(`#etapa-aba-${BLOCOS[ativo].id}`)
    if (!lista || !aba) return
    const alvo = aba.offsetLeft - (lista.clientWidth - aba.offsetWidth) / 2
    lista.scrollTo({ left: Math.max(0, alvo), behavior: semMovimento ? 'auto' : 'smooth' })
  }, [ativo, desktop, semMovimento])

  return (
    <section
      ref={secaoRef}
      id="como-funciona"
      data-section="como-funciona"
      aria-labelledby="como-funciona-titulo"
      // No desktop a seção é UMA tela (a altura útil abaixo do menu fixo), com
      // o conteúdo centrado nela.
      className="relative scroll-mt-16 border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20 lg:flex lg:min-h-[calc(100dvh-64px)] lg:items-center lg:py-[clamp(20px,4.2vh,52px)]"
    >
      <div className="landing-container w-full">
        <div
          ref={gradeRef}
          className="lg:grid lg:items-stretch"
          style={geo ? { gridTemplateColumns: `minmax(0, 1fr) ${palco}px`, columnGap: VAO_COLUNAS } : undefined}
        >
          {/* ── Esquerda: o título em cima, as etapas embaixo ─────────────── */}
          <div className="flex min-w-0 flex-col gap-8 lg:justify-center lg:gap-10">
            <Revelar>
              <h2 id="como-funciona-titulo" className="font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.6rem,min(2.7vw,5.2vh),2.5rem)] text-balance text-surface-50">
                {home.comoFunciona.titulo}
              </h2>
              <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-surface-400 lg:text-[17px]">{home.comoFunciona.cinza}</p>
            </Revelar>

            <div
              ref={listaRef}
              role="tablist"
              aria-label={home.comoFunciona.abasLabel}
              aria-orientation={desktop ? 'vertical' : 'horizontal'}
              className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0"
            >
              {BLOCOS.map((bl, i) => {
                const sel = i === ativo
                return (
                  <button
                    key={bl.id}
                    id={`etapa-aba-${bl.id}`}
                    type="button"
                    role="tab"
                    aria-selected={sel}
                    aria-controls="etapa-painel"
                    tabIndex={sel ? 0 : -1}
                    onClick={() => escolher(i)}
                    onKeyDown={teclas}
                    className={cn(
                      'group relative flex flex-none items-baseline gap-2.5 rounded-xl px-3.5 py-2.5 text-left outline-none transition-colors duration-200',
                      'focus-visible:ring-2 focus-visible:ring-brand-500',
                      'lg:w-full lg:items-start lg:gap-3 lg:px-4 lg:py-[clamp(6px,1.15vh,11px)]',
                      !sel && 'hover:bg-white/[.03]',
                    )}
                  >
                    {/* O destaque da etapa ativa desliza de uma etapa à outra. */}
                    {sel && (
                      <motion.span
                        layoutId="como-funciona-etapa-ativa"
                        aria-hidden
                        className="absolute inset-0 rounded-xl bg-white/[.05] ring-1 ring-inset ring-white/[.08]"
                        transition={semMovimento ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }}
                      />
                    )}
                    <span className={cn('relative font-mono text-[11px] tabular-nums transition-colors duration-300 lg:pt-[3px]', sel ? 'text-[var(--landing-destaque)]' : 'text-surface-500')}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="relative min-w-0">
                      <span className={cn('block whitespace-nowrap text-[14px] font-medium transition-colors duration-300 lg:text-[15px]', sel ? 'text-surface-50' : 'text-surface-300 group-hover:text-surface-100')}>
                        {bl.indice}
                      </span>
                      <span className={cn('hidden truncate text-[13px] leading-snug transition-colors duration-300 lg:block', sel ? 'text-surface-300' : 'text-surface-500')}>
                        {bl.destaque}
                      </span>
                    </span>
                    {/* O andamento da etapa: enche até a próxima entrar. */}
                    {sel && autoplay && (
                      <span aria-hidden className="absolute inset-x-3.5 bottom-[3px] h-[2px] overflow-hidden rounded-full bg-white/[.07] lg:inset-x-4 lg:bottom-[4px]">
                        <span
                          key={`${ativo}-${inicio.n}`}
                          className="block h-full origin-left bg-[var(--landing-destaque)]"
                          style={inicio.etapa === ativo
                            ? { animation: `landing-etapa-progresso ${duracao}ms linear forwards`, animationPlayState: andando ? 'running' : 'paused' }
                            : { transform: 'scaleX(0)' }}
                        />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Direita: a janela do app e a legenda da etapa ──────────────── */}
          <div className="mt-6 min-w-0 lg:mt-0">
            <div id="etapa-painel" role="tabpanel" aria-labelledby={`etapa-aba-${b.id}`}>
              <div className="relative">
                <DemoRecorte
                  titulo="Oryon"
                  rota={h.rota}
                  estado={h.estado}
                  cues={cues}
                  recorte={celular ? APP_INTEIRO_NO_CELULAR : APP_INTEIRO}
                  tamanhoDoApp={celular ? APP_NO_CELULAR : undefined}
                  layoutDesktop
                  conduzida
                  camera={celular}
                  alturaMax={geo?.alturaMax}
                  ampliacaoMax={1}
                  onLimite={setLimite}
                  onPasso={aoPassar}
                  aoTerminar={aoTerminar}
                  pausado={pausado}
                  manterMontado
                />
                {/* Pausar fica NA janela, sobre a barra de título dela. */}
                {!semMovimento && (
                  <BotaoPausa pausado={pausado} onAlternar={() => setPausado((p) => !p)} className="absolute right-1.5 top-[2px] z-10 h-[26px] w-[26px]" />
                )}
              </div>
              {/* As legendas das etapas na mesma célula: a altura é a da
                  maior, e a troca é um cruzamento — nada abaixo se mexe. */}
              <div ref={legendaRef} className="mt-3.5 grid">
                {BLOCOS.map((bl, i) => {
                  const sel = i === ativo
                  const pagina = paginaDo(bl.id)
                  return (
                    <p
                      key={bl.id}
                      aria-hidden={!sel}
                      className={cn(
                        '[grid-area:1/1] max-w-[78ch] text-[14.5px] leading-relaxed text-surface-400 transition-[opacity,visibility] motion-reduce:transition-none lg:text-[15px]',
                        sel ? 'visible opacity-100 delay-200 duration-300' : 'invisible opacity-0 duration-150',
                      )}
                    >
                      {/* No celular a lista só tem os nomes: a promessa vem aqui. */}
                      <span className="mb-1 block font-semibold text-surface-100 lg:hidden">{bl.destaque}</span>
                      {bl.texto}
                      {pagina && (
                        <>
                          {' '}
                          <Link
                            to={rotaPlataforma(pagina.slug)}
                            tabIndex={sel ? undefined : -1}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm font-medium text-[var(--landing-destaque)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            {home.comoFunciona.saibaMais}: {pagina.menu} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        </>
                      )}
                    </p>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
