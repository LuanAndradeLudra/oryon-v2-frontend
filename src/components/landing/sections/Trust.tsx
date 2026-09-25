import { motion, useReducedMotion } from 'framer-motion'
import { Plug, SlidersHorizontal, ShieldCheck, Hand, BadgeCheck, History } from 'lucide-react'
import { trust } from '../landingCopy'
import { DemoRecorte } from '../plataforma/DemoRecorte'
import { HERO_ROTAS, type HeroCena, type HeroState } from '../stage/hero/heroStory'
import type { HeroCue } from '../stage/hero/useHeroTimeline'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const ICONS = {
  conexao: Plug,
  permissoes: SlidersHorizontal,
  verificacao: ShieldCheck,
  controle: Hand,
  venda: BadgeCheck,
  historico: History,
} as const

/** Os três itens que a tela ao lado mostra; os outros três vão embaixo. */
const AO_LADO_DA_TELA = new Set(['permissoes', 'venda', 'historico'])

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
const RECORTE = { x: 356, y: 44, w: 924, h: 676 }

function Item({ k, i }: { k: (typeof trust.items)[number]; i: number }) {
  const semMovimento = useReducedMotion()
  const Icon = ICONS[k.key]
  return (
    <motion.li
      className="bg-[var(--landing-cartao)] p-6 sm:p-7"
      initial={semMovimento ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.7, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-xl bg-surface-900 text-[var(--landing-destaque)] ring-1 ring-surface-700">
        <Icon className="h-[13px] w-[13px]" strokeWidth={1.8} aria-hidden />
      </span>
      <h3 className="mt-3.5 font-display text-[12px] font-semibold tracking-[-0.01em] text-surface-50">{k.title}</h3>
      <p className="mt-2 max-w-[44ch] text-[12px] leading-relaxed text-surface-400">{k.text}</p>
    </motion.li>
  )
}

/**
 * Limites da IA — o "posso confiar?" de quem já entendeu o produto e a
 * implantação. Só fatos verificáveis do produto — sem selo, número,
 * depoimento ou logo. No desktop, a tela real das capacidades do agente ao
 * lado dos três limites que ela mostra; embaixo, os outros três.
 */
export function Trust() {
  const semMovimento = useReducedMotion()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const aoLado = trust.items.filter((k) => AO_LADO_DA_TELA.has(k.key))
  const embaixo = trust.items.filter((k) => !AO_LADO_DA_TELA.has(k.key))
  return (
    <section
      id="confianca"
      data-section="confianca"
      className="scroll-mt-16 border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-28"
    >
      <div className="landing-container">
        <motion.div
          className="max-w-[64rem]"
          initial={semMovimento ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="inline-flex rounded-full bg-brand-500/10 px-2.5 py-1 text-[12px] font-semibold text-[var(--landing-destaque)] ring-1 ring-brand-500/20">{trust.eyebrow}</p>
          <h2 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.16rem,2.17vw,1.73rem)] text-balance">
            <span className="text-surface-50">{trust.title}</span>{' '}
            <span className="text-surface-500">{trust.titleCinza}</span>
          </h2>
          <p className="mt-3 max-w-[62ch] text-[12px] sm:text-[12.5px] leading-relaxed text-surface-400 text-pretty">{trust.lead}</p>
        </motion.div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)] lg:gap-5">
          {desktop && (
            <div className="flex min-w-0 items-center justify-center rounded-2xl bg-[var(--landing-palco)] p-2 ring-1 ring-[var(--landing-borda)] sm:px-[clamp(7px,1.3vw,19px)] sm:py-[clamp(7px,1.3vw,17px)]">
              <div className="w-full">
                <DemoRecorte titulo={trust.tela} rota={HERO_ROTAS['agente-capacidades']} estado="inicio" cues={CUES} recorte={RECORTE} foraDoRecorte={330} />
              </div>
            </div>
          )}
          <ul className="grid gap-px overflow-hidden rounded-2xl bg-[var(--landing-borda)] ring-1 ring-[var(--landing-borda)]">
            {aoLado.map((k, i) => <Item key={k.key} k={k} i={i} />)}
          </ul>
        </div>

        <ul className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-[var(--landing-borda)] ring-1 ring-[var(--landing-borda)] md:grid-cols-3 lg:mt-5">
          {embaixo.map((k, i) => <Item key={k.key} k={k} i={i} />)}
        </ul>
      </div>
    </section>
  )
}
