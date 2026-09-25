import { motion, useReducedMotion } from 'framer-motion'
import { Plug, UserCheck, ShieldCheck, Hand } from 'lucide-react'
import { trust } from '../landingCopy'

const ICONS = {
  conexao: Plug,
  contexto: UserCheck,
  verificacao: ShieldCheck,
  controle: Hand,
} as const

/**
 * Limites da IA — o "posso confiar?" de quem já entendeu o produto e a
 * implantação. Só fatos verificáveis do produto — sem selo, número,
 * depoimento ou logo. Grade 2 × 2 no desktop, lista no celular.
 */
export function Trust() {
  const semMovimento = useReducedMotion()
  return (
    <section
      id="confianca"
      data-section="confianca"
      className="scroll-mt-16 border-t border-surface-800 bg-surface-950 py-20 sm:py-28"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <motion.div
          className="max-w-[46rem]"
          initial={semMovimento ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="inline-flex rounded-full bg-brand-500/10 px-2.5 py-1 text-[12px] font-semibold text-brand-400 ring-1 ring-brand-500/20">{trust.eyebrow}</p>
          <h2 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.75rem,3.4vw,2.75rem)] text-balance">
            <span className="text-surface-50">{trust.title}</span>{' '}
            <span className="text-surface-500">{trust.titleCinza}</span>
          </h2>
        </motion.div>

        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-surface-800 ring-1 ring-surface-800 md:grid-cols-2">
          {trust.items.map((item, i) => {
            const Icon = ICONS[item.key]
            return (
              <motion.li
                key={item.key}
                className="bg-surface-950 p-6 sm:p-8"
                initial={semMovimento ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-900 text-brand-400 ring-1 ring-surface-700">
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-[18px] font-semibold tracking-[-0.01em] text-surface-50">{item.title}</h3>
                <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-surface-400">{item.text}</p>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
