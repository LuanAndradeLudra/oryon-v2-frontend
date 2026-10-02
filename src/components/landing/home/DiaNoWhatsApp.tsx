import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Check, Clock, RotateCcw, UserRound, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { home } from '../landingCopy'
import { Aparelho } from '../stage/hero/HeroSatelites'
import { Bolha, TelaWhatsApp } from '../stage/hero/HeroWhatsAppIphone'
import { DURACAO_CONTADOR, RITMO, type Lado, type PassoDia, type Setor } from './dorConversas'
import { useNaFaixaCentral, useRelogiosDoDia } from './relogiosDoDia'

/**
 * UM DIA NO WHATSAPP — as peças da comparação "sem a Oryon × com a Oryon"
 * (30/09, PO): o iPhone (o mesmo aparelho do palco do Hero) com a conversa do
 * setor e, ao lado, o checklist que marca o que acontece, no ritmo da
 * conversa. Usadas pela seção "Por que a Oryon" da home (com o carrossel de
 * setores) e pela página /solucoes (`DiaNoWhatsApp`, uma área por vez).
 */

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

/** Uma metade da comparação: o rótulo, o aparelho e o checklist. */
export function Metade({ setor, com, ms, raizRef }: { setor: Setor; com: boolean; ms: number; raizRef?: React.Ref<HTMLDivElement> }) {
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

/** A grade da comparação: duas metades; no lg+, os quatro blocos numa linha. */
export const GRADE_DO_DIA = 'grid items-start gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-6 xl:gap-x-8'

/**
 * Uma área só, sem carrossel (página /solucoes, 02/10): os dois aparelhos com
 * os relógios de `useRelogiosDoDia` — lado a lado andam juntos; empilhadas,
 * cada um só na faixa central da tela. A pausa vem de quem compõe a página
 * (o botão fica no cabeçalho do ato). Quando as duas conversas terminam, "Ver
 * de novo" recomeça. Quem troca de área remonta o componente (`key`).
 */
export function DiaNoWhatsApp({ setor, pausado = false }: { setor: Setor; pausado?: boolean }) {
  const semMovimento = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const naTela = useInView(ref, { amount: 0.35 })
  const ladoALado = useMediaQuery('(min-width: 768px)')
  const [refSem, semNaVista] = useNaFaixaCentral()
  const [refCom, comNaVista] = useNaFaixaCentral()
  const { msSem, msCom, fimSem, fimCom, zerar } = useRelogiosDoDia(setor, {
    ativo: !pausado && !semMovimento, ladoALado, naTela, semNaVista, comNaVista,
  })
  const terminou = !semMovimento && msSem >= fimSem && msCom >= fimCom
  return (
    <div>
      <div ref={ref} className={GRADE_DO_DIA}>
        <Metade raizRef={refSem} setor={setor} com={false} ms={semMovimento ? Infinity : msSem / RITMO} />
        <Metade raizRef={refCom} setor={setor} com ms={semMovimento ? Infinity : msCom / RITMO} />
      </div>
      {/* Altura reservada: o botão aparece no fim sem empurrar o que vem abaixo. */}
      <div className="mt-8 flex h-11 justify-center">
        <AnimatePresence>
          {terminou && (
            <motion.button
              type="button"
              onClick={zerar}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white/[.04] px-5 text-[14px] font-semibold text-surface-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)] transition-[background-color,box-shadow] hover:bg-white/[.08] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              {home.dor.verDeNovo}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
