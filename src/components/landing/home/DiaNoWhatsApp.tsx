import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
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

function Telefone({ setor, lado, ms, escalaFixa, alturaTela = 760 }: { setor: Setor; lado: Lado; ms: number; escalaFixa?: number; alturaTela?: number }) {
  const semMovimento = useReducedMotion()
  const escalaDaTela = useEscala()
  const escala = escalaFixa ?? escalaDaTela
  const visiveis = lado.passos.filter((p) => p.t <= ms)
  type Msg = Extract<PassoDia, { tipo: 'msg' }>
  const ultima = ([...visiveis].reverse().find((p) => p.tipo === 'msg') ?? lado.passos.find((p) => p.tipo === 'msg')) as Msg
  return (
    // A tela é 390 × 760 reduzida por `escala`: a moldura (7 px de borda) envolve o tamanho final.
    <Aparelho className="flex-none">
      <div className="overflow-hidden" style={{ width: Math.round(390 * escala), height: Math.round(alturaTela * escala) }}>
        <TelaWhatsApp hora={ultima.hora.replace(/^0/, '')} escala={escala} altura={alturaTela} empresa={setor.empresa} iniciais={setor.iniciais} corAvatar={setor.corAvatar}>
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
/** Quanto a linha do checklist fica acesa depois de acontecer (tempo de roteiro;
 *  menor que o respiro do fim, para a última também apagar). */
const ACESA_MS = 1100

function Checklist({ lado, com, ms, compacto = false }: { lado: Lado; com: boolean; ms: number; compacto?: boolean }) {
  const semMovimento = useReducedMotion()
  const feito = ms >= lado.resultado.t
  return (
    <div className={compacto ? 'min-w-0 flex-1' : 'w-full max-w-[300px] lg:max-w-none lg:pt-3'}>
      {!compacto && <Rotulo com={com} className="hidden lg:inline-flex" />}
      <ul className={compacto ? 'space-y-0.5' : 'mt-6 space-y-3.5'}>
        {lado.checklist.map((it) => {
          const marcado = ms >= it.t
          // Compacto: a linha que acabou de acontecer acende (a prova na
          // conversa logo acima) e apaga devagar.
          const acesa = compacto && !semMovimento && marcado && ms - it.t < ACESA_MS
          const cor = it.pessoa ? 'bg-[#F5B544]/[.16] text-[#F5B544]' : com ? 'bg-brand-500/20 text-[var(--landing-destaque)]' : 'bg-[#F87171]/[.14] text-[#F87171]'
          const Icone = it.pessoa ? UserRound : com ? Check : X
          const brilho = it.pessoa ? 'bg-[#F5B544]/[.10]' : com ? 'bg-brand-500/[.12]' : 'bg-[#F87171]/[.10]'
          return (
            <li
              key={it.texto}
              className={cn(
                'flex items-start gap-2.5 leading-snug',
                compacto ? '-mx-1.5 gap-2 rounded-md px-1.5 py-1.5 text-[13px] transition-colors duration-700 ease-out' : 'text-[14px]',
                acesa ? brilho : compacto && 'bg-transparent',
              )}
            >
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
                {compacto ? it.curto ?? it.texto : it.texto}
              </span>
            </li>
          )
        })}
      </ul>
      <div className={cn('border-t border-white/[.08]', compacto ? 'mt-3 pt-3' : 'mt-6 pt-4')}>
        <p className="font-mono text-[11px] uppercase tracking-[.08em] text-surface-500">{home.dor.resultado}</p>
        <div className={cn('relative mt-1.5', compacto ? 'h-[44px]' : 'h-[44px]')}>
          <AnimatePresence initial={false} mode="popLayout">
            {feito ? (
              <motion.p
                key="fim"
                className={cn(compacto ? 'text-[14px]' : 'text-[16px]', 'font-semibold leading-snug', com ? 'text-[var(--landing-destaque)]' : 'text-[#F87171]')}
                initial={semMovimento ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {compacto ? lado.resultado.curto ?? lado.resultado.texto : lado.resultado.texto}
              </motion.p>
            ) : (
              <motion.p key="andando" className={cn(compacto ? 'text-[13px]' : 'text-[14px]', 'text-surface-600')} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                {home.dor.andamento}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/**
 * O PLACAR (02/10, PO, em teste): no celular, ao lado do aparelho, três números
 * no lugar do checklist — a espera (o relógio corre junto com os selos de
 * "sem resposta"), quantas vezes a cliente ficou sem resposta e o resultado.
 * Sem a Oryon, o relógio sobe em vermelho; com a Oryon, "na hora".
 */
const COR_DO_TOM = { ruim: 'text-[#F87171]', bom: 'text-[var(--landing-destaque)]', pessoa: 'text-[#F5B544]' } as const

function Placar({ setor, lado, com, ms }: { setor: Setor; lado: Lado; com: boolean; ms: number }) {
  const semMovimento = useReducedMotion()
  type Selo = Extract<PassoDia, { tipo: 'selo' }>
  const esperas = lado.passos.filter((p): p is Selo => p.tipo === 'selo' && !!p.contador && p.t <= ms)
  const espera = esperas.reduce((soma, p) => {
    const c = p.contador!
    return soma + c.de + (c.ate - c.de) * suave(Math.min(1, Math.max(0, (ms - p.t) / DURACAO_CONTADOR)))
  }, 0)
  const feito = ms >= lado.resultado.t
  const cor = com ? 'text-[var(--landing-destaque)]' : 'text-[#F87171]'
  // Quem respondeu: os marcos saem do próprio roteiro — a primeira resposta da
  // empresa e, com a Oryon, a linha em que a equipe é chamada.
  const primeiraResposta = lado.passos.find((p) => p.tipo === 'msg' && !p.minha)?.t ?? Infinity
  const equipeChamada = lado.checklist.find((it) => it.pessoa)?.t ?? Infinity
  const Rotulo = ({ children }: { children: ReactNode }) => (
    <p className="font-mono text-[10.5px] uppercase tracking-[.08em] text-surface-500">{children}</p>
  )
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 pt-2">
      <div>
        <Rotulo>Espera</Rotulo>
        <p className={cn('mt-1 font-display text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums', com || espera > 0 ? cor : 'text-surface-500')}>
          {com ? 'na hora' : duracao(espera)}
        </p>
      </div>
      {/* Os blocos do setor: a dor daquele negócio, valendo o último marco já alcançado. */}
      {setor.placar.map((b) => {
        const marcos = com ? b.com : b.sem
        const atual = [...marcos].reverse().find((m) => m.t <= ms) ?? marcos[0]
        return (
          <div key={b.rotulo}>
            <Rotulo>{b.rotulo}</Rotulo>
            <p className={cn('mt-1 text-[17px] font-semibold leading-tight', atual?.tom ? COR_DO_TOM[atual.tom] : 'text-surface-500')}>
              {atual?.texto ?? '—'}
            </p>
          </div>
        )
      })}
      <div>
        <Rotulo>Quem respondeu</Rotulo>
        <p className={cn('mt-1 text-[17px] font-semibold leading-tight', ms < primeiraResposta ? 'text-surface-500' : com ? cor : 'text-surface-300')}>
          {ms < primeiraResposta ? 'Ninguém' : !com ? setor.quemAtrasou : ms < equipeChamada ? 'Agente IA' : (
            <>Agente IA <span className="text-[#F5B544]">+ {setor.quemEntra}</span></>
          )}
        </p>
      </div>
      <div className="border-t border-white/[.08] pt-4">
        <Rotulo>{home.dor.resultado}</Rotulo>
        <div className="relative mt-1.5 min-h-[44px]">
          <AnimatePresence initial={false} mode="popLayout">
            {feito ? (
              <motion.p
                key="fim"
                className={cn('text-[15px] font-semibold leading-snug', cor)}
                initial={semMovimento ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {lado.resultado.curto ?? lado.resultado.texto}
              </motion.p>
            ) : (
              <motion.p key="andando" className="text-[13px] text-surface-600" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
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

export type LadoDoDia = 'sem' | 'com'

/** A escala do aparelho no celular: com o checklist logo abaixo, os dois cabem
 *  juntos na tela (antes, a 0,6, o checklist ficava fora dela). */
const ESCALA_NO_CELULAR = 0.54

/**
 * O DIA NO CELULAR (02/10, PO): em vez de dois aparelhos empilhados — com o
 * checklist de cada um fora da tela enquanto a conversa corria —, um aparelho
 * só, com a chave "Sem a Oryon | Com a Oryon" em cima e o checklist compacto
 * logo abaixo, os dois à vista juntos. A conversa sem a Oryon termina e a
 * chave passa sozinha para a com a Oryon; tocar na chave troca quando quiser.
 * A linha do checklist acende no momento em que a conversa a prova. Os
 * relógios são de quem compõe (cada conversa anda só enquanto é a da vez).
 */
export function DiaNoCelular({ setor, lado, onLado, msSem, msCom, fimSem, fimCom, raizRef, rodape }: {
  setor: Setor
  lado: LadoDoDia
  onLado: (lado: LadoDoDia) => void
  /** Os relógios (tempo real) e o fim de cada conversa. */
  msSem: number
  msCom: number
  fimSem: number
  fimCom: number
  raizRef?: React.Ref<HTMLDivElement>
  /** O que vem quando as duas terminam ("Próximo", "Ver de novo"). */
  rodape?: ReactNode
}) {
  const semMovimento = useReducedMotion()
  const idDaChave = useId()
  const com = lado === 'com'
  const dados = com ? setor.com : setor.sem
  const ms = semMovimento ? Infinity : (com ? msCom : msSem) / RITMO

  // A troca sozinha: uma vez por rodada, quando a conversa sem a Oryon termina.
  // Escolher um lado na chave desliga a troca sozinha até a rodada recomeçar.
  const trocou = useRef(false)
  useEffect(() => { if (msSem === 0) trocou.current = false }, [msSem])
  useEffect(() => {
    if (semMovimento || lado !== 'sem' || trocou.current || msSem < fimSem) return
    const id = window.setTimeout(() => { trocou.current = true; onLado('com') }, 600)
    return () => window.clearTimeout(id)
  }, [semMovimento, lado, msSem, fimSem, onLado])
  const escolher = (l: LadoDoDia) => { trocou.current = true; onLado(l) }

  return (
    <div ref={raizRef} className="flex w-full flex-col items-center gap-3">
      <div role="tablist" aria-label={home.dor.alternarLabel} className="relative grid w-full grid-cols-2 rounded-full bg-white/[.04] p-1 ring-1 ring-inset ring-white/[.08]">
        {(['sem', 'com'] as const).map((l) => {
          const ativo = l === lado
          const ehCom = l === 'com'
          const andou = Math.min(1, (ehCom ? msCom / fimCom : msSem / fimSem) || 0)
          return (
            <button
              key={l}
              type="button"
              role="tab"
              id={`${idDaChave}-${l}`}
              aria-selected={ativo}
              aria-controls={`${idDaChave}-painel`}
              onClick={() => escolher(l)}
              className={cn(
                'relative flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors duration-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                ativo ? (ehCom ? 'text-[var(--landing-destaque)]' : 'text-[#FCA5A5]') : 'text-surface-400',
              )}
            >
              {ativo && (
                <motion.span
                  layoutId={`${idDaChave}-pilula`}
                  aria-hidden
                  className={cn('absolute inset-0 rounded-full ring-1 ring-inset', ehCom ? 'bg-brand-500/[.14] ring-brand-500/40' : 'bg-[#F87171]/[.10] ring-[#F87171]/30')}
                  transition={semMovimento ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                {ehCom ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
                {ehCom ? home.dor.comOryon : home.dor.semOryon}
              </span>
              {/* O andamento da conversa da vez: a linha enche até o fim dela. */}
              {ativo && !semMovimento && (
                <span aria-hidden className="absolute inset-x-6 bottom-[3px] h-[2px] overflow-hidden rounded-full bg-white/[.08]">
                  <span className="block h-full origin-left" style={{ transform: `scaleX(${andou})`, background: ehCom ? 'var(--landing-destaque)' : '#F87171' }} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* O aparelho na margem esquerda (mesmo tamanho) e, à direita, o checklist
          com frases curtas e o resultado — conversa e prova lado a lado, tudo
          numa tela (02/10, PO). */}
      <div id={`${idDaChave}-painel`} role="tabpanel" aria-labelledby={`${idDaChave}-${lado}`} className="flex w-full items-start gap-3">
        <div aria-hidden className="pointer-events-none flex-none select-none">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={lado}
              initial={semMovimento ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={semMovimento ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Telefone setor={setor} lado={dados} ms={ms} escalaFixa={ESCALA_NO_CELULAR} />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="sr-only">{textoDoLado(setor, dados)}</p>
        <Placar key={lado} setor={setor} lado={dados} com={com} ms={ms} />
      </div>
      {rodape}
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
  // Celular: um aparelho só, e só a conversa da vez anda (com ele na vista).
  const [refCelular, celularNaVista] = useNaFaixaCentral()
  const [lado, setLado] = useState<LadoDoDia>('sem')
  const { msSem, msCom, fimSem, fimCom, zerar } = useRelogiosDoDia(setor, {
    ativo: !pausado && !semMovimento, ladoALado, naTela,
    semNaVista: celularNaVista && lado === 'sem', comNaVista: celularNaVista && lado === 'com',
  })
  const terminou = !semMovimento && msSem >= fimSem && msCom >= fimCom
  const verDeNovo = () => { zerar(); setLado('sem') }
  return (
    <div>
      <div ref={ref} className={ladoALado ? GRADE_DO_DIA : undefined}>
        {ladoALado ? (
          <>
            <Metade setor={setor} com={false} ms={semMovimento ? Infinity : msSem / RITMO} />
            <Metade setor={setor} com ms={semMovimento ? Infinity : msCom / RITMO} />
          </>
        ) : (
          <DiaNoCelular raizRef={refCelular} setor={setor} lado={lado} onLado={setLado} msSem={msSem} msCom={msCom} fimSem={fimSem} fimCom={fimCom} />
        )}
      </div>
      {/* Altura reservada: o botão aparece no fim sem empurrar o que vem abaixo. */}
      <div className="mt-8 flex h-11 justify-center">
        <AnimatePresence>
          {terminou && (
            <motion.button
              type="button"
              onClick={verDeNovo}
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
