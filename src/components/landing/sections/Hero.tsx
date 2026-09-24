import { HeroPalco } from '@/components/landing/stage/hero/HeroPalco'
import { LinkButton } from '@/components/ui/LinkButton'
import { cn } from '@/lib/utils'
import { hero, LANDING_ROUTES, LANDING_ANCHORS } from '../landingCopy'

/**
 * Headline + o produto operando logo abaixo (referência: hero da Attio, HTML
 * dissecado em 24/09). Duas correções de uma 1ª leitura que só copiou a
 * FÓRMULA deles sem copiar a CONDIÇÃO por trás:
 *
 * 1. O H1 deles tem 4 palavras — por isso `svh` sozinho funciona: em celular
 *    (viewport alta E estreita) `16px + 5.333svh` cresce com a ALTURA e nada
 *    segura a LARGURA, e um H1 de 10 palavras estourava (61px em 7 linhas,
 *    medido em 390×844). Corrigido dos dois lados: H1 encurtado pra 4
 *    palavras (a 2ª frase migrou pro lead) e a fórmula ganhou um piso de
 *    largura — `min(8.2vw, 16px + 5.333svh)` — a MENOR das duas manda: altura
 *    no desktop baixo/largo, largura no celular alto/estreito.
 * 2. O palco precisa começar dentro da dobra (medido: 60%+ visível em
 *    1240×751) — por isso os espaços entre H1/lead/CTAs/palco são enxutos,
 *    não decorativos.
 *
 * Entrada por desfoque→nítido (`.reveal`, token do orquestrador), NÃO
 * deslizamento nem framer-motion: escalonada por `--d` em H1 → parágrafo →
 * CTAs → palco, 90ms entre cada.
 *
 * O palco (24/09, noite): `HeroPalco` — o Oryon REAL rodando em modo
 * demonstração (`/demo.html`, backend em memória) na janela âncora, com
 * satélites que são componentes reais do produto. Regra do PO: todas as telas
 * e simulações usam o conteúdo real do software — nada desenhado à mão.
 */
export function Hero() {
  return (
    <section
      id="inicio"
      data-section="hero"
      className={cn(
        // `overflow-x-clip`: a atmosfera do palco sangra para fora da coluna de
        // propósito, mas nunca pode criar rolagem horizontal na página.
        'relative overflow-x-clip scroll-mt-16 pt-10 sm:pt-12 pb-10 sm:pb-12',
        // relevo sutil só de token: do degrau 900 ao piso 950
        'bg-[linear-gradient(to_bottom,var(--color-surface-900),var(--color-surface-950)_480px)]',
      )}
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
        <h1
          className="reveal font-display font-extrabold text-surface-50 text-[clamp(30px,min(8.2vw,16px+5.333svh),72px)] leading-[0.95] tracking-[clamp(-2.2px,2.08px-0.3733svh,-1.1px)]"
          style={{ ['--d' as string]: '0ms' }}
        >
          {hero.title}
        </h1>
        <p
          className="reveal mt-4 max-w-[58ch] text-base sm:text-lg leading-relaxed text-surface-400"
          style={{ ['--d' as string]: '90ms' }}
        >
          {hero.lead}
        </p>
        <div
          className="reveal mt-6 flex flex-wrap items-center gap-3"
          style={{ ['--d' as string]: '180ms' }}
        >
          <LinkButton to={LANDING_ROUTES.login} size="lg">{hero.primaryCta}</LinkButton>
          <LinkButton href={`#${LANDING_ANCHORS.produto}`} variant="neutral" size="lg">{hero.secondaryCta}</LinkButton>
        </div>
      </div>

      <div
        role="region"
        aria-label={hero.stageLabel}
        /* O palco é mais largo que a coluna de texto a partir de `xl`: a tela
           de Conversas tem três regiões (lista 360 · conversa · painel 308) e,
           travado em 1120, sobrava pouco para a conversa justamente quando o
           painel abre. O texto continua em 1120 — linha de leitura não deve
           acompanhar o palco. */
        className="reveal mx-auto mt-8 sm:mt-10 w-full max-w-[1120px] xl:max-w-[1400px] px-4 sm:px-6"
        style={{ ['--d' as string]: '270ms' }}
      >
        <HeroPalco />
      </div>
    </section>
  )
}
