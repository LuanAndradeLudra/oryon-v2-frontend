import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Check, Clock, Info, UserRound, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { home } from '../landingCopy'
import { Capitulo, Revelar } from '../plataforma/SecoesVenda'
import { Aparelho } from '../stage/hero/HeroSatelites'
import { Bolha, TelaWhatsApp } from '../stage/hero/HeroWhatsAppIphone'
import { teclasDasAbas } from '../ui/abasTeclado'
import { BotaoLanding } from '../ui/BotaoLanding'
import { BotaoPausa } from '../ui/BotaoPausa'
import { DURACAO_CONTADOR, RITMO, SETORES, duracaoDoSetor, fimDoLado, type Lado, type PassoDia, type Setor } from './dorConversas'

/**
 * "POR QUE A ORYON" como UM DIA NO WHATSAPP (30/09, PO): dois iPhones — o
 * mesmo aparelho do palco do Hero — com a mesma cliente e as mesmas
 * perguntas. À esquerda, sem a Oryon: a equipe está ocupada, selos contam as
 * horas sem resposta e a cliente vai embora. À direita, com a Oryon: o agente
 * responde na hora e chama a pessoa certa. Ao lado de cada aparelho, um
 * checklist marca o que acontece, no ritmo da conversa (aparelho → checklist
 * → aparelho → checklist).
 *
 * Lado a lado (tablet e desktop): um setor por vez, em carrossel. Um relógio
 * único (pausa com o botão e fora da tela) comanda as duas conversas; quando
 * terminam, os aparelhos deslizam para o lado e entra o próximo setor.
 *
 * Empilhadas (celular, 02/10, PO): só se vê uma conversa por vez, então cada
 * uma tem o seu relógio, que só anda enquanto ela está na faixa central da
 * tela — rolou para fora, pausa; voltou, retoma de onde parou. O setor não
 * troca sozinho: com as duas terminadas, "Próximo" leva ao setor seguinte e
 * de volta ao título, na ordem problema → solução.
 *
 * Sem movimento, cada setor aparece já terminado e a troca é pelas abas (ou
 * pelo "Próximo", no celular).
 */

/** Respiro no fim de cada conversa empilhada, para o resultado assentar antes
 *  do "Próximo" aparecer (tempo de roteiro). */
const RESPIRO_FIM = 1200

/**
 * A conversa "na vista" no celular: a que cruza a faixa central da tela (os 10%
 * do meio). Só uma metade cabe ali por vez — a que a pessoa está olhando,
 * inclusive quando lê o checklist logo abaixo do aparelho.
 *
 * Ref de callback (estável), e não `useInView`: os aparelhos remontam a cada
 * setor (o carrossel desliza o antigo para fora enquanto o novo entra), e o
 * observador precisa seguir o elemento novo. Só o último elemento ligado conta.
 */
function useNaFaixaCentral() {
  const [naFaixa, setNaFaixa] = useState(false)
  const atual = useRef<Element | null>(null)
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    atual.current = el
    let observador: IntersectionObserver
    try {
      observador = new IntersectionObserver((entradas) => {
        for (const e of entradas) if (e.target === atual.current) setNaFaixa(e.isIntersecting)
      }, { rootMargin: '-45% 0px -45% 0px' })
    } catch {
      return // sem IntersectionObserver (ambiente de teste): fica fora da vista
    }
    observador.observe(el)
    return () => {
      observador.disconnect()
      if (atual.current === el) atual.current = null
    }
  }, [])
  return [ref, naFaixa] as const
}

/** Minutos → "10 h 25 min". */
function duracao(min: number) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}

/** A redução da tela de 390 × 760: menor no lg, para a linha de quatro caber. */
function useEscala() {
  const consulta = () => (typeof window === 'undefined' ? 0.6 : window.matchMedia('(min-width: 1280px)').matches ? 0.62 : window.matchMedia('(min-width: 1024px)').matches ? 0.54 : 0.6)
  const [escala, setEscala] = useState(consulta)
  useEffect(() => {
    const atualizar = () => setEscala(consulta())
    window.addEventListener('resize', atualizar)
    return () => window.removeEventListener('resize', atualizar)
  }, [])
  return escala
}

const suave = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

const TONS = {
  ruim: { background: '#FDE7E7', color: '#B42318' },
  bom: { background: '#D7F5EF', color: '#0F766E' },
  pessoa: { background: '#FEF0C7', color: '#93370D' },
} as const

function Selo({ passo, ms }: { passo: Extract<PassoDia, { tipo: 'selo' }>; ms: number }) {
  const semMovimento = useReducedMotion()
  // O tempo passando: o contador corre os minutos sem resposta.
  const c = passo.contador
  const min = c ? c.de + (c.ate - c.de) * suave(Math.min(1, Math.max(0, (ms - passo.t) / DURACAO_CONTADOR))) : 0
  const Icone = passo.tom === 'ruim' ? (c ? Clock : X) : passo.tom === 'pessoa' ? UserRound : Check
  return (
    <motion.div
      layout="position"
      className="self-center my-1"
      initial={semMovimento ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-[13px] font-semibold tabular-nums shadow-[0_1px_.5px_rgba(11,20,26,.13)]" style={TONS[passo.tom]}>
        <Icone className="h-3.5 w-3.5" aria-hidden />
        {c ? `${duracao(min)} ${passo.texto}` : passo.texto}
      </span>
    </motion.div>
  )
}

function Telefone({ setor, lado, ms }: { setor: Setor; lado: Lado; ms: number }) {
  const semMovimento = useReducedMotion()
  const escala = useEscala()
  const visiveis = lado.passos.filter((p) => p.t <= ms)
  type Msg = Extract<PassoDia, { tipo: 'msg' }>
  const ultima = ([...visiveis].reverse().find((p) => p.tipo === 'msg') ?? lado.passos.find((p) => p.tipo === 'msg')) as Msg
  return (
    // A tela é 390 × 760 reduzida por `escala`: a moldura (7 px de borda) envolve o tamanho final.
    <Aparelho className="flex-none">
      <div className="overflow-hidden" style={{ width: Math.round(390 * escala), height: Math.round(760 * escala) }}>
        <TelaWhatsApp hora={ultima.hora.replace(/^0/, '')} escala={escala} empresa={setor.empresa} iniciais={setor.iniciais} corAvatar={setor.corAvatar}>
          <AnimatePresence initial={false}>
            {visiveis.map((p, i) =>
              p.tipo === 'msg' ? <Bolha key={i} texto={p.texto} hora={p.hora} minha={p.minha} />
              : p.tipo === 'selo' ? <Selo key={i} passo={p} ms={ms} />
              : (
                <motion.div key={i} layout="position" className="self-center my-1" initial={semMovimento ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="inline-block rounded-md bg-white/90 px-2.5 py-1 text-[12px] font-medium shadow-[0_1px_.5px_rgba(11,20,26,.13)]" style={{ color: '#54656F' }}>{p.texto}</span>
                </motion.div>
              ),
            )}
          </AnimatePresence>
        </TelaWhatsApp>
      </div>
    </Aparelho>
  )
}

function Rotulo({ com, className }: { com: boolean; className?: string }) {
  const { dor } = home
  return (
    <span
      className={cn(
        'items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold',
        com ? 'bg-brand-500/[.14] text-[var(--landing-destaque)] ring-1 ring-brand-500/40' : 'bg-[#F87171]/[.10] text-[#FCA5A5] ring-1 ring-[#F87171]/30',
        className,
      )}
    >
      {com ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
      {com ? dor.comOryon : dor.semOryon}
    </span>
  )
}

/** O checklist ao lado do aparelho: cada linha acende quando acontece. */
function Checklist({ lado, com, ms }: { lado: Lado; com: boolean; ms: number }) {
  const semMovimento = useReducedMotion()
  const feito = ms >= lado.resultado.t
  return (
    <div className="w-full max-w-[300px] lg:max-w-none lg:pt-3">
      <Rotulo com={com} className="hidden lg:inline-flex" />
      <ul className="mt-6 space-y-3.5">
        {lado.checklist.map((it) => {
          const marcado = ms >= it.t
          const cor = it.pessoa ? 'bg-[#F5B544]/[.16] text-[#F5B544]' : com ? 'bg-brand-500/20 text-[var(--landing-destaque)]' : 'bg-[#F87171]/[.14] text-[#F87171]'
          const Icone = it.pessoa ? UserRound : com ? Check : X
          return (
            <li key={it.texto} className="flex items-start gap-2.5 text-[14px] leading-snug">
              <span className="relative mt-[1px] flex h-[19px] w-[19px] flex-none items-center justify-center">
                <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/[.12]" />
                <motion.span
                  className={cn('absolute inset-0 flex items-center justify-center rounded-full', cor)}
                  initial={false}
                  animate={marcado ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
                  transition={semMovimento ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 22 }}
                >
                  <Icone className="h-3 w-3" strokeWidth={2.6} aria-hidden />
                </motion.span>
              </span>
              <span className={cn('transition-colors duration-500', marcado ? (com ? 'text-surface-100' : 'text-surface-300') : 'text-surface-600')}>
                {it.texto}
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-6 border-t border-white/[.08] pt-4">
        <p className="font-mono text-[11px] uppercase tracking-[.08em] text-surface-500">{home.dor.resultado}</p>
        <div className="relative mt-1.5 h-[44px]">
          <AnimatePresence initial={false} mode="popLayout">
            {feito ? (
              <motion.p
                key="fim"
                className={cn('text-[16px] font-semibold leading-snug', com ? 'text-[var(--landing-destaque)]' : 'text-[#F87171]')}
                initial={semMovimento ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {lado.resultado.texto}
              </motion.p>
            ) : (
              <motion.p key="andando" className="text-[14px] text-surface-600" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                {home.dor.andamento}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/** A conversa inteira para leitor de tela (os aparelhos são visuais). */
function textoDoLado(setor: Setor, lado: Lado) {
  return lado.passos
    .map((p) => (p.tipo === 'msg' ? `${p.minha ? setor.cliente : setor.empresa}, ${p.hora}: ${p.texto}` : p.tipo === 'selo' ? (p.contador ? `${duracao(p.contador.ate)} ${p.texto}` : p.texto) : p.texto))
    .join('. ')
}

function Metade({ setor, com, ms, raizRef }: { setor: Setor; com: boolean; ms: number; raizRef?: React.Ref<HTMLDivElement> }) {
  const lado = com ? setor.com : setor.sem
  return (
    // No lg+ a metade se desfaz (contents) e os quatro blocos entram numa linha só.
    <div ref={raizRef} className="flex flex-col items-center gap-6 lg:contents">
      <Rotulo com={com} className="inline-flex lg:hidden" />
      <div aria-hidden className="pointer-events-none select-none">
        <Telefone setor={setor} lado={lado} ms={ms} />
      </div>
      <p className="sr-only">{textoDoLado(setor, lado)}</p>
      <Checklist lado={lado} com={com} ms={ms} />
    </div>
  )
}

export function SecaoDor() {
  const { dor } = home
  const semMovimento = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const tituloRef = useRef<HTMLDivElement>(null)
  const naTela = useInView(ref, { amount: 0.35 })
  // Do md para cima as duas conversas ficam lado a lado (vê-se as duas ao
  // mesmo tempo); abaixo, empilhadas (uma por vez).
  const ladoALado = useMediaQuery('(min-width: 768px)')
  const [refSem, semNaVista] = useNaFaixaCentral()
  const [refCom, comNaVista] = useNaFaixaCentral()
  const [indice, setIndice] = useState(0)
  const [direcao, setDirecao] = useState(1)
  // Um relógio por conversa (tempo real); os roteiros correm em tempo de
  // roteiro (RITMO mais devagar). Lado a lado, os dois andam juntos.
  const [msSem, setMsSem] = useState(0)
  const [msCom, setMsCom] = useState(0)
  const [pausado, setPausado] = useState(false)
  const setor = SETORES[indice]
  const proximo = SETORES[(indice + 1) % SETORES.length]
  const total = duracaoDoSetor(setor) * RITMO
  // Lado a lado, as duas correm até o fim do setor (com a pausa no fim);
  // empilhadas, cada uma para no fim da própria conversa.
  const fimSem = ladoALado ? total : (fimDoLado(setor.sem) + RESPIRO_FIM) * RITMO
  const fimCom = ladoALado ? total : (fimDoLado(setor.com) + RESPIRO_FIM) * RITMO
  const ativo = !pausado && !semMovimento
  const correndoSem = ativo && (ladoALado ? naTela : semNaVista) && msSem < fimSem
  const correndoCom = ativo && (ladoALado ? naTela : comNaVista) && msCom < fimCom

  // Trocou de arranjo (girou o tablet, redimensionou): o setor recomeça, para
  // as duas conversas não ficarem dessincronizadas lado a lado.
  const [arranjo, setArranjo] = useState(ladoALado)
  if (arranjo !== ladoALado) {
    setArranjo(ladoALado)
    setMsSem(0)
    setMsCom(0)
  }

  // Os relógios: cada um anda só enquanto a sua conversa está na vista (lado a
  // lado: a seção na tela) e não está pausada; volta de onde parou.
  useEffect(() => {
    if (!correndoSem && !correndoCom) return
    let antes = performance.now()
    const id = window.setInterval(() => {
      const agora = performance.now()
      const passo = Math.min(agora - antes, 250)
      antes = agora
      if (correndoSem) setMsSem((m) => Math.min(m + passo, fimSem))
      if (correndoCom) setMsCom((m) => Math.min(m + passo, fimCom))
    }, 80)
    return () => window.clearInterval(id)
  }, [correndoSem, correndoCom, fimSem, fimCom])

  // Lado a lado, fim do setor: os aparelhos deslizam e entra o próximo.
  useEffect(() => {
    if (!ladoALado || msSem < total) return
    setDirecao(1)
    setIndice((i) => (i + 1) % SETORES.length)
    setMsSem(0)
    setMsCom(0)
  }, [ladoALado, msSem, total])

  function escolher(id: string) {
    const novo = SETORES.findIndex((s) => s.id === id)
    if (novo === indice) return
    setDirecao(novo > indice ? 1 : -1)
    setIndice(novo)
    setMsSem(0)
    setMsCom(0)
  }

  // Empilhadas: o próximo setor e, de volta ao título dele, a comparação
  // recomeça na ordem problema → solução. O foco vai para a aba do setor novo.
  function irParaOProximo() {
    escolher(proximo.id)
    document.getElementById(`dor-aba-${proximo.id}`)?.focus({ preventScroll: true })
    tituloRef.current?.scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' })
  }

  const agoraSem = semMovimento ? Infinity : msSem / RITMO
  const agoraCom = semMovimento ? Infinity : msCom / RITMO
  const terminaram = !ladoALado && (semMovimento || (msSem >= fimSem && msCom >= fimCom))
  // O andamento na aba: lado a lado, o setor; empilhadas, as duas conversas somadas.
  const andamento = semMovimento ? 1 : ladoALado ? msSem / total : (msSem + msCom) / (fimSem + fimCom)
  const ids = SETORES.map((s) => s.id)

  return (
    <section id="por-que" data-section="dor" className="relative scroll-mt-16 border-t border-[var(--landing-borda)] bg-[var(--landing-palco)] py-16 sm:py-20 lg:pb-14 lg:pt-12">
      <div className="landing-container">
        {/* O cabeçalho da seção com o índice de setores no canto direito (desktop),
            na linha do título; no celular, o índice desce e fica centralizado. */}
        <Revelar>
          <Capitulo rotulo={dor.eyebrow} className="mb-6" />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            {/* Os títulos de todos os setores ocupam a mesma célula da grade: a
                altura é a do maior e a troca é um cruzamento, sem a página pular.
                Só o do setor ativo fica visível (e acessível). */}
            {/* scroll-mt: o "Próximo" (celular) traz o título com o sobretítulo
                visível abaixo da barra fixa do topo. */}
            <div ref={tituloRef} className="grid min-w-0 scroll-mt-36">
              {SETORES.map((s) => {
                const ativo = s.id === setor.id
                const texto = dor.setores[s.id as keyof typeof dor.setores]
                return (
                  <div
                    key={s.id}
                    aria-hidden={!ativo}
                    className={cn(
                      '[grid-area:1/1] transition-[opacity,transform,visibility] duration-500 ease-out motion-reduce:transition-none',
                      ativo ? 'visible translate-y-0 opacity-100 delay-150' : 'invisible translate-y-2 opacity-0',
                    )}
                  >
                    <h2 className="max-w-[40rem] font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.7rem,3vw,2.5rem)] text-balance text-surface-50">{texto.titulo}</h2>
                    <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px] text-pretty">{texto.apoio}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-none items-center justify-center gap-2 lg:pt-1">
              <div role="tablist" aria-label={dor.abasLabel} className="landing-abas">
                {SETORES.map((s, i) => {
                  const ativa = i === indice
                  return (
                    <button
                      key={s.id}
                      id={`dor-aba-${s.id}`}
                      type="button"
                      role="tab"
                      aria-selected={ativa}
                      aria-controls="dor-painel"
                      tabIndex={ativa ? 0 : -1}
                      onClick={() => escolher(s.id)}
                      onKeyDown={teclasDasAbas(ids, setor.id, escolher, 'dor-aba-')}
                      className={cn('landing-aba relative rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', ativa && 'text-surface-50')}
                    >
                      {s.rotulo}
                      {/* O andamento do setor: a linha enche até a troca. */}
                      {ativa && (
                        <span aria-hidden className="absolute bottom-[-1px] left-0 right-[14px] h-[2px] overflow-hidden rounded-full bg-white/[.10]">
                          <span
                            className="block h-full origin-left bg-[var(--landing-destaque)]"
                            style={{ transform: `scaleX(${Math.min(1, andamento)})` }}
                          />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {!semMovimento && <BotaoPausa pausado={pausado} onAlternar={() => setPausado((p) => !p)} />}
            </div>
          </div>
        </Revelar>

        <Revelar atraso={0.1}>
          <div ref={ref} className="mx-auto mt-10 max-w-[1080px] lg:mt-6">
            {/* overflow-x: clip corta o deslizar nas bordas sem cortar a sombra dos aparelhos. */}
            <div id="dor-painel" role="tabpanel" aria-labelledby={`dor-aba-${setor.id}`} className="relative overflow-x-clip">
              <AnimatePresence initial={false} mode="popLayout" custom={direcao}>
                <motion.div
                  key={setor.id}
                  custom={direcao}
                  variants={{
                    entra: (d: number) => ({ x: `${d * 100}%`, opacity: 0.4 }),
                    fica: { x: '0%', opacity: 1 },
                    sai: (d: number) => ({ x: `${-d * 100}%`, opacity: 0.4 }),
                  }}
                  initial={semMovimento ? false : 'entra'}
                  animate="fica"
                  exit={semMovimento ? undefined : 'sai'}
                  transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
                  className="grid items-start gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-6 xl:gap-x-8"
                >
                  <Metade raizRef={refSem} setor={setor} com={false} ms={agoraSem} />
                  <Metade raizRef={refCom} setor={setor} com ms={agoraCom} />
                  {/* Celular: com as duas conversas vistas até o fim, o próximo setor. */}
                  {terminaram && (
                    <motion.div
                      className="flex justify-center md:hidden"
                      initial={semMovimento ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <BotaoLanding variante="secundario" tamanho="lg" seta onClick={irParaOProximo}>
                        {dor.proximo} {proximo.rotulo}
                      </BotaoLanding>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Revelar>

        <p className="mt-10 flex items-center justify-center gap-2 lg:mt-8 text-[12.5px] text-surface-500">
          <Info className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          {dor.aviso}
        </p>
      </div>
    </section>
  )
}
