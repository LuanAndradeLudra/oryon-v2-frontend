import { useCallback, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { home, solucoes } from '../landingCopy'
import { DiaNoWhatsApp } from '../home/DiaNoWhatsApp'
import { DemoRecorte, type Recorte } from '../plataforma/DemoRecorte'
import { APP_INTEIRO, type Cue } from '../plataforma/historias'
import { Capitulo, Revelar } from '../plataforma/SecoesVenda'
import { HERO_ROTAS, type HeroCena, type HeroState } from '../stage/hero/heroStory'
import { BotaoLanding } from '../ui/BotaoLanding'
import { BotaoPausa } from '../ui/BotaoPausa'
import { AREAS, type AreaId } from './areas'

/**
 * O PAINEL DE UMA ÁREA na /solucoes (02/10): a mesma área contada em atos, de
 * cima para baixo —
 *  1. Um dia no WhatsApp: os dois iPhones da home (sem × com a Oryon);
 *  2. Na tela da sua equipe: o app real no layout de computador — no desktop,
 *     a tela inteira contando a história, com a câmera aproximando no contato e
 *     no sino, e os quatro momentos ao lado (embaixo, no celular);
 *  3. O que a IA usa para responder: o conhecimento cadastrado e os itens;
 *  e o convite, que leva ao formulário com a área já preenchida.
 *
 * Cada área tem o seu perfil no app de demonstração (`perfisDemo.ts`, a
 * mesma conversa dos iPhones): a mesma história, com o conteúdo da área.
 */

const S = (t: number, state: HeroState): Cue => ({ t, state })

// ── O app da clínica (1280 × 720) ────────────────────────────────────────────

/** A história inteira, para a tela grande: a conversa chega e a IA responde; o
 *  contato se organiza; a venda anda no funil; a recepção assume. */
const HISTORIA_CLINICA: readonly Cue[] = [
  { t: 0, state: 'inicio', composition: 'conversa' },
  S(1400, 'demanda'), S(3800, 'resposta'), S(7800, 'confirma'),
  S(9600, 'situacao'), S(11600, 'etiqueta'),
  { t: 15000, state: 'etiqueta', composition: 'funil' },
  S(17200, 'avanco'),
  { t: 22600, state: 'pedido', composition: 'conversa' },
  // A transferência (02/10): o tempo da mão — o clique no aviso e no
  // "Assumir" — e a recepção entra logo depois do segundo clique.
  S(25000, 'assumido'), S(28000, 'humano'),
  S(32000, 'humano'),
]

/** Em que momento da história a tela está (o destaque da lista ao lado). */
/** O primeiro cue de cada momento em HISTORIA_CLINICA (o clique pula para ele). */
const INICIO_DO_MOMENTO = [0, 4, 6, 8] as const

function momentoDe(estado: HeroState, cena: HeroCena) {
  if (cena === 'funil') return 2
  if (estado === 'pedido' || estado === 'assumido' || estado === 'humano' || estado === 'ganho') return 3
  if (estado === 'situacao' || estado === 'etiqueta') return 1
  return 0
}

/** O conhecimento, medido no app de computador (02/10): o título e os
 *  primeiros documentos. */
const R_CONHECIMENTO: Recorte = { x: 298, y: 140, w: 460, h: 400 }

/**
 * NO CELULAR (02/10, PO): as janelas da /solucoes seguem as do "Como funciona"
 * e do Hero — o app desenhado numa tela de 1024 × 768 e a moldura em 4:3, um
 * terço mais alta e com o texto 25% maior, sem corte (a lista de conversas e o
 * painel do contato estreitam na demonstração, e a conversa ganha largura).
 * No desktop, nada muda (1280 × 720).
 */
const APP_NO_CELULAR = { w: 1024, h: 768 }
const APP_INTEIRO_NO_CELULAR: Recorte = { x: 0, y: 0, ...APP_NO_CELULAR }
/** O conhecimento em 1024: o título e os dois primeiros documentos, em 4:3. */
const R_CONHECIMENTO_NO_CELULAR: Recorte = { x: 296, y: 136, w: 560, h: 420 }
const CONHECIMENTO: readonly Cue[] = [{ t: 0, state: 'inicio', composition: 'agente-conhecimento' }]

// ── Peças ────────────────────────────────────────────────────────────────────

const TITULO_ATO = 'max-w-[40rem] font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.7rem,3vw,2.5rem)] text-balance text-surface-50'
const APOIO_ATO = 'mt-4 max-w-[60ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px] text-pretty'

/** O cabeçalho de um ato: o rótulo sobre a régua (com a pausa na ponta, quando
 *  o ato se move sozinho), o título e o apoio. */
function CabecalhoDoAto({ rotulo, titulo, apoio, pausa }: { rotulo: string; titulo: string; apoio?: ReactNode; pausa?: ReactNode }) {
  return (
    <Revelar>
      <div className="mb-6 flex items-center gap-3">
        <Capitulo rotulo={rotulo} className="min-w-0 flex-1" />
        {pausa}
      </div>
      <h2 className={TITULO_ATO}>{titulo}</h2>
      {apoio && <p className={APOIO_ATO}>{apoio}</p>}
    </Revelar>
  )
}

function Pausa({ pausado, alternar }: { pausado: boolean; alternar: () => void }) {
  const semMovimento = useReducedMotion()
  if (semMovimento) return null
  return <BotaoPausa pausado={pausado} onAlternar={alternar} className="-my-2" />
}

function AtoDoDia({ area }: { area: AreaId }) {
  const [pausado, setPausado] = useState(false)
  const setor = AREAS.find((a) => a.id === area)!.setor
  const texto = home.dor.setores[area]
  return (
    <section data-section="dia" aria-label={solucoes.atos.dia} className="relative border-t border-[var(--landing-borda)] bg-[var(--landing-palco)] py-16 sm:py-20">
      <div className="landing-container">
        <CabecalhoDoAto rotulo={solucoes.atos.dia} titulo={texto.titulo} apoio={texto.apoio} pausa={<Pausa pausado={pausado} alternar={() => setPausado((p) => !p)} />} />
        <Revelar atraso={0.1} className="mx-auto mt-10 max-w-[1080px] lg:mt-12">
          <DiaNoWhatsApp key={area} setor={setor} pausado={pausado} />
        </Revelar>
        <p className="mt-6 flex items-center justify-center gap-2 text-[12.5px] text-surface-500">
          <Info className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          {home.dor.aviso}
        </p>
      </div>
    </section>
  )
}

/** Os quatro momentos ao lado da tela grande (embaixo, no celular): o atual
 *  acende com a história, e cada um é clicável — leva a tela àquele trecho. */
function Momentos({ area, atual, escolher }: { area: AreaId; atual: number; escolher: (i: number) => void }) {
  const marcos = solucoes.areas[area].tela.marcos
  return (
    <ol aria-label={solucoes.momentosLabel} className="grid gap-x-8 gap-y-1 md:grid-cols-2 lg:grid-cols-1 lg:gap-y-1.5">
      {marcos.map((m, i) => {
        const aceso = i === atual
        return (
          <li key={m.titulo}>
            <button
              type="button"
              onClick={() => escolher(i)}
              aria-current={aceso ? 'step' : undefined}
              className={cn(
                'group block w-full cursor-pointer rounded-r-xl border-l-2 py-2.5 pl-4 pr-3 text-left transition-colors duration-300 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                aceso ? 'border-[var(--landing-destaque)] bg-white/[.03]' : 'border-white/[.08] [@media(hover:hover)]:hover:border-white/[.22] [@media(hover:hover)]:hover:bg-white/[.025]',
              )}
            >
              <span className={cn('block text-[15px] font-semibold leading-snug transition-colors duration-300', aceso ? 'text-surface-50' : 'text-surface-300 [@media(hover:hover)]:group-hover:text-surface-100')}>{m.titulo}</span>
              <span className={cn('mt-1 block text-[14px] leading-relaxed transition-colors duration-300', aceso ? 'text-surface-300' : 'text-surface-500 [@media(hover:hover)]:group-hover:text-surface-400')}>{m.texto}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * A CÂMERA da tela grande (02/10, PO): nos momentos que quase não mudam a tela
 * inteira, a moldura aproxima e o próprio app mostra o detalhe — o painel do
 * contato rola até a Timeline (situação e etiqueta) e o sino abre com a
 * notificação de transferência (a recepção assume). As regiões têm a
 * proporção da moldura (16:9): ela não muda de tamanho, nada desce na página.
 * Medidas no app de computador (1280 × 720).
 */
// O painel do contato rola até o fim: a Timeline fica no pé dele (y 476 a 720).
const R_CONTATO: Recorte = { x: 640, y: 360, w: 640, h: 360 }
const R_SINO: Recorte = { x: 640, y: 28, w: 640, h: 360 }
// No celular (1024 × 768, 4:3): as mesmas duas aproximações (2×), medidas nas
// cinco áreas — a Timeline no pé do painel do contato, o sino no alto à direita.
const R_CONTATO_NO_CELULAR: Recorte = { x: 512, y: 384, w: 512, h: 384 }
const R_SINO_NO_CELULAR: Recorte = { x: 512, y: 28, w: 512, h: 384 }

/**
 * A DIREÇÃO (02/10, PO: "câmera de tripé"): plano geral o tempo todo; a câmera
 * só fecha no que, no desktop do Hero, é uma janela satélite — a atividade do
 * contato e o sino da transferência — e volta.
 */
function regiaoDe(estado: HeroState, cena: HeroCena, celular: boolean): Recorte {
  const inteiro = celular ? APP_INTEIRO_NO_CELULAR : APP_INTEIRO
  if (cena !== 'conversa') return inteiro
  if (estado === 'situacao' || estado === 'etiqueta') return celular ? R_CONTATO_NO_CELULAR : R_CONTATO
  // Aproxima rápido no sino quando a notificação chega e afasta quando a
  // pessoa entra — o destaque passa para a mensagem dela.
  if (estado === 'assumido') return celular ? R_SINO_NO_CELULAR : R_SINO
  return inteiro
}

/** O app grande, em todas as telas (02/10, PO): no celular também é a tela
 *  inteira de computador navegando entre conversa e funil, com a câmera
 *  aproximando nos detalhes — quem visita só precisa ver o processo
 *  acontecendo; os momentos vêm ao lado (embaixo, no celular). */
function AtoDaTela({ area }: { area: AreaId }) {
  const [pausado, setPausado] = useState(false)
  const [momento, setMomento] = useState(0)
  const [passo, setPasso] = useState<{ estado: HeroState; cena: HeroCena }>({ estado: 'inicio', cena: 'conversa' })
  const aoPassar = useCallback((estado: HeroState, cena: HeroCena) => {
    setPasso({ estado, cena })
    setMomento(momentoDe(estado, cena))
  }, [])
  const [salto, setSalto] = useState<{ indice: number }>()
  const escolher = useCallback((i: number) => {
    setMomento(i)
    setSalto({ indice: INICIO_DO_MOMENTO[i] })
  }, [])
  const { tela } = solucoes.areas[area]
  const celular = !useMediaQuery('(min-width: 768px)')
  return (
    <section data-section="tela" aria-label={solucoes.atos.tela} className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20">
      <div className="landing-container">
        <CabecalhoDoAto rotulo={solucoes.atos.tela} titulo={tela.titulo} apoio={solucoes.telaAviso} pausa={<Pausa pausado={pausado} alternar={() => setPausado((p) => !p)} />} />
        <Revelar atraso={0.1} className="mt-10 grid gap-6 sm:gap-8 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-center lg:gap-12">
          <DemoRecorte
            layoutDesktop
            camera
            titulo="Oryon"
            rota={HERO_ROTAS.conversa}
            estado="inicio"
            cues={HISTORIA_CLINICA}
            cursorNaPassagem
            recorte={regiaoDe(passo.estado, passo.cena, celular)}
            tamanhoDoApp={celular ? APP_NO_CELULAR : undefined}
            setor={area}
            pausado={pausado}
            onPasso={aoPassar}
            salto={salto}
          />
          <Momentos area={area} atual={momento} escolher={escolher} />
        </Revelar>
      </div>
    </section>
  )
}

function AtoDaIa({ area, fundo }: { area: AreaId; fundo: string }) {
  const copia = solucoes.areas[area]
  const celular = !useMediaQuery('(min-width: 768px)')
  return (
    <section data-section="ia" aria-label={solucoes.atos.ia} className={cn('relative border-t border-[var(--landing-borda)] py-16 sm:py-20', fundo)}>
      <div className={cn('landing-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16')}>
        <div>
          <CabecalhoDoAto rotulo={solucoes.atos.ia} titulo={copia.ia} />
          <Itens itens={copia.itens} className="mt-8" />
        </div>
        <Revelar atraso={0.1} className="w-full max-w-[560px] lg:justify-self-end">
            <DemoRecorte
              layoutDesktop
              esmaecerDireita
              titulo="Oryon · Agentes IA · Conhecimento"
              rota={HERO_ROTAS['agente-conhecimento']}
              estado="inicio"
              cues={CONHECIMENTO}
              recorte={celular ? R_CONHECIMENTO_NO_CELULAR : R_CONHECIMENTO}
              tamanhoDoApp={celular ? APP_NO_CELULAR : undefined}
              setor={area}
              pausado
            />
          </Revelar>
      </div>
    </section>
  )
}

function Itens({ itens, className }: { itens: readonly string[]; className?: string }) {
  return (
    <Revelar atraso={0.1} className={className}>
      <ul className="grid gap-4">
        {itens.map((it) => (
          <li key={it} className="flex items-start gap-3 text-[16px] leading-snug text-surface-100 sm:text-[17px]">
            <span className="mt-[2px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-brand-500/[.16] text-[var(--landing-destaque)] ring-1 ring-inset ring-brand-500/40">
              <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden />
            </span>
            {it}
          </li>
        ))}
      </ul>
    </Revelar>
  )
}

/** O convite do fim: leva ao formulário logo abaixo, já com a área. */
function Convite({ area, fundo }: { area: AreaId; fundo: string }) {
  const titulo = solucoes.areas[area].cta
  return (
    <section data-section="convite" aria-label={titulo} className={cn('relative pb-16 sm:pb-20', fundo)}>
      <div className="landing-container">
        <Revelar>
          <div className="flex flex-col gap-6 border-t border-[var(--landing-borda)] pt-10 sm:pt-12 md:flex-row md:items-center md:justify-between md:gap-12">
            <div className="max-w-[36rem]">
              <h2 className="font-display text-[clamp(1.6rem,2.8vw,2.3rem)] font-bold leading-[1.08] tracking-[-0.03em] text-surface-50 text-balance">{titulo}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-surface-400 sm:text-[16.5px] text-pretty">{solucoes.ctaTexto}</p>
            </div>
            <BotaoLanding href="#demonstracao" tamanho="lg" seta className="rounded-lg self-start md:flex-none md:self-auto">
              {home.ctaPrincipal}
            </BotaoLanding>
          </div>
        </Revelar>
      </div>
    </section>
  )
}

export function PainelDaArea({ area }: { area: AreaId }) {
  const semMovimento = useReducedMotion()
  // Os fundos alternam de um ato para o outro; o convite continua o último ato.
  const fundo = 'bg-[var(--landing-palco)]'
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={area}
        id="area-painel"
        role="tabpanel"
        aria-labelledby={`area-aba-${area}`}
        initial={semMovimento ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={semMovimento ? undefined : { opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <AtoDoDia area={area} />
        <AtoDaTela area={area} />
        <AtoDaIa area={area} fundo={fundo} />
        <Convite area={area} fundo={fundo} />
      </motion.div>
    </AnimatePresence>
  )
}
