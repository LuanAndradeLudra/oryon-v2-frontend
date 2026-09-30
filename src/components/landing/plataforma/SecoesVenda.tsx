import { useId, useState, type ReactNode } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { ArrowRight, MessageCircle, Check, PencilLine, Layers, LayoutDashboard } from 'lucide-react'
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

/** O CAPÍTULO (30/09, auditoria anti-genérico): número em mono + rótulo + régua.
 *  Na home cada seção tem número (a página é um roteiro); nas páginas internas
 *  só rótulo e régua. */
export function Capitulo({ numero, rotulo, className }: { numero?: string; rotulo: string; className?: string }) {
  // numero: sem uso na home desde o lote 2 (a skill proíbe numerar seções);
  // fica para as páginas que ainda precisarem de sequência real.
  return (
    <p className={cn('landing-capitulo', className)}>
      {numero && <span data-numero>{numero}</span>}
      <span>{rotulo}</span>
    </p>
  )
}

/**
 * O cabeçalho de seção (lote 2, 30/09, decidido com o PO): o rótulo com régua
 * aparece só em três seções da home (dor, limites da IA e demonstração) — a
 * skill design-taste limita a 1 a cada 3 seções e proíbe numerar; o título é
 * curto; o que era a continuação cinza do título vira o parágrafo de apoio.
 */
export function Cabecalho({ rotulo, titulo, apoio }: { rotulo?: string; titulo: string; apoio?: string }) {
  return (
    <Revelar>
      {rotulo && <Capitulo rotulo={rotulo} className="mb-6" />}
      <h2 className="max-w-[40rem] font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.7rem,3vw,2.5rem)] text-balance text-surface-50">{titulo}</h2>
      {apoio && <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px] text-pretty">{apoio}</p>}
    </Revelar>
  )
}

// ─── Implantação ─────────────────────────────────────────────────────────────

/** Os carimbos de dia do registro — estrutura, não copy (a copy não tem número).
 *  Um por passo; "até 7 dias" é o prazo autorizado pelo PO. */
const DIAS_PASSO = ['Dia 1', 'Dias 2 a 5', 'Dia 6', 'Dia 7'] as const
const ICONES_DEPOIS = { ajuste: PencilLine, crescer: Layers, acompanhar: LayoutDashboard } as const

/**
 * A implantação como REGISTRO de dias (P8 da auditoria anti-genérico, 30/09):
 * saiu a linha do tempo com três ícones (Smartphone, Settings2, Rocket); entra
 * o formato do histórico do próprio app — carimbo do dia, ponto colorido por
 * quem fez (âmbar = você, teal = equipe Oryon), título e uma linha. Título e
 * lead à esquerda, o registro à direita.
 *
 * `compacta` (home de venda): sem as entregas de cada passo e sem o "depois da
 * implantação" — ficam na página completa.
 */
export function SecaoImplantacao({ compacta = false, numero }: { compacta?: boolean; numero?: string }) {
  return (
    <section id="implantacao" data-section="implantacao" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-[var(--landing-palco)] py-16 sm:py-20">
      <div className="landing-container">
        {/* Lote 3 (30/09): o título em cima e os dias numa linha do tempo
            HORIZONTAL (Dia 1 → Dia 7) a partir de 768 px; no celular, a mesma
            lista na vertical. O ponto na linha diz quem faz o passo. */}
        <Cabecalho titulo={implantacao.title} apoio={implantacao.titleCinza} />

        <Revelar atraso={0.1}><ol className="relative mt-12 grid border-t border-[var(--landing-borda)] md:grid-cols-4 md:gap-8 md:border-t-0">
          {/* A linha do tempo (desktop): uma régua atrás dos pontos. */}
          <span aria-hidden className="absolute inset-x-0 top-[31px] hidden h-px bg-surface-700 md:block" />
            {implantacao.passos.map((p, i) => {
              const voce = p.quem === 'voce'
              return (
                <li key={p.titulo} className="relative grid grid-cols-[72px_14px_minmax(0,1fr)] gap-x-3 border-b border-[var(--landing-borda)] py-5 md:block md:border-b-0 md:py-0">
                    <span className="pt-[3px] font-mono text-[11.5px] tracking-[.02em] text-surface-500 md:block md:pt-0">{DIAS_PASSO[i]}</span>
                    <span aria-hidden className={cn('mt-[8px] h-[7px] w-[7px] rounded-full md:relative md:mt-[9px] md:block md:h-[9px] md:w-[9px] md:ring-4 md:ring-[var(--landing-palco)]', voce ? 'bg-[#F5B544]' : 'bg-[var(--landing-destaque)]')} />
                    <div className="min-w-0 md:mt-5">
                      <p className="text-[16px] font-semibold leading-snug text-surface-50">{p.titulo}</p>
                      <p className="mt-1 text-[14.5px] leading-relaxed text-surface-400 text-pretty">{p.texto}</p>
                      <p className={cn('mt-2 font-mono text-[11px] tracking-[.04em]', voce ? 'text-[#F5B544]' : 'text-[var(--landing-destaque)]')}>{p.rotulo}</p>
                      {/* O que sai deste passo — concreto, verificável (só na página completa). */}
                      {!compacta && (
                        <ul className="mt-3 space-y-1.5">
                          {p.entregas.map((e) => (
                            <li key={e} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-surface-300">
                              <Check className="mt-[3px] h-3.5 w-3.5 flex-shrink-0 text-[var(--landing-destaque)]" strokeWidth={2.2} aria-hidden />
                              <span>{e}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
              )
            })}
          </ol></Revelar>

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

/** Uma pergunta do FAQ (P9 da auditoria anti-genérico, 30/09): número em
 *  mono à esquerda, "+" que vira "−" no lugar do chevron, sobre réguas. */
function Pergunta({ pergunta, resposta, n }: { pergunta: string; resposta: string; n: number }) {
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
        className="group grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)] rounded-md"
      >
        <span className={cn('font-mono text-[11.5px] tracking-[.04em]', aberta ? 'text-[var(--landing-destaque)]' : 'text-surface-500')}>{String(n).padStart(2, '0')}</span>
        <span className="text-[15.5px] font-semibold text-surface-50 transition-colors group-hover:text-[var(--landing-destaque)]">{pergunta}</span>
        <span aria-hidden className="font-mono text-[16px] leading-none text-surface-500 transition-colors group-hover:text-surface-200">{aberta ? '−' : '+'}</span>
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
            <p className="max-w-[62ch] pb-5 pl-[46px] text-[14.5px] leading-relaxed text-surface-400">{resposta}</p>
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
export function SecaoPerguntas({ limite, comoPagina = false, numero }: { limite?: number; comoPagina?: boolean; numero?: string }) {
  const todas: ReadonlyArray<{ pergunta: string; resposta: string }> = perguntas.grupos.flatMap((g): ReadonlyArray<{ pergunta: string; resposta: string }> => g.itens)
  // Na home, as objeções escolhidas em perguntas.naHome, na ordem delas.
  const naHome = perguntas.naHome.map((p) => todas.find((q) => q.pergunta === p)).filter((q): q is (typeof todas)[number] => !!q)
  return (
    <section id="perguntas" data-section="perguntas" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20 lg:py-14">
      {/* Lote 3 (30/09): coluna única de leitura — título em cima, perguntas
          embaixo, e o próximo passo no fim. Antes eram três seções seguidas no
          mesmo formato "título à esquerda, conteúdo à direita". */}
      <div className="landing-container">
        <div className="max-w-[46rem]">
          {comoPagina ? (
            <Revelar>
              <Capitulo rotulo={perguntas.eyebrow} />
              <h1 className="mt-6 font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.75rem,3vw,2.5rem)] text-balance text-surface-50">{perguntas.title}</h1>
            </Revelar>
          ) : (
            <Cabecalho titulo={perguntas.title} />
          )}
        {limite ? (
          <Revelar atraso={0.1} className="mt-10">
            <div className="border-t border-[var(--landing-borda)]">
              {naHome.slice(0, limite).map((q, i) => <Pergunta key={q.pergunta} n={i + 1} pergunta={q.pergunta} resposta={q.resposta} />)}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <BotaoContato longo={false} />
              <BotaoLanding to={LANDING_ROUTES.demonstracao} variante="secundario" seta>{home.ctaPrincipal}</BotaoLanding>
              <Link to={LANDING_ROUTES.perguntas} className="inline-flex items-center gap-1.5 rounded-sm text-[14px] font-medium text-[var(--landing-destaque)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                {home.perguntas.verTodas} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </Revelar>
        ) : (
        <div className="mt-10 space-y-6">
          {perguntas.grupos.map((g, gi) => (
            <Revelar key={g.titulo} atraso={0.1 + gi * 0.08}>
              <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--landing-destaque)]">{g.titulo}</p>
              <div className="mt-2 border-t border-[var(--landing-borda)]">
                {g.itens.map((q) => (
                  <Pergunta key={q.pergunta} n={todas.findIndex((t) => t.pergunta === q.pergunta) + 1} pergunta={q.pergunta} resposta={q.resposta} />
                ))}
              </div>
            </Revelar>
          ))}
          <Revelar className="flex flex-wrap gap-3 pt-2">
            <BotaoContato longo={false} />
            <BotaoLanding to={LANDING_ROUTES.demonstracao} variante="secundario" seta>{home.ctaPrincipal}</BotaoLanding>
          </Revelar>
        </div>
        )}
        </div>
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
