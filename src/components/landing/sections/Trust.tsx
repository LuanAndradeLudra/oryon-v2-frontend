import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { home, rotaPlataforma, trust } from '../landingCopy'
import { DemoRecorte } from '../plataforma/DemoRecorte'
import { Capitulo } from '../plataforma/SecoesVenda'
import { HERO_ROTAS, type HeroCena, type HeroState } from '../stage/hero/heroStory'
import type { HeroCue } from '../stage/hero/useHeroTimeline'
import { useMediaQuery } from '@/hooks/useMediaQuery'

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

/**
 * Uma COLUNA da tabela "pode / só uma pessoa" (P7 da auditoria anti-genérico,
 * 30/09): no lugar de quatro cartões com ícone, duas listas lado a lado, com
 * o ponto colorido do produto — teal = ação da IA, âmbar = ação de uma pessoa.
 */
function Coluna({ quem, i }: { quem: 'ia' | 'pessoa'; i: number }) {
  const semMovimento = useReducedMotion()
  const col = trust.pode[quem]
  const ia = quem === 'ia'
  return (
    <motion.div
      className={cn('p-5 sm:p-6', i > 0 && 'border-t border-[var(--landing-borda)] sm:border-l sm:border-t-0')}
      initial={semMovimento ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
    >
      <h3 className={cn('flex items-center gap-2.5 font-mono text-[11.5px] uppercase tracking-[.14em]', ia ? 'text-[var(--landing-destaque)]' : 'text-[#F5B544]')}>
        <span aria-hidden className={cn('h-[7px] w-[7px] rounded-full', ia ? 'bg-[var(--landing-destaque)]' : 'bg-[#F5B544]')} />
        {col.titulo}
      </h3>
      <ul className="mt-3">
        {col.itens.map((it) => (
          <li key={it.texto} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
            <span className={cn('text-[15px] leading-snug', ia ? 'text-surface-100' : 'font-medium text-surface-50')}>{it.texto}</span>
            <span className="font-mono text-[11px] tracking-[.02em] text-surface-500">{it.nota}</span>
          </li>
        ))}
      </ul>
    </motion.div>
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
export function Trust({ compacto = false, numero }: { compacto?: boolean; numero?: string }) {
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
          initial={semMovimento ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <Capitulo rotulo={trust.eyebrow} className="mb-6" />
          <h2 className="font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.7rem,3vw,2.5rem)] text-balance text-surface-50">{trust.title}</h2>
          <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px] text-pretty">{trust.lead}</p>
        </motion.div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,550px)_minmax(340px,1fr)] lg:gap-4">
          {desktop && (
            <div className="min-w-0 self-start lg:max-w-[550px]">
              <div className="w-full">
                <DemoRecorte titulo={trust.tela} rota={HERO_ROTAS['agente-capacidades']} estado="inicio" cues={CUES} recorte={RECORTE} foraDoRecorte={330} />
              </div>
            </div>
          )}
          <div className={cn('min-w-0 self-start', compacto && 'lg:col-span-2')}>
            <div className="grid overflow-hidden rounded-xl border border-[var(--landing-borda)] sm:grid-cols-2">
              <Coluna quem="ia" i={0} />
              <Coluna quem="pessoa" i={1} />
            </div>
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] tracking-[.02em] text-surface-500">
              <span className="inline-flex items-center gap-2"><span aria-hidden className="h-[7px] w-[7px] rounded-full bg-[var(--landing-destaque)]" />{trust.pode.legendaIa}</span>
              <span className="inline-flex items-center gap-2"><span aria-hidden className="h-[7px] w-[7px] rounded-full bg-[#F5B544]" />{trust.pode.legendaPessoa}</span>
              <span>{trust.pode.legendaNota}</span>
            </p>
          </div>
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
