import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Plug, SlidersHorizontal, PhoneForwarded, Hand, BadgeCheck, History } from 'lucide-react'
import { home, rotaPlataforma, trust } from '../landingCopy'
import { DemoRecorte } from '../plataforma/DemoRecorte'
import { HERO_ROTAS, type HeroCena, type HeroState } from '../stage/hero/heroStory'
import type { HeroCue } from '../stage/hero/useHeroTimeline'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const ICONS = {
  conexao: Plug,
  permissoes: SlidersHorizontal,
  chamada: PhoneForwarded,
  controle: Hand,
  venda: BadgeCheck,
  historico: History,
} as const

/**
 * A aba Capacidades do Agente Vendas, na tela real: primeiro o holofote em
 * "Atribuir conversa a um atendente" (permitido), depois em "Mover negócio ou
 * registro no funil" — o card onde o próprio produto diz que fechar venda nunca
 * é permitido. O detalhe do agente começa em x ≈ 356 (medido; mesmo recorte
 * do capítulo "Ensinar a IA").
 */
const CUES: readonly HeroCue<HeroState, HeroCena>[] = [
  { t: 0, state: 'inicio', composition: 'agente-capacidades' },
  { t: 5200, composition: 'agente-capacidades-funil' },
  { t: 11000, composition: 'agente-capacidades-funil' },
]
// Página do agente em 1280×720: navegação + seção Capacidades (direção D).
const RECORTE = { x: 62, y: 48, w: 1218, h: 672 }

function Item({ k, i }: { k: (typeof trust.items)[number]; i: number }) {
  const semMovimento = useReducedMotion()
  const Icon = ICONS[k.key]
  return (
    <motion.li
      className="bg-[var(--landing-cartao)] p-5 sm:p-6 lg:p-4"
      initial={semMovimento ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.7, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-xl bg-surface-900 text-[var(--landing-destaque)] ring-1 ring-surface-700">
        <Icon className="h-[13px] w-[13px]" strokeWidth={1.8} aria-hidden />
      </span>
      <h3 className="mt-2.5 font-display text-[15px] font-semibold tracking-[-0.01em] text-surface-50">{k.title}</h3>
      <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-surface-400">{k.text}</p>
    </motion.li>
  )
}

/**
 * Limites da IA — o "posso confiar?" de quem já entendeu o produto e a
 * implantação. Só fatos verificáveis do produto — sem selo, número,
 * depoimento ou logo. No desktop, a tela real das capacidades do agente ao
 * lado dos quatro limites decisivos. Histórico e retomada humana já aparecem
 * na narrativa anterior, por isso não são repetidos aqui.
 */
/** `compacto` (home de venda): só os quatro limites, sem a tela, e o link para a página de Atendimento com IA. */
export function Trust({ compacto = false }: { compacto?: boolean }) {
  const semMovimento = useReducedMotion()
  const desktop = useMediaQuery('(min-width: 1024px)') && !compacto
  return (
    <section
      id="confianca"
      data-section="confianca"
      className="scroll-mt-20 border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20 lg:py-10"
    >
      <div className="landing-container">
        <motion.div
          className="max-w-[64rem]"
          initial={semMovimento ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="inline-flex rounded-full bg-brand-500/10 px-2.5 py-1 text-[12px] font-semibold text-[var(--landing-destaque)] ring-1 ring-brand-500/20">{trust.eyebrow}</p>
          <h2 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.16rem,2.17vw,1.73rem)] text-balance">
            <span className="text-surface-50">{trust.title}</span>{' '}
            <span className="text-surface-500">{trust.titleCinza}</span>
          </h2>
          <p className="mt-3 max-w-[62ch] text-[14px] sm:text-[15px] leading-relaxed text-surface-400 text-pretty">{trust.lead}</p>
        </motion.div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,550px)_minmax(340px,1fr)] lg:gap-4">
          {desktop && (
            <div className="min-w-0 self-start lg:max-w-[550px]">
              <div className="w-full">
                <DemoRecorte titulo={trust.tela} rota={HERO_ROTAS['agente-capacidades']} estado="inicio" cues={CUES} recorte={RECORTE} foraDoRecorte={330} />
              </div>
            </div>
          )}
          <ul className={compacto ? 'grid gap-px overflow-hidden rounded-2xl bg-[var(--landing-borda)] ring-1 ring-[var(--landing-borda)] sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4' : 'grid gap-px overflow-hidden rounded-2xl bg-[var(--landing-borda)] ring-1 ring-[var(--landing-borda)] sm:grid-cols-2'}>
            {trust.items.map((k, i) => <Item key={k.key} k={k} i={i} />)}
          </ul>
        </div>
        {compacto && (
          <Link to={rotaPlataforma('atendimento-ia')} className="mt-5 inline-flex items-center gap-1.5 rounded-sm text-[14px] font-medium text-[var(--landing-destaque)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            {home.limites.saibaMais} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  )
}
