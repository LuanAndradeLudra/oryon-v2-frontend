import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { ChevronDown, MessageCircle, Smartphone, Settings2, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LinkButton } from '@/components/ui/LinkButton'
import { contato, linkContato, implantacao, perguntas, fecho, LANDING_ROUTES } from '../landingCopy'

/**
 * As seções de CONVERSÃO depois da Plataforma (25/09). Cada uma derruba uma
 * objeção de quem já entendeu o produto e está decidindo:
 *
 *  • Implantação — "vai dar trabalho?" → até 7 dias, quase tudo com a gente;
 *  • Perguntas   — preço, prazo, número oficial, limites da IA;
 *  • Fecho       — a conversa no WhatsApp com o próprio Agente IA do Oryon.
 */

function Revelar({ children, atraso = 0, className }: { children: ReactNode; atraso?: number; className?: string }) {
  const semMovimento = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={semMovimento ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.9, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

function BotaoContato({ className, longo = true }: { className?: string; longo?: boolean }) {
  return (
    <LinkButton
      href={linkContato()}
      target={contato.whatsapp ? '_blank' : undefined}
      rel={contato.whatsapp ? 'noopener noreferrer' : undefined}
      size="lg"
      className={className}
      leftIcon={<MessageCircle className="h-4 w-4" strokeWidth={2.2} />}
    >
      {longo ? contato.ctaLongo : contato.cta}
    </LinkButton>
  )
}

function Cabecalho({ eyebrow, titulo, cinza }: { eyebrow: string; titulo: string; cinza: string }) {
  return (
    <Revelar className="max-w-[64rem]">
      <p className="inline-flex rounded-full bg-brand-500/10 px-2.5 py-1 text-[12px] font-semibold text-[var(--landing-destaque)] ring-1 ring-brand-500/20">{eyebrow}</p>
      <h2 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.16rem,2.17vw,1.73rem)] text-balance">
        <span className="text-surface-50">{titulo}</span>{' '}
        <span className="text-surface-500">{cinza}</span>
      </h2>
    </Revelar>
  )
}

// ─── Implantação ─────────────────────────────────────────────────────────────

const ICONES_PASSO = [Smartphone, Settings2, Rocket]

export function SecaoImplantacao() {
  const semMovimento = useReducedMotion()
  return (
    <section id="implantacao" data-section="implantacao" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-28">
      <div className="landing-container">
        <Cabecalho eyebrow={implantacao.eyebrow} titulo={implantacao.title} cinza={implantacao.titleCinza} />

        <div className="relative mt-14 sm:mt-16">
          {/* A linha do tempo que se desenha ao entrar na tela (desktop). */}
          <div aria-hidden className="absolute left-0 right-0 top-[16px] hidden h-px bg-surface-800 md:block">
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-brand-500 via-brand-400 to-brand-500"
              initial={semMovimento ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-20% 0px' }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            />
          </div>
          <ol className="relative grid gap-6 md:grid-cols-3 md:gap-8">
            {implantacao.passos.map((p, i) => {
              const Icone = ICONES_PASSO[i]
              return (
                <Revelar key={p.titulo} atraso={0.25 + i * 0.25}>
                  <li className="list-none">
                    <span className="relative z-10 flex h-[34px] w-[34px] items-center justify-center rounded-2xl bg-surface-900 ring-1 ring-surface-700 text-[var(--landing-destaque)]">
                      <Icone className="h-[14.5px] w-[14.5px]" strokeWidth={1.8} />
                    </span>
                    <p className="mt-5 text-[12px] font-semibold uppercase tracking-[.12em] text-[var(--landing-destaque)]">{p.quem}</p>
                    <p className="mt-1.5 font-display text-[13px] font-semibold tracking-[-0.01em] text-surface-50">{p.titulo}</p>
                    <p className="mt-2 max-w-[34ch] text-[12px] leading-relaxed text-surface-400">{p.texto}</p>
                  </li>
                </Revelar>
              )
            })}
          </ol>
        </div>

        <Revelar atraso={0.4} className="mt-12">
          <BotaoContato />
        </Revelar>
      </div>
    </section>
  )
}

// ─── Perguntas frequentes ────────────────────────────────────────────────────

function Pergunta({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  const [aberta, setAberta] = useState(false)
  const semMovimento = useReducedMotion()
  return (
    <div className="border-b border-[var(--landing-borda)]">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="flex w-full items-center justify-between gap-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)] rounded-md"
      >
        <span className="text-[12px] font-semibold text-surface-50">{pergunta}</span>
        <ChevronDown className={cn('h-5 w-5 flex-shrink-0 text-surface-500 transition-transform duration-300', aberta && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: semMovimento ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-[62ch] pb-6 text-[12px] leading-relaxed text-surface-400">{resposta}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function SecaoPerguntas() {
  return (
    <section id="perguntas" data-section="perguntas" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-28">
      <div className="landing-container grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div>
          <Cabecalho eyebrow={perguntas.eyebrow} titulo={perguntas.title} cinza={perguntas.titleCinza} />
          <Revelar atraso={0.2} className="mt-8">
            <BotaoContato longo={false} />
          </Revelar>
        </div>
        <Revelar atraso={0.1}>
          <div className="border-t border-[var(--landing-borda)]">
            {perguntas.itens.map((q) => <Pergunta key={q.pergunta} pergunta={q.pergunta} resposta={q.resposta} />)}
          </div>
        </Revelar>
      </div>
    </section>
  )
}

// ─── Fecho ───────────────────────────────────────────────────────────────────

export function SecaoFecho() {
  return (
    <section id="contato" data-section="cta" className="relative overflow-hidden border-t border-[var(--landing-borda)] bg-surface-950 py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(60% 70% at 50% 100%, color-mix(in srgb, var(--color-brand-500) 22%, transparent) 0%, transparent 70%)' }}
      />
      <div className="relative mx-auto w-full max-w-[960px] px-4 text-center sm:px-6">
        <Revelar>
          <h2 className="font-display font-extrabold tracking-[-0.03em] leading-[1.05] text-surface-50 text-[clamp(1.3rem,2.98vw,2.24rem)] text-balance">
            {fecho.title}
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[12.5px] leading-relaxed text-surface-400 text-balance">{fecho.lead}</p>
        </Revelar>
        <Revelar atraso={0.15} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <BotaoContato />
          <LinkButton to={LANDING_ROUTES.login} variant="neutral" size="lg">{fecho.entrar}</LinkButton>
        </Revelar>
        {import.meta.env.DEV && !contato.whatsapp && (
          <p className="mt-6 text-[12px] text-surface-500">Número de WhatsApp comercial a configurar em <code>landingCopy.ts</code> (<code>contato.whatsapp</code>).</p>
        )}
      </div>
    </section>
  )
}
