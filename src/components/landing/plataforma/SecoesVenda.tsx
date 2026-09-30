import { useId, useState, type ReactNode } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronDown, MessageCircle, Smartphone, Settings2, Rocket, Check, PencilLine, Layers, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { BotaoLanding } from '../ui/BotaoLanding'
import { contato, contatoDisponivel, linkContato, implantacao, perguntas, fecho, home, LANDING_ROUTES } from '../landingCopy'

/**
 * As seções de CONVERSÃO depois da Plataforma (25/09). Cada uma derruba uma
 * objeção de quem já entendeu o produto e está decidindo:
 *
 *  • Implantação — "vai dar trabalho?" → até 7 dias, quase tudo com a gente;
 *  • Perguntas   — preço, prazo, número oficial, limites da IA;
 *  • Fecho       — a conversa no WhatsApp com o próprio Agente IA da Oryon.
 */

export function Revelar({ children, atraso = 0, className }: { children: ReactNode; atraso?: number; className?: string }) {
  const semMovimento = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={semMovimento ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.55, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** O botão da conversa comercial — só existe com o número configurado. */
function BotaoContato({ className, longo = true }: { className?: string; longo?: boolean }) {
  if (!contatoDisponivel) return null
  return (
    <BotaoLanding
      href={linkContato()}
      target="_blank"
      rel="noopener noreferrer"
      tamanho="lg"
      className={className}
      icone={<MessageCircle className="h-4 w-4" strokeWidth={2.2} />}
    >
      {longo ? contato.ctaLongo : contato.cta}
    </BotaoLanding>
  )
}

export function Cabecalho({ eyebrow, titulo, cinza }: { eyebrow: string; titulo: string; cinza: string }) {
  return (
    <Revelar className="max-w-[64rem]">
      <p className="inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold landing-selo">{eyebrow}</p>
      <h2 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.16rem,2.17vw,1.73rem)] text-balance">
        <span className="text-surface-50">{titulo}</span>{' '}
        <span className="text-surface-500">{cinza}</span>
      </h2>
    </Revelar>
  )
}

// ─── Implantação ─────────────────────────────────────────────────────────────

const ICONES_PASSO = [Smartphone, Settings2, Rocket]
const ICONES_DEPOIS = { ajuste: PencilLine, crescer: Layers, acompanhar: LayoutDashboard } as const

/** `compacta` (home de venda): só os três passos — o "depois da implantação" fica na página. */
export function SecaoImplantacao({ compacta = false }: { compacta?: boolean }) {
  const semMovimento = useReducedMotion()
  return (
    <section id="implantacao" data-section="implantacao" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20 lg:py-14">
      <div className="landing-container">
        <Cabecalho eyebrow={implantacao.eyebrow} titulo={implantacao.title} cinza={implantacao.titleCinza} />

        <div className="relative mt-10 sm:mt-12">
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
                    <p className="mt-4 text-[12px] font-semibold uppercase tracking-[.12em] text-[var(--landing-destaque)]">{p.quem}</p>
                    <p className="mt-1.5 font-display text-[17px] font-semibold tracking-[-0.01em] text-surface-50">{p.titulo}</p>
                    <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-surface-400">{p.texto}</p>
                    {/* O que sai deste passo — concreto, verificável (só na página completa). */}
                    {!compacta && <ul className="mt-4 space-y-2 border-t border-[var(--landing-borda)] pt-4">
                      {p.entregas.map((e) => (
                        <li key={e} className="flex items-start gap-2 text-[14px] leading-relaxed text-surface-300">
                          <Check className="mt-[1px] h-3.5 w-3.5 flex-shrink-0 text-[var(--landing-destaque)]" strokeWidth={2.2} aria-hidden />
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>}
                  </li>
                </Revelar>
              )
            })}
          </ol>
        </div>

        {/* Depois do ar: o ajuste passa a ser do cliente, na própria Oryon. */}
        {!compacta && (<>
        <Revelar atraso={0.2} className="mt-10">
          <p className="font-display text-[17px] font-semibold tracking-[-0.01em] text-surface-50">{implantacao.depois.titulo}</p>
        </Revelar>
        <div className="mt-5 grid gap-px overflow-hidden rounded-2xl bg-[var(--landing-borda)] ring-1 ring-[var(--landing-borda)] md:grid-cols-3">
          {implantacao.depois.itens.map((d, i) => {
            const Icone = ICONES_DEPOIS[d.key]
            return (
              <Revelar key={d.key} atraso={0.25 + i * 0.12} className="bg-[var(--landing-cartao)] p-6">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-xl bg-surface-900 text-[var(--landing-destaque)] ring-1 ring-surface-700">
                  <Icone className="h-[13px] w-[13px]" strokeWidth={1.8} aria-hidden />
                </span>
                <p className="mt-3.5 font-display text-[16px] font-semibold tracking-[-0.01em] text-surface-50">{d.titulo}</p>
                <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-surface-400">{d.texto}</p>
              </Revelar>
            )
          })}
        </div>
        </>)}

        {contatoDisponivel && (
          <Revelar atraso={0.4} className="mt-10">
            <BotaoContato />
          </Revelar>
        )}
      </div>
    </section>
  )
}

// ─── Perguntas frequentes ────────────────────────────────────────────────────

function Pergunta({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  const respostaId = useId()
  const [aberta, setAberta] = useState(false)
  const semMovimento = useReducedMotion()
  return (
    <div className="border-b border-[var(--landing-borda)]">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        aria-controls={aberta ? respostaId : undefined}
        className="flex w-full items-center justify-between gap-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)] rounded-md"
      >
        <span className="text-[15px] font-semibold text-surface-50">{pergunta}</span>
        <ChevronDown className={cn('h-5 w-5 flex-shrink-0 text-surface-500 transition-transform duration-300', aberta && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            id={respostaId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: semMovimento ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-[62ch] pb-5 text-[14px] leading-relaxed text-surface-400">{resposta}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * `limite` (home de venda): só as primeiras perguntas, sem grupos, com o link
 * para a página completa. `comoPagina`: o título vira o H1 da página.
 */
export function SecaoPerguntas({ limite, comoPagina = false }: { limite?: number; comoPagina?: boolean }) {
  const todas: ReadonlyArray<{ pergunta: string; resposta: string }> = perguntas.grupos.flatMap((g): ReadonlyArray<{ pergunta: string; resposta: string }> => g.itens)
  return (
    <section id="perguntas" data-section="perguntas" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20 lg:py-14">
      <div className="landing-container grid gap-10 lg:grid-cols-[.85fr_1.4fr] lg:gap-16">
        {/* O título acompanha a leitura no desktop. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {comoPagina ? (
            <Revelar>
              <p className="inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold landing-selo">{perguntas.eyebrow}</p>
              <h1 className="mt-4 font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.75rem,3vw,2.5rem)] text-balance">
                <span className="text-surface-50">{perguntas.title}</span>{' '}
                <span className="text-surface-500">{perguntas.titleCinza}</span>
              </h1>
            </Revelar>
          ) : (
            <Cabecalho eyebrow={perguntas.eyebrow} titulo={perguntas.title} cinza={perguntas.titleCinza} />
          )}
          <Revelar atraso={0.2} className="mt-8 flex flex-wrap gap-3">
            <BotaoContato longo={false} />
            <BotaoLanding to={LANDING_ROUTES.demonstracao} variante="secundario" seta>{home.ctaPrincipal}</BotaoLanding>
          </Revelar>
        </div>
        {limite ? (
          <Revelar atraso={0.1}>
            <div className="border-t border-[var(--landing-borda)]">
              {todas.slice(0, limite).map((q) => <Pergunta key={q.pergunta} pergunta={q.pergunta} resposta={q.resposta} />)}
            </div>
            <Link to={LANDING_ROUTES.perguntas} className="mt-5 inline-flex items-center gap-1.5 rounded-sm text-[14px] font-medium text-[var(--landing-destaque)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              {home.perguntas.verTodas} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Revelar>
        ) : (
        <div className="space-y-6">
          {perguntas.grupos.map((g, gi) => (
            <Revelar key={g.titulo} atraso={0.1 + gi * 0.08}>
              <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--landing-destaque)]">{g.titulo}</p>
              <div className="mt-2 border-t border-[var(--landing-borda)]">
                {g.itens.map((q) => (
                  <Pergunta key={q.pergunta} pergunta={q.pergunta} resposta={q.resposta} />
                ))}
              </div>
            </Revelar>
          ))}
        </div>
        )}
      </div>
    </section>
  )
}

// ─── Fecho ───────────────────────────────────────────────────────────────────

export function SecaoFecho() {
  return (
    <section id="contato" data-section="cta" className="relative overflow-hidden border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(60% 70% at 50% 100%, color-mix(in srgb, var(--color-brand-500) 22%, transparent) 0%, transparent 70%)' }}
      />
      <div className="relative mx-auto w-full max-w-[960px] px-4 text-center sm:px-6">
        <Revelar>
          <h2 className="font-display font-extrabold tracking-[-0.03em] leading-[1.05] text-surface-50 text-[clamp(1.3rem,2.98vw,2.24rem)] text-balance">
            {contatoDisponivel ? fecho.title : fecho.titleSemContato}
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-surface-400 text-balance">{contatoDisponivel ? fecho.lead : fecho.leadSemContato}</p>
        </Revelar>
        <Revelar atraso={0.15} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <BotaoContato />
          <BotaoLanding to={LANDING_ROUTES.login} variante={contatoDisponivel ? 'secundario' : 'primario'} tamanho="lg">{fecho.entrar}</BotaoLanding>
        </Revelar>
      </div>
    </section>
  )
}
